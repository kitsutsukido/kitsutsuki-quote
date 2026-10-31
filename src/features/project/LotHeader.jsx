import { useState } from "react";
import { Pencil } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";

// ロット名(例: 2025年11月ロット)と印刷部数を直せる見出し
export function LotHeader({ project, onSave }) {
  const [editing, setEditing] = useState(false);
  const [round, setRound] = useState(project.round);
  const [qty, setQty] = useState(String(project.qty));

  const start = () => {
    setRound(project.round);
    setQty(String(project.qty));
    setEditing(true);
  };
  const save = () => {
    const name = round.trim();
    const n = Number(qty);
    if (!name || !Number.isFinite(n) || n <= 0) return;
    onSave({ round: name, qty: n });
    setEditing(false);
  };

  if (!editing) {
    return (
      <p className="text-sm text-[var(--text-muted)] mb-4 flex items-center gap-1.5">
        {project.round}・印刷部数 {project.qty}部
        <button onClick={start} title="ロット名・部数を直す" className="p-1 hover:text-[var(--accent)]">
          <Pencil size={13} />
        </button>
      </p>
    );
  }
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input className={`${inputCls} !w-56`} value={round} onChange={(e) => setRound(e.target.value)} placeholder="2025年11月ロット" />
      <span className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
        印刷部数
        <input type="number" className={`${inputCls} !w-24`} value={qty} onChange={(e) => setQty(e.target.value)} />部
      </span>
      <button onClick={save} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md">保存</button>
      <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md">取消</button>
    </div>
  );
}
