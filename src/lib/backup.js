// データの控え(JSONファイル)の書き出し。設定の「データの控え」と、収支設定マスタに合わせる前の自動の控えで使う。
export const BACKUP_APP_ID = "kitsutsuki-quote-backup";
export const BACKUP_KEYS = ["members", "products", "projects", "sessions", "lineItems", "groups", "profitSettings", "profitPatterns", "profitMaster"];

export function downloadBackup(current, suffix = "") {
  const data = {};
  for (const k of BACKUP_KEYS) if (current?.[k] !== undefined) data[k] = current[k];
  const payload = { app: BACKUP_APP_ID, version: 1, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kitsutsuki-quote-backup-${new Date().toISOString().slice(0, 10)}${suffix}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
