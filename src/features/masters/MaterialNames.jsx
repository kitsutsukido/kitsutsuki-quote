import { useState } from "react";
import { inputCls } from "../../components/common/inputStyles.js";
import { isMaterial } from "../../lib/spec.js";

// ---------- 資材の商品名を、使っている明細すべてでまとめて置き換える ----------
// 資材の明細は商品名(size 欄)を1件ずつ入力しているため、あとで名前を直すときに
// 全ロットの明細を1つずつ直さなくて済むよう、ここで一度に置き換える。
// 比べるときは全角・半角と空白の違いをそろえる(見た目が同じなら同じ名前として数える)。
const norm = (v) => String(v || "").normalize("NFKC").replace(/\s+/g, " ").trim();

export function MaterialNames({ lineItems, setLineItems, projects = [], sessions = [] }) {
  const [editing, setEditing] = useState(null); // 直している名前(norm 済み)
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState("");

  const lotOf = (it) => {
    const s = sessions.find((x) => x.id === it.sessionId);
    return projects.find((p) => p.id === s?.projectId);
  };

  // 名前ごとに、使っている明細とロットを集める
  const names = [];
  for (const it of lineItems) {
    if (!isMaterial(it) || !norm(it.size)) continue;
    const key = norm(it.size);
    let n = names.find((x) => x.key === key);
    if (!n) names.push((n = { key, label: it.size.trim(), items: [], lots: new Set() }));
    n.items.push(it);
    const lot = lotOf(it);
    if (lot) n.lots.add(lot.id);
  }
  names.sort((a, b) => a.label.localeCompare(b.label, "ja"));

  const start = (n) => {
    setEditing(n.key);
    setDraft(n.label);
    setMsg("");
  };
  const apply = (n) => {
    const next = draft.trim();
    if (!next || norm(next) === n.key && next === n.label) return setEditing(null);
    const merged = names.find((x) => x.key === norm(next) && x.key !== n.key);
    if (
      !window.confirm(
        `資材の商品名「${n.label}」を「${next}」に置き換えます。\n${n.items.length}件の明細(${n.lots.size}ロット)が変わります。` +
          (merged ? `\n※「${merged.label}」と同じ名前になるので、一覧では1つにまとまります。` : "") +
          "\nよろしいですか？"
      )
    )
      return;
    const ids = new Set(n.items.map((it) => it.id));
    setLineItems((prev) => prev.map((it) => (ids.has(it.id) ? { ...it, size: next } : it)));
    setEditing(null);
    setMsg(`「${n.label}」→「${next}」:${n.items.length}件の明細を置き換えました。`);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--ink)]">資材の商品名</p>
      <p className="text-xs text-[var(--text-muted)]">
        明細(種類「資材」)の商品名の一覧です。「直す」で名前を変えると、その名前を使っている全ロットの明細がまとめて変わります。
      </p>
      {msg && <p className="text-xs text-[var(--text)]">{msg}</p>}
      {names.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">資材の明細はまだありません。</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {names.map((n) => (
            <li key={n.key} className="py-2 flex flex-wrap items-center gap-2 text-sm">
              {editing === n.key ? (
                <>
                  <input className={`${inputCls} flex-1 min-w-[12rem]`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") apply(n); if (e.key === "Escape") setEditing(null); }} />
                  <button onClick={() => apply(n)} className="text-xs px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md">置き換える</button>
                  <button onClick={() => setEditing(null)} className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-md">取消</button>
                </>
              ) : (
                <>
                  <span className="flex-1 min-w-[12rem] text-[var(--text)]">{n.label}</span>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{n.items.length}件・{n.lots.size}ロット</span>
                  <button onClick={() => start(n)} className="text-xs px-3 py-1 border border-[var(--border)] rounded-md">直す</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
