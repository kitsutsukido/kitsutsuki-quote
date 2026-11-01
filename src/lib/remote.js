// ログイン(Googleアカウント)と、端末をまたいで共有する設定(KV)の読み書き。
// サーバー(worker/index.js)が無い環境(npm run dev など)では available() が false になり、
// 画面は従来どおりこの端末のlocalStorageだけで動く。

const CSRF = { "X-Zk-Quote-Csrf": "1" };
export const SHEET_SETTINGS_KEY = "zk-quote:sheet-settings";

export async function getConfig() {
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return null; // devサーバー等でindex.htmlが返ってきた場合
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ログイン中ならユーザー、未ログインならnull、通信できなければundefined
export async function getMe() {
  try {
    const res = await fetch("/api/me", { headers: CSRF, cache: "no-store" });
    if (res.status === 401) return null;
    if (!res.ok) return undefined;
    return await res.json();
  } catch (e) {
    return undefined;
  }
}

export async function loginWithIdToken(idToken) {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...CSRF },
    body: JSON.stringify({ idToken }),
  });
  if (res.status === 403) throw new Error("このGoogleアカウントは許可されていません。");
  if (!res.ok) throw new Error(`ログインに失敗しました(${res.status})。`);
  return res.json();
}

export async function logout() {
  await fetch("/api/session", { method: "DELETE", headers: CSRF });
}

// 保存されていなければnull
export async function kvGet(key) {
  const res = await fetch(`/api/kv/${encodeURIComponent(key)}`, { headers: CSRF, cache: "no-store" });
  if (res.status === 404) return null;
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`読み込みに失敗しました(${res.status})`);
  return res.json();
}

// opts.baseUpdatedAt: 別の端末が先に保存していたら409(conflict)で断る
export async function kvPut(key, value, opts = {}) {
  const headers = { "Content-Type": "application/json", ...CSRF };
  if (opts.baseUpdatedAt) headers["X-Base-Updated-At"] = opts.baseUpdatedAt;
  const res = await fetch(`/api/kv/${encodeURIComponent(key)}`, { method: "PUT", headers, body: JSON.stringify(value) });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 409) throw new Error("conflict");
  if (!res.ok) throw new Error(`保存に失敗しました(${res.status})`);
}

// Googleのログインボタン用スクリプトを1回だけ読み込む
export function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector('script[data-zk-gsi="1"]');
    const onErr = () => reject(new Error("Googleログイン用のスクリプトを読み込めませんでした。"));
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", onErr);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.dataset.zkGsi = "1";
    s.onload = () => resolve();
    s.onerror = onErr;
    document.head.appendChild(s);
  });
}
