import { useState, useRef } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { GROUP_COLORS, colorForDepth } from "../../lib/colors.js";
import { buildGroupTree } from "../../lib/groupTree.js";
import { specString } from "../../lib/spec.js";
import { LineItemForm } from "../lineItems/LineItemForm.jsx";
import { Modal } from "../../components/common/Modal.jsx";

// ---------- 見積もりタブ ----------
export function QuoteTab({ project, projects, sessions, setSessions, groups, setGroups, lineItems, setLineItems }) {
  const projectSessions = sessions.filter((s) => s.projectId === project.id);
  const [activeSessionId, setActiveSessionId] = useState(
    projectSessions.find((s) => s.status === "確定")?.id || projectSessions[0]?.id
  );
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionLabelDraft, setSessionLabelDraft] = useState("");
  const skipBlurSave = useRef(false);

  const projectGroups = groups.filter((g) => g.productId === project.productId);
  const activeSession = projectSessions.find((x) => x.id === activeSessionId);
  const items = lineItems.filter((it) => it.sessionId === activeSessionId);
  const total = items.reduce((s, it) => s + it.amount, 0);

  // グループの木に、このセッションの明細を割り当てる(小計・点数は配下すべてを含む)。明細のない枝は表示しない
  const attachItems = (node) => {
    const children = node.children.map(attachItems).filter(Boolean);
    const directItems = items.filter((it) => it.groupId === node.group.id);
    const count = directItems.length + children.reduce((s, c) => s + c.count, 0);
    if (count === 0) return null;
    const subtotal = directItems.reduce((s, it) => s + it.amount, 0) + children.reduce((s, c) => s + c.subtotal, 0);
    return { group: node.group, depth: node.depth, directItems, children, count, subtotal };
  };
  const nested = buildGroupTree(projectGroups).map(attachItems).filter(Boolean);

  const ungrouped = items.filter((it) => !it.groupId);

  const draftSessions = projectSessions.filter((x) => x.status === "仮");
  const [showBasePicker, setShowBasePicker] = useState(false);

  // baseSessionId を渡すと、そのセッションの明細をコピーして作る(購入・入稿の進捗は空に戻す)
  const addSession = (status, baseSessionId) => {
    const id = `qs-${Date.now()}`;
    const circled = "①②③④⑤⑥⑦⑧⑨";
    const count = projectSessions.filter((s) => s.status === status).length;
    const mark = count < circled.length ? circled[count] : `(${count + 1})`;
    const label =
      status === "確定"
        ? count === 0 ? "確定見積もり" : `確定見積もり${mark}`
        : `仮見積もり${mark}`;
    const base = baseSessionId ? projectSessions.find((x) => x.id === baseSessionId) : null;
    const newSession = { id, projectId: project.id, label, date: new Date().toISOString().slice(0, 10), status };
    if (base) {
      newSession.baseSessionId = base.id;
      newSession.baseLabel = base.label;
      const copies = lineItems
        .filter((it) => it.sessionId === base.id)
        .map((it, i) => ({
          ...it,
          id: `qli-${Date.now()}-${i}`,
          sessionId: id,
          processes: [...(it.processes || [])],
          purchaseStatus: "未",
          actualDate: "",
        }));
      setLineItems((prev) => [...prev, ...copies]);
    }
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(id);
    setShowBasePicker(false);
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

  const startEditSession = (s) => {
    setSessionLabelDraft(s.label);
    setEditingSessionId(s.id);
  };

  const renameSession = (id) => {
    const label = sessionLabelDraft.trim();
    if (label) {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
    }
    setEditingSessionId(null);
  };

  const cancelEditSession = () => {
    skipBlurSave.current = true;
    setEditingSessionId(null);
  };

  // 明細1行。PCは横並びの表風、スマホは「名称・金額・編集」「仕様＋部数×単価」の2段
  const row = (it) => (
    <div
      key={it.id}
      className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[25%_1fr_4rem_5rem_6rem_3.5rem] items-baseline gap-x-3 md:gap-x-0 gap-y-0.5 py-1.5 border-b border-[var(--border)] last:border-0"
    >
      <span className="col-start-1 row-start-1 md:col-auto md:row-auto md:pl-3 min-w-0 break-words">{it.name}</span>
      <span className="col-start-1 col-span-3 row-start-2 md:col-auto md:col-span-1 md:row-auto text-xs md:text-sm text-[var(--text-muted)] order-last md:order-none">
        {specString(it)}
        <span className="md:hidden font-mono"> ・{it.qty}部 × {(it.amount / it.qty).toFixed(1)}円</span>
      </span>
      <span className="hidden md:block text-right font-mono">{it.qty}</span>
      <span className="hidden md:block text-right font-mono">{(it.amount / it.qty).toFixed(1)}円</span>
      <span className="col-start-2 row-start-1 md:col-start-5 md:row-auto text-right font-mono">{it.amount.toLocaleString()}円</span>
      <span className="col-start-3 row-start-1 md:col-auto md:row-auto md:pl-2 text-right">
        <button onClick={() => setEditingItem(it)} className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] underline underline-offset-2 whitespace-nowrap" title="編集">
          編集
        </button>
      </span>
    </div>
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
            {editingSessionId === s.id ? (
              <input
                autoFocus
                value={sessionLabelDraft}
                onChange={(e) => setSessionLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") cancelEditSession();
                }}
                onBlur={() => {
                  if (skipBlurSave.current) {
                    skipBlurSave.current = false;
                    return;
                  }
                  renameSession(s.id);
                }}
                className="text-sm bg-transparent border-b border-[var(--accent)] outline-none w-28"
              />
            ) : (
              <button onClick={() => setActiveSessionId(s.id)} className="flex items-center gap-1">
                {s.label} <span className="text-xs text-[var(--text-muted)]">{s.date}</span>
              </button>
            )}
            {editingSessionId !== s.id && (
              <button onClick={() => startEditSession(s)} title="タイトルを編集" className="text-[var(--text-muted)] hover:text-[var(--accent)] rounded p-0.5">
                <Pencil size={12} />
              </button>
            )}
            <button onClick={() => deleteSession(s.id)} title="このセッションを削除" className="text-[var(--text-muted)] hover:text-[var(--danger)] rounded p-0.5">
              <X size={13} />
            </button>
          </div>
        ))}
        <button onClick={() => addSession("仮")} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]">
          <Plus size={14} /> 仮見積もりを追加
        </button>
        <button
          onClick={() => (draftSessions.length > 0 ? setShowBasePicker(true) : addSession("確定"))}
          className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1">
          <Plus size={14} /> 確定見積もりを追加
        </button>
      </div>

      {activeSession?.baseLabel && (
        <p className="text-xs text-[var(--text-muted)] -mt-2">「{activeSession.baseLabel}」をベースに作成</p>
      )}

      {showBasePicker && (
        <Modal>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-[var(--ink)]">確定見積もりのベースを選んでください</p>
            <p className="text-xs text-[var(--text-muted)]">選んだ仮見積もりの明細をコピーして作ります。コピー後に自由に直せます(元の仮見積もりは変わりません)。</p>
            <div className="space-y-2">
              {draftSessions.map((d) => {
                const count = lineItems.filter((it) => it.sessionId === d.id).length;
                const sum = lineItems.filter((it) => it.sessionId === d.id).reduce((t, it) => t + it.amount, 0);
                return (
                  <button
                    key={d.id}
                    onClick={() => addSession("確定", d.id)}
                    className="w-full text-left border border-[var(--border)] rounded-md px-3 py-2 hover:border-[var(--accent)] flex justify-between items-center gap-2"
                  >
                    <span className="text-sm text-[var(--ink)]">{d.label} <span className="text-xs text-[var(--text-muted)]">{d.date}</span></span>
                    <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">{count}点・{sum.toLocaleString()}円</span>
                  </button>
                );
              })}
              <button
                onClick={() => addSession("確定")}
                className="w-full text-left border border-dashed border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                空の状態から作る
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowBasePicker(false)} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md text-[var(--text)]">キャンセル</button>
            </div>
          </div>
        </Modal>
      )}

      {!activeSessionId ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center text-sm text-[var(--text-muted)]">
          セッションがまだありません。上の「仮見積もりを追加」「確定見積もりを追加」ボタンから作成してください。
        </div>
      ) : (
        <>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            {nested.map(function renderNode(node) {
              const { group, depth, directItems, children, count, subtotal } = node;
              const c = GROUP_COLORS[colorForDepth(depth)];
              const header = depth === 0 ? (
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-[var(--ink)]">{group.name}{children.length > 0 && <span className="text-xs text-[var(--text-muted)] font-normal ml-1">(外側の梱包・まとめて1袋)</span>}</span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">{count}点・{subtotal.toLocaleString()}円</span>
                </div>
              ) : (
                <div className={`border-l-4 rounded-r-md px-3 py-1.5 flex justify-between items-center ${c.bar}`}>
                  <span className="text-sm font-medium">{group.name}</span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">{count}点・{subtotal.toLocaleString()}円</span>
                </div>
              );
              const body = (
                <>
                  {header}
                  {directItems.length > 0 && (
                    <div className="text-sm">{directItems.map(row)}</div>
                  )}
                  {children.length > 0 && (
                    <div className="mt-2 ml-3 pl-3 border-l-2 border-[var(--border)] space-y-2">{children.map(renderNode)}</div>
                  )}
                </>
              );
              return depth === 0 ? (
                <div key={group.id} className="mb-4 last:mb-0 border border-[var(--border)] rounded-lg p-3">{body}</div>
              ) : (
                <div key={group.id}>{body}</div>
              );
            })}
            {ungrouped.length > 0 && (
              <div className="text-sm">{ungrouped.map(row)}</div>
            )}
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-[var(--border)]">
              <span className="text-sm font-medium">経費合計</span>
              <span className="text-sm font-medium font-mono">{total.toLocaleString()}円</span>
            </div>
          </div>

          {editingItem && (
            <Modal><LineItemForm
              groups={projectGroups}
              productId={project.productId}
              setGroups={setGroups}
              lineItems={lineItems}
              setLineItems={setLineItems}
              sessionId={activeSessionId}
              initial={editingItem}
              onCancel={() => setEditingItem(null)}
              onDelete={deleteItem}
              onSave={(item) => { setLineItems((prev) => prev.map((li2) => (li2.id === item.id ? item : li2))); setEditingItem(null); }}
            /></Modal>
          )}

          {!editingItem && (showForm ? (
            <Modal><LineItemForm
              groups={projectGroups}
              productId={project.productId}
              setGroups={setGroups}
              lineItems={lineItems}
              setLineItems={setLineItems}
              sessionId={activeSessionId}
              onCancel={() => setShowForm(false)}
              onSave={(item) => { setLineItems((prev) => [...prev, item]); setShowForm(false); }}
            /></Modal>
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
