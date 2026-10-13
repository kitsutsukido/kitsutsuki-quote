import {
  getSessionCookie,
  verifySessionToken,
  createSessionToken,
  buildSessionCookie,
  verifyGoogleIdToken,
  parseAllowedEmails,
} from "./session.js";

// 見積台帳のCloudflare Worker。/api/* だけをこのWorkerが処理し、
// それ以外は静的ファイル(dist)がそのまま返る(wrangler.jsonc の run_worker_first)。
//
//   GET    /api/config        -> { googleClientId }(認証不要。ログインボタン用の公開情報)
//   POST   /api/session       -> GoogleのIDトークンを検証し、セッションCookieを発行
//   DELETE /api/session       -> セッションCookieを失効(ログアウト)
//   GET    /api/me            -> ログイン中なら { email, name }、そうでなければ401
//   GET    /api/kv/:key       -> KVの値(要ログイン)
//   PUT    /api/kv/:key       -> KVへ保存(要ログイン)
//
// KVは在庫管理アプリと同じnamespaceを共有するため、このWorkerが触れるキーは
// 必ず "zk-quote:" で始まるものに限る(在庫アプリのデータには触れない)。

const KEY_PREFIX = "zk-quote:";
const MAX_BODY_BYTES = 256 * 1024;

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

async function authenticate(request, env) {
  if (!env.SESSION_SIGNING_SECRET) return { ok: false, reason: "signing-secret-missing" };
  if (!request.headers.get("X-Zk-Quote-Csrf")) return { ok: false, reason: "csrf-missing" };
  const token = getSessionCookie(request);
  return verifySessionToken(token, env.SESSION_SIGNING_SECRET, parseAllowedEmails(env.ALLOWED_EMAILS));
}

async function handleSession(request, env) {
  if (request.method === "DELETE") {
    return new Response(null, { status: 204, headers: { "set-cookie": buildSessionCookie("", { clear: true }) } });
  }
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!env.SESSION_SIGNING_SECRET) {
    console.error("[session] SESSION_SIGNING_SECRET is not configured");
    return new Response("SESSION_SIGNING_SECRET is not configured", { status: 500 });
  }
  if (!env.GOOGLE_CLIENT_ID) {
    console.error("[session] GOOGLE_CLIENT_ID is not configured");
    return new Response("Google Client ID is not configured", { status: 500 });
  }
  if (!request.headers.get("X-Zk-Quote-Csrf")) return new Response("Bad Request", { status: 400 });
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("Bad Request", { status: 400 });
  }
  const idToken = body && body.idToken;
  if (!idToken || typeof idToken !== "string") return new Response("Bad Request", { status: 400 });

  let payload;
  try {
    payload = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
  } catch (e) {
    console.warn("[session] Google ID token verification failed:", e && e.message ? e.message : e);
    return new Response("Unauthorized", { status: 401 });
  }
  const email = payload.email.toLowerCase();
  const allowed = parseAllowedEmails(env.ALLOWED_EMAILS);
  // 許可メールが未設定のときは誰も通さない(在庫アプリより厳しめ。設定漏れで全員に開かないため)
  if (!allowed.length || !allowed.includes(email)) {
    console.warn(`[session] email not allowed: ${email}`);
    return new Response("Forbidden", { status: 403 });
  }
  const now = Math.floor(Date.now() / 1000);
  const sessionPayload = { email, name: payload.name || email, picture: payload.picture || "", iat: now, exp: now + 7 * 24 * 60 * 60 };
  const token = await createSessionToken(sessionPayload, env.SESSION_SIGNING_SECRET);
  return json({ email, name: sessionPayload.name }, 200, { "set-cookie": buildSessionCookie(token) });
}

async function handleKv(request, env, key) {
  if (!key.startsWith(KEY_PREFIX) || key.length > 128) return new Response("Forbidden", { status: 403 });
  if (!env.QUOTE_KV) return new Response("KV binding QUOTE_KV is not configured", { status: 500 });
  if (request.method === "GET") {
    const value = await env.QUOTE_KV.get(key);
    if (value === null) return new Response("Not found", { status: 404 });
    return new Response(value, { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }
  if (request.method === "PUT") {
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) return new Response("Payload Too Large", { status: 413 });
    await env.QUOTE_KV.put(key, body);
    return new Response(body, { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
  }
  return new Response("Method Not Allowed", { status: 405 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    try {
      if (pathname === "/api/config") {
        return json({ googleClientId: env.GOOGLE_CLIENT_ID || "" });
      }
      if (pathname === "/api/session") return await handleSession(request, env);

      if (pathname === "/api/me" || pathname.startsWith("/api/kv/")) {
        const auth = await authenticate(request, env);
        if (!auth.ok) {
          console.log(`[auth] ${request.method} ${pathname} -> 401 (${auth.reason})`);
          return new Response("Unauthorized", { status: 401 });
        }
        if (pathname === "/api/me") return json({ email: auth.email, name: auth.name });
        let key;
        try {
          key = decodeURIComponent(pathname.slice("/api/kv/".length));
        } catch (e) {
          return new Response("Bad Request", { status: 400 });
        }
        return await handleKv(request, env, key);
      }
      if (pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error("[worker] unexpected error:", e && e.stack ? e.stack : e);
      return new Response("Internal Server Error", { status: 500 });
    }
    return env.ASSETS.fetch(request);
  },
};
