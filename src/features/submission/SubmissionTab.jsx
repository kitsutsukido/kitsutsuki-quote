import { Upload, Undo2 } from "lucide-react";
import { specString } from "../../lib/spec.js";

// ---------- 入稿管理タブ ----------
export function SubmissionTab({ project, sessions, lineItems, setLineItems }) {
  const confirmedIds = sessions.filter((s) => s.projectId === project.id && s.status === "確定").map((s) => s.id);
  const items = lineItems.filter((it) => confirmedIds.includes(it.sessionId));
  const today = new Date().toISOString().slice(0, 10);

  const notSubmitted = items.filter((it) => !it.actualDate).length;
  const notPurchased = items.filter((it) => it.purchaseStatus !== "済").length;
  const overdue = items.filter((it) => it.plannedDate && !it.actualDate && it.plannedDate < today).length;

  const update = (id, fields) => setLineItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...fields } : it)));

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2.5">
          <p className="text-xs text-[var(--text-muted)]">未入稿</p>
          <p className="text-xl font-medium font-mono">{notSubmitted}件</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2.5">
          <p className="text-xs text-[var(--text-muted)]">未購入</p>
          <p className="text-xl font-medium font-mono">{notPurchased}件</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--danger)] rounded-lg px-4 py-2.5">
          <p className="text-xs text-[var(--danger)]">予定日超過</p>
          <p className="text-xl font-medium font-mono text-[var(--danger)]">{overdue}件</p>
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border)] text-left">
              <th className="py-2 px-3 font-normal">入稿先</th>
              <th className="py-2 px-3 font-normal">内容</th>
              <th className="py-2 px-3 font-normal">仕様</th>
              <th className="py-2 px-3 font-normal text-right">部数</th>
              <th className="py-2 px-3 font-normal">購入</th>
              <th className="py-2 px-3 font-normal">入稿状況</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const isOverdue = it.plannedDate && !it.actualDate && it.plannedDate < today;
              return (
                <tr key={it.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 px-3">{it.submitTo || "―"}</td>
                  <td className="py-2 px-3">{it.name}</td>
                  <td className="py-2 px-3 text-[var(--text-muted)]">{specString(it)}</td>
                  <td className="py-2 px-3 text-right font-mono">{it.qty}</td>
                  <td className="py-2 px-3">
                    <select
                      className="border border-[var(--border)] rounded-md px-2 py-1 text-sm"
                      value={it.purchaseStatus}
                      onChange={(e) => update(it.id, { purchaseStatus: e.target.value })}
                    >
                      <option>未</option><option>済</option><option>ー</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    {it.actualDate ? (
                      <div className="flex items-center gap-2">
                        <span className="bg-[var(--success-soft)] text-[var(--success)] rounded-md px-2 py-1 text-xs flex items-center gap-1 whitespace-nowrap">
                          入稿済
                        </span>
                        <input type="date" className="border border-[var(--border)] rounded-md px-2 py-1 text-sm"
                          value={it.actualDate} onChange={(e) => update(it.id, { actualDate: e.target.value })} />
                        <button onClick={() => update(it.id, { actualDate: "" })}
                          className="text-xs text-[var(--danger)] border border-[var(--border)] rounded-md px-2 py-1 flex items-center gap-1 whitespace-nowrap">
                          <Undo2 size={12} /> 取り消す
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isOverdue && <span className="text-xs text-[var(--danger)]">予定日超過（{it.plannedDate}）</span>}
                        <button onClick={() => update(it.id, { actualDate: today })}
                          className="text-xs border border-[var(--accent)] text-[var(--accent)] rounded-md px-2 py-1 flex items-center gap-1">
                          <Upload size={12} /> 入稿する
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
