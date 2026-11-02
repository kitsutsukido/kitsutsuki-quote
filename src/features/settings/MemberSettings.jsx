import { useState } from "react";
import { useRef } from "react";
import { Upload } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";

// ---------- メンバーマスタ(入稿・購入の担当者とSlackリマインダーの宛先) ----------
// 在庫管理アプリのCSVからメンバー(名前・SlackユーザーIDだけ)を取り込む。住所・電話などは読まない。
export function MemberSettings({ members, setMembers }) {
  const [message, setMessage] = useState("");
  const fileRef = useRef(null);

  // 在庫管理アプリの「メンバー・外注先マスタ」のCSV(CSV出力)から、サークルメンバー(種別「社員」)の
  // 名前とSlackユーザーIDだけを取り込む。住所・電話・メールなどの列は読まない。
  const importCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMessage("");
    try {
      const rows = parseCsv(await file.text());
      const head = rows[0] || [];
      const iName = head.indexOf("名前");
      const iType = head.indexOf("種別");
      const iSlack = head.indexOf("SlackユーザーID");
      if (iName < 0 || iType < 0) {
        setMessage("在庫管理アプリのメンバー・外注先マスタのCSVではありません(「名前」「種別」の列が見つかりません)。");
        return;
      }
      const src = rows
        .slice(1)
        .filter((r) => (r[iType] || "").trim() === "社員" && (r[iName] || "").trim())
        .map((r) => ({ name: r[iName].trim(), slackUserId: iSlack >= 0 ? (r[iSlack] || "").trim() : "" }));
      if (src.length === 0) {
        setMessage("取り込めるメンバー(種別「社員」)がありませんでした。");
        return;
      }
      let added = 0;
      let updated = 0;
      setMembers((prev) => {
        const next = [...prev];
        added = 0;
        updated = 0;
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
      setMessage(`取り込みました(メンバー${src.length}人。すでにいる人はSlackユーザーIDだけ更新します)。`);
    } catch (err) {
      setMessage("ファイルを読み込めませんでした。");
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
      <button onClick={() => fileRef.current?.click()} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1">
        <Upload size={14} /> 在庫管理アプリのCSVから取り込む
      </button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} />
      <p className="text-xs text-[var(--text-muted)]">在庫管理アプリの「マスタ管理 → メンバー・外注先マスタ」の「CSV出力」で出したファイルを選びます。</p>
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

// 引用符つきの項目・改行を含む項目に対応した、最小限のCSV読み込み(先頭のBOMは無視)
function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}
