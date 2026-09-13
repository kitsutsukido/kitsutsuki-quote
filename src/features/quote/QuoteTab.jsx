import { useState } from "react";
import { Plus, X } from "lucide-react";
import { GROUP_COLORS } from "../../lib/colors.js";
import { specString } from "../../lib/spec.js";
import { LineItemForm } from "../lineItems/LineItemForm.jsx";

// ---------- 見積もりタブ ----------
export function QuoteTab({ project, projects, sessions, setSessions, groups, lineItems, setLineItems }) {
  const projectSessions = sessions.filter((s) => s.projectId === project.id);
  const [activeSessionId, setActiveSessionId] = useState(
    projectSessions.find((s) => s.status === "確定")?.id || projectSessions[0]?.id
  );
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const projectGroups = groups.filter((g) => g.productId === project.productId);
  const topGroups = projectGroups.filter((g) => !g.parentId);
  const items = lineItems.filter((it) => it.sessionId === activeSessionId);
  const total = items.reduce((s, it) => s + it.amount, 0);

  const nested = topGroups
    .map((outer) => {
      const directItems = items.filter((it) => it.groupId === outer.id);
      const subGroups = projectGroups
        .filter((g) => g.parentId === outer.id)
        .map((sub) => ({ group: sub, items: items.filter((it) => it.groupId === sub.id) }))
        .filter((x) => x.items.length);
      const subtotal = directItems.reduce((s, it) => s + it.amount, 0) + subGroups.reduce((s, x) => s + x.items.reduce((s2, it) => s2 + it.amount, 0), 0);
      const count = directItems.length + subGroups.reduce((s, x) => s + x.items.length, 0);
      return { outer, directItems, subGroups, subtotal, count };
    })
    .filter((x) => x.count > 0);

  const ungrouped = items.filter((it) => !it.groupId);

  // この商品でこれまでに確定見積もりが一度でもあれば、以降は仮を経ずにいきなり確定になる
  const productProjectIds = projects.filter((p) => p.productId === project.productId).map((p) => p.id);
  const productHasConfirmedBefore = sessions.some((s) => productProjectIds.includes(s.projectId) && s.status === "確定");
  const isReprint = productHasConfirmedBefore;

  const addSession = () => {
    const id = `qs-${Date.now()}`;
    const status = isReprint ? "確定" : "仮";
    const kariCount = projectSessions.filter((s) => s.status === "仮").length;
    const label = isReprint ? "確定見積もり" : `仮見積もり${"①②③④⑤⑥⑦⑧⑨".slice(kariCount, kariCount + 1)}`;
    const newSession = { id, projectId: project.id, label, date: new Date().toISOString().slice(0, 10), status };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(id);
  };

  const deleteSession = (id) => {
    const target = projectSessions.find((s) => s.id === id);
    const itemCount = lineItems.filter((it) => it.sessionId === id).length;
    if (!window.confirm(`「${target?.label}」を削除しますか？\n明細${itemCount}件も一緒に削除され、元に戻せません。`)) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setLineItems((prev) => prev.filter((it) => it.sessionId !== id));
    if (id === activeSessionId) {
      const remaining = projectSessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining[0]?.id);
    }
  };

  const deleteItem = (id) => {
    if (!window.confirm("この明細を削除しますか？元に戻せません。")) return;
    setLineItems((prev) => prev.filter((it) => it.id !== id));
    setEditingItem(null);
  };

  const row = (it) => (
    <tr key={it.id} className="border-b border-[var(--border)] last:border-0 group">
      <td className="py-1.5 pl-3 w-1/4">{it.name}</td>
      <td className="py-1.5 text-[var(--text-muted)]">{specString(it)}</td>
      <td className="py-1.5 text-right w-16 font-mono">{it.qty}</td>
      <td className="py-1.5 text-right w-20 font-mono">{(it.amount / it.qty).toFixed(1)}円</td>
      <td className="py-1.5 text-right w-24 font-mono">{it.amount.toLocaleString()}円</td>
      <td className="py-1.5 pl-2 w-14 text-right">
        <button onClick={() => setEditingItem(it)} className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] underline underline-offset-2" title="編集">
          編集
        </button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {projectSessions.map((s) => (
          <div
            key={s.id}
            className={`flex items-center gap-1.5 text-sm pl-3 pr-1.5 py-1 rounded-md border ${
              s.id === activeSessionId
                ? s.status === "確定" ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "border-[var(--ink-soft)] bg-[var(--card)] text-[var(--text)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card)]"
            }`}
          >
            <button onClick={() => setActiveSessionId(s.id)} className="flex items-center gap-1">
              {s.label} <span className="text-xs text-[var(--text-muted)]">{s.date}</span>
            </button>
            <button onClick={() => deleteSession(s.id)} title="このセッションを削除" className="text-[var(--text-muted)] hover:text-[var(--danger)] rounded p-0.5">
              <X size={13} />
            </button>
          </div>
        ))}
        <button onClick={addSession} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]" title={isReprint ? "増刷のため、仮を経ずにそのまま確定見積もりとして追加されます" : "初回のため、まず仮見積もりとして追加されます"}>
          <Plus size={14} /> {isReprint ? "増刷の見積もりを確定で追加" : "仮見積もりを追加"}
        </button>
      </div>

      {!activeSessionId ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center text-sm text-[var(--text-muted)]">
          セッションがまだありません。上の「{isReprint ? "増刷の見積もりを確定で追加" : "仮見積もりを追加"}」ボタンから作成してください。
        </div>
      ) : (
        <>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            {nested.map(({ outer, directItems, subGroups, subtotal, count }) => {
              return (
                <div key={outer.id} className="mb-4 last:mb-0 border border-[var(--border)] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[var(--ink)]">{outer.name}<span className="text-xs text-[var(--text-muted)] font-normal ml-1">(外側の梱包・まとめて1袋)</span></span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">{count}点・{subtotal.toLocaleString()}円</span>
                  </div>
                  {directItems.length > 0 && (
                    <table className="w-full text-sm mb-2">
                      <tbody>{directItems.map(row)}</tbody>
                    </table>
                  )}
                  {subGroups.map(({ group, items: subItems }) => {
                    const c = GROUP_COLORS[group.color] || GROUP_COLORS.emerald;
                    const subSubtotal = subItems.reduce((s, it) => s + it.amount, 0);
                    return (
                      <div key={group.id} className="mb-2 last:mb-0 ml-2">
                        <div className={`border-l-4 rounded-r-md px-3 py-1.5 flex justify-between items-center ${c.bar}`}>
                          <span className="text-sm font-medium">{group.name}</span>
                          <span className="text-xs text-[var(--text-muted)] font-mono">{subItems.length}点・{subSubtotal.toLocaleString()}円</span>
                        </div>
                        <table className="w-full text-sm mt-1">
                          <tbody>{subItems.map(row)}</tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {ungrouped.length > 0 && (
              <table className="w-full text-sm">
                <tbody>{ungrouped.map(row)}</tbody>
              </table>
            )}
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-[var(--border)]">
              <span className="text-sm font-medium">経費合計</span>
              <span className="text-sm font-medium font-mono">{total.toLocaleString()}円</span>
            </div>
          </div>

          {editingItem && (
            <LineItemForm
              groups={projectGroups}
              sessionId={activeSessionId}
              initial={editingItem}
              onCancel={() => setEditingItem(null)}
              onDelete={deleteItem}
              onSave={(item) => { setLineItems((prev) => prev.map((li2) => (li2.id === item.id ? item : li2))); setEditingItem(null); }}
            />
          )}

          {!editingItem && (showForm ? (
            <LineItemForm
              groups={projectGroups}
              sessionId={activeSessionId}
              onCancel={() => setShowForm(false)}
              onSave={(item) => { setLineItems((prev) => [...prev, item]); setShowForm(false); }}
            />
          ) : (
            <button onClick={() => setShowForm(true)} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]">
              <Plus size={14} /> 明細を追加
            </button>
          ))}
        </>
      )}
    </div>
  );
}
