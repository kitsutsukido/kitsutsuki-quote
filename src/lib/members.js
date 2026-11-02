// 在庫管理アプリから読んだメンバー(名前・SlackユーザーIDだけ)を、見積台帳のメンバーに合わせる。
// 名前が同じ人は、SlackユーザーIDだけ更新する。いない人は足す。消すことはしない。
// 変わるものが無ければ、同じ配列を返す(無駄な保存をしない)。
export function mergeImportedMembers(prev, src) {
  let next = prev;
  const copy = () => (next === prev ? (next = [...prev]) : next);
  for (const s of src) {
    const i = next.findIndex((m) => m.name === s.name);
    if (i < 0) {
      copy().push({ id: `mem-${Date.now()}-${next.length}`, name: s.name, slackUserId: s.slackUserId || "" });
    } else if (s.slackUserId && next[i].slackUserId !== s.slackUserId) {
      copy()[i] = { ...next[i], slackUserId: s.slackUserId };
    }
  }
  return next;
}

export const IMPORT_REASON = {
  "not-configured": "在庫管理アプリとつなぐ設定(合言葉)がまだ登録されていません。",
  "fetch-failed": "在庫管理アプリに接続できませんでした。",
};
export const importReasonText = (r) => IMPORT_REASON[r] || (r ? `在庫管理アプリから読めませんでした(${r})。` : "在庫管理アプリのメンバーを読めませんでした。");
