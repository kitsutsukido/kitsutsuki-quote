// セッション発行・検証の共通ロジック(在庫管理アプリのfunctions/_lib/session.jsを移植、Cookie名のみ変更)。
// base64url・HMAC・GoogleのIDトークン(RS256)検証を含む。

export const SESSION_COOKIE_NAME = "zk_quote_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7日

function base64UrlEncode(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlDecode(str) {
  const normalized = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function utf8Encode(str) {
  return new TextEncoder().encode(str);
}
function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

// "user1@example.com, user2@example.com" のようなPages環境変数ALLOWED_EMAILS
// の値を、小文字・trim済みの配列にする。空文字列・未設定は空配列(=誰でも通す
// わけではなく、呼び出し側でallowedEmails.length===0の扱いを別途判断させる)。
export function parseAllowedEmails(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseCookieHeader(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}
export function getSessionCookie(request) {
  const cookies = parseCookieHeader(request.headers.get("Cookie"));
  return cookies[SESSION_COOKIE_NAME] || null;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", utf8Encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

// アプリ独自のセッショントークンを発行する。JWTと似た「payload.signature」の
// 2パート構成だが、ヘッダー部分は常にHMAC-SHA256固定のため省略している。
export async function createSessionToken(payload, secret) {
  const key = await hmacKey(secret);
  const payloadB64 = base64UrlEncode(utf8Encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", key, utf8Encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

// セッショントークンの署名・有効期限・ALLOWED_EMAILS所属を検証する。
// 例外を投げず{ok, reason|email, ...}を返す形にしているのは、観測用の
// ミドルウェアが「なぜ無効だったか」をそのままログに出せるようにするため。
export async function verifySessionToken(token, secret, allowedEmails) {
  if (!token) return { ok: false, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadB64, sigB64] = parts;
  let payload;
  try {
    payload = JSON.parse(utf8Decode(base64UrlDecode(payloadB64)));
  } catch (e) {
    return { ok: false, reason: "malformed" };
  }
  const key = await hmacKey(secret);
  let validSig = false;
  try {
    validSig = await crypto.subtle.verify("HMAC", key, base64UrlDecode(sigB64), utf8Encode(payloadB64));
  } catch (e) {
    validSig = false;
  }
  if (!validSig) return { ok: false, reason: "bad-signature" };
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };
  const email = String(payload.email || "").toLowerCase();
  if (!email) return { ok: false, reason: "malformed" };
  if (allowedEmails.length && !allowedEmails.includes(email)) return { ok: false, reason: "not-allowed", email };
  return { ok: true, email, name: payload.name || email, picture: payload.picture || "" };
}

// clear:trueで、同名・同属性(Path=/api等)の失効用Cookie(Max-Age=0)を返す。
// ブラウザ側からはHttpOnlyのため直接消せず、必ずこの形でサーバーから
// 上書きしてもらう必要がある(functions/api/session.jsのDELETEが使う)。
export function buildSessionCookie(token, { clear = false } = {}) {
  const maxAge = clear ? 0 : SESSION_MAX_AGE_SECONDS;
  const value = clear ? "" : token;
  return `${SESSION_COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${maxAge}`;
}

// --- GoogleのIDトークン検証(functions/api/session.jsのPOSTから使用) ---

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// GoogleのJWKS(署名検証用の公開鍵一覧)はほぼ変わらないため、Cache API
// (Cloudflareのエッジキャッシュ、caches.default)で使い回す。Googleの
// レスポンス自体が適切なCache-Controlを返すため、その値に従ってキャッシュされる。
async function fetchGoogleJwks() {
  const cacheKey = new Request(GOOGLE_JWKS_URL);
  const cache = caches.default;
  let response = await cache.match(cacheKey);
  if (!response) {
    response = await fetch(GOOGLE_JWKS_URL);
    if (!response.ok) throw new Error("failed to fetch Google JWKS: " + response.status);
    await cache.put(cacheKey, response.clone());
  }
  return response.json();
}

// GoogleのIDトークン(JWT)を1回だけ検証する: 署名(RS256、GoogleのJWKS)・
// aud(このアプリのGoogleクライアントID)・iss・exp・email_verifiedを全て
// 確認できた場合のみpayloadを返す。どれか1つでも失敗したら例外を投げる
// (呼び出し側でtry/catchして401にする、という単純な使い方を想定)。
export async function verifyGoogleIdToken(idToken, expectedAudience) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("malformed id token");
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(utf8Decode(base64UrlDecode(headerB64)));
  const payload = JSON.parse(utf8Decode(base64UrlDecode(payloadB64)));
  if (header.alg !== "RS256") throw new Error("unexpected alg: " + header.alg);

  const jwks = await fetchGoogleJwks();
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("no matching Google signing key");

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signedData = utf8Encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(sigB64);
  const validSig = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signedData);
  if (!validSig) throw new Error("signature verification failed");

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error("token expired");
  if (!payload.iat || payload.iat > now + 60) throw new Error("token issued in the future");
  if (!GOOGLE_ISSUERS.includes(payload.iss)) throw new Error("unexpected issuer: " + payload.iss);
  if (payload.aud !== expectedAudience) throw new Error("unexpected audience");
  if (!payload.email || payload.email_verified !== true) throw new Error("email not verified");

  return payload;
}
