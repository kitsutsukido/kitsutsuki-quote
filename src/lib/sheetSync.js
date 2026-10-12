// シリーズ(ジャンル)ごとのGoogleスプレッドシート(Apps Script ウェブアプリ)との同期。
// 手動で「送信」「取得」を押したときだけ動く。送信はスプレッドシートの該当シートを丸ごと上書きし、
// 取得はこの端末の該当シリーズのデータを丸ごと置き換える。

// このシリーズの商品に属するデータだけを取り出す
export function dataForGenre(genre, { products, projects, sessions, groups, lineItems, settings, patterns }) {
  const productIds = new Set(products.filter((p) => p.genre === genre).map((p) => p.id));
  const gProjects = projects.filter((p) => productIds.has(p.productId));
  const projectIds = new Set(gProjects.map((p) => p.id));
  const gSessions = sessions.filter((s) => projectIds.has(s.projectId));
  const sessionIds = new Set(gSessions.map((s) => s.id));
  return {
    projects: gProjects,
    sessions: gSessions,
    lineItems: lineItems.filter((it) => sessionIds.has(it.sessionId)),
    groups: groups.filter((g) => productIds.has(g.productId)),
    profitSettings: Object.fromEntries(Object.entries(settings).filter(([id]) => projectIds.has(id))),
    profitPatterns: patterns.filter((p) => projectIds.has(p.projectId)),
  };
}

const num = (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? v : Number(v));

// スプレッドシートから戻ってきたデータの型をそろえる(数値が文字列になっていることがあるため)
export function normalizePulled(data) {
  return {
    projects: (data.projects || []).map((p) => ({ ...p, qty: Number(p.qty) || 0 })),
    sessions: (data.sessions || []).map((s) => ({ ...s, date: s.date == null ? "" : String(s.date) })),
    lineItems: (data.lineItems || []).map((it) => ({
      ...it,
      qty: Number(it.qty) || 0,
      amount: Number(it.amount) || 0,
      processes: Array.isArray(it.processes) ? it.processes : [],
      packSize: num(it.packSize),
      packCount: num(it.packCount),
      packPrice: num(it.packPrice),
    })),
    groups: (data.groups || []).map((g) => ({ ...g, parentId: g.parentId === "" ? null : g.parentId })),
    profitSettings: data.profitSettings || {},
    profitPatterns: data.profitPatterns || [],
  };
}

const withSecret = (url, secret) => `${url}${url.includes("?") ? "&" : "?"}secret=${encodeURIComponent(secret || "")}`;

export async function pullFromSheet(url, secret) {
  const res = await fetch(withSecret(url, secret));
  const json = await res.json();
  if (json.status !== "ok") throw new Error(json.message === "unauthorized" ? "合言葉が合っていません" : "取得に失敗しました");
  return normalizePulled(json.data || {});
}

// 送信後に取得し直して、件数が一致したら成功とみなす(POSTの応答はブラウザから読めないため)
export async function pushToSheet(url, secret, data) {
  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ type: "full-sync", secret: secret || "", data }),
  });
  const back = await pullFromSheet(url, secret);
  const same =
    back.projects.length === data.projects.length &&
    back.sessions.length === data.sessions.length &&
    back.lineItems.length === data.lineItems.length &&
    back.groups.length === data.groups.length;
  if (!same) throw new Error("送信後の確認で件数が合いませんでした(合言葉が違うか、送信に失敗した可能性があります)");
  return back;
}
