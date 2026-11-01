import { useState } from "react";
import { Download } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";
import { getInventoryMembers } from "../../lib/remote.js";

// ---------- メンバーマスタ(入稿・購入の担当者とSlackリマインダーの宛先) ----------
// 在庫管理アプリのメンバー(名前・SlackユーザーIDだけ)を取り込む。住所・電話などは読まない。
export function MemberSettings({ members, setMembers }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const importMembers = async () => {
    setBusy(true);
    setMessage("");
    try {
      const { members: src, found } = await getInventoryMembers();
      if (!found) {
        setMessage("在庫管理アプリのメンバーを読めませんでした。");
        return;
      }
      let added = 0;
      let updated = 0;
      setMembers((prev) => {
        const next = [...prev];
        for (const s of src) {
          const i = next.findIndex((m) => m.name === s.name);
          if (i < 0) {
            next.push({ id: `mem-${Date.now()}-${next.length}`, name: s.name, slackUserId: s.slackUserId });
            added += 1;
          } else if (s.slackUserId && next[i].slackUserId !== s.slackUserId) {
            next[i] = { ...next[i], slackUserId: s.slackUserId };
            updated += 1;
          }
        }
        return next;
      });
      setMessage(`取り込みました(${src.length}人を確認)。新しく追加・更新された人は一覧を見てください。`);
    } catch (e) {
      setMessage(e.message === "unauthorized" ? "ログインの有効期限が切れました。再読み込みしてください。" : e.message);
    } finally {
      setBusy(false);
    }
  };
  const patch = (id, fields) => setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...fields } : m)));
  const remove = (m) => {
    if (window.confirm(`「${m.name}」をメンバーから外します。よろしいですか？\n(担当に選んでいた明細は「担当未設定」になります)`)) setMembers((prev) => prev.filter((x) => x.id !== m.id));
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--ink)]">メンバー</p>
      <p className="text-xs text-[var(--text-muted)]">
        入稿・購入の担当者として選べます。SlackユーザーID(例: U0123ABCD)を入れておくと、入稿期限の当日にSlackでその人にメンションが飛びます。
      </p>
      <button onClick={importMembers} disabled={busy} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1 disabled:opacity-50">
        <Download size={14} /> 在庫管理アプリから取り込む
      </button>
      {message && <p className="text-xs text-[var(--text)]">{message}</p>}
      {members.length === 0 ? (
        <span className="text-xs text-[var(--text-muted)]">まだ登録がありません。</span>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)] text-left text-xs">
                <th className="py-1.5 px-2 font-normal">名前</th>
                <th className="py-1.5 px-2 font-normal">SlackユーザーID</th>
                <th className="py-1.5 px-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1.5 px-2 whitespace-nowrap">{m.name}</td>
                  <td className="py-1.5 px-2">
                    <input className={`${inputCls} min-w-[9rem]`} value={m.slackUserId || ""} placeholder="U0123ABCD" onChange={(e) => patch(m.id, { slackUserId: e.target.value.trim() })} />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <button onClick={() => remove(m)} className="text-xs text-[var(--danger)] border border-[var(--border)] rounded-md px-2 py-1">外す</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
