import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";
import { GROUP_COLORS, COLOR_KEYS } from "../../lib/colors.js";

// ---------- 梱包グループ管理(商品サマリー画面) ----------
export function GroupManager({ productId, groups, setGroups, lineItems, setLineItems }) {
  const productGroups = groups.filter((g) => g.productId === productId);
  const topGroups = productGroups.filter((g) => !g.parentId);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", color: COLOR_KEYS[0] });
  const [addingOuter, setAddingOuter] = useState(false);
  const [addingSubFor, setAddingSubFor] = useState(null);
  const [newDraft, setNewDraft] = useState({ name: "", color: COLOR_KEYS[0] });

  const startEdit = (g) => {
    setAddingOuter(false);
    setAddingSubFor(null);
    setEditingId(g.id);
    setEditDraft({ name: g.name, color: g.color });
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = (id) => {
    const name = editDraft.name.trim();
    if (!name) return;
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name, color: editDraft.color } : g)));
    setEditingId(null);
  };

  const deleteGroup = (group) => {
    const childGroups = productGroups.filter((g) => g.parentId === group.id);
    const idsToDelete = [group.id, ...childGroups.map((g) => g.id)];
    const affectedCount = lineItems.filter((it) => idsToDelete.includes(it.groupId)).length;

    let message = `「${group.name}」を削除しますか？`;
    if (childGroups.length > 0) {
      message += `\nこの中の小分け梱包(${childGroups.map((g) => g.name).join("、")})も一緒に削除されます。`;
    }
    if (affectedCount > 0) {
      message += `\n${affectedCount}件の明細がこのグループを使っています。削除するとそれらの明細はグループなしになります。`;
    }
    if (!window.confirm(message)) return;

    setGroups((prev) => prev.filter((g) => !idsToDelete.includes(g.id)));
    setLineItems((prev) => prev.map((it) => (idsToDelete.includes(it.groupId) ? { ...it, groupId: null } : it)));
    if (idsToDelete.includes(editingId)) setEditingId(null);
  };

  const changeParent = (sub, newParentId) => {
    setGroups((prev) => prev.map((g) => (g.id === sub.id ? { ...g, parentId: newParentId } : g)));
  };

  const startAddOuter = () => {
    setEditingId(null);
    setAddingSubFor(null);
    setNewDraft({ name: "", color: COLOR_KEYS[0] });
    setAddingOuter(true);
  };
  const startAddSub = (outerId) => {
    setEditingId(null);
    setAddingOuter(false);
    setNewDraft({ name: "", color: COLOR_KEYS[0] });
    setAddingSubFor(outerId);
  };
  const cancelAdd = () => {
    setAddingOuter(false);
    setAddingSubFor(null);
  };

  const submitAdd = (parentId) => {
    const name = newDraft.name.trim();
    if (!name) return;
    setGroups((prev) => [...prev, { id: `grp-${Date.now()}`, productId, name, parentId, color: newDraft.color }]);
    setAddingOuter(false);
    setAddingSubFor(null);
  };

  const colorPicker = (value, onChange) => (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`text-xs px-2 py-0.5 rounded-md border ${GROUP_COLORS[key].chip} ${value === key ? "ring-2 ring-[var(--accent)]" : ""}`}
        >
          {key}
        </button>
      ))}
    </div>
  );

  const renderEditRow = (g) => (
    <div className="flex-1 flex flex-wrap items-center gap-2">
      <input
        className={`${inputCls} w-40`}
        value={editDraft.name}
        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
        autoFocus
      />
      {colorPicker(editDraft.color, (color) => setEditDraft({ ...editDraft, color }))}
      <div className="flex gap-1.5">
        <button
          onClick={() => saveEdit(g.id)}
          className="text-xs px-2.5 py-1 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1 font-medium"
        >
          <Check size={13} /> 保存
        </button>
        <button onClick={cancelEdit} className="text-xs px-2.5 py-1 border border-[var(--border)] text-[var(--text)] rounded-md flex items-center gap-1">
          <X size={13} /> キャンセル
        </button>
      </div>
    </div>
  );

  const renderNewRow = (parentId) => (
    <div className="flex-1 flex flex-wrap items-center gap-2">
      <input
        className={`${inputCls} w-40`}
        placeholder="グループ名"
        value={newDraft.name}
        onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") submitAdd(parentId); }}
        autoFocus
      />
      {colorPicker(newDraft.color, (color) => setNewDraft({ ...newDraft, color }))}
      <div className="flex gap-1.5">
        <button
          onClick={() => submitAdd(parentId)}
          className="text-xs px-2.5 py-1 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1 font-medium"
        >
          <Check size={13} /> 作成
        </button>
        <button onClick={cancelAdd} className="text-xs px-2.5 py-1 border border-[var(--border)] text-[var(--text)] rounded-md flex items-center gap-1">
          <X size={13} /> キャンセル
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--ink)]">梱包グループ管理</p>
        <button
          onClick={startAddOuter}
          className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1"
        >
          <Plus size={14} /> 外側の梱包を追加
        </button>
      </div>

      {addingOuter && <div className="border border-dashed border-[var(--border)] rounded-md p-2">{renderNewRow(null)}</div>}

      {topGroups.length === 0 && !addingOuter && (
        <p className="text-sm text-[var(--text-muted)]">梱包グループがまだありません。「外側の梱包を追加」から作成してください。</p>
      )}

      <div className="space-y-3">
        {topGroups.map((outer) => {
          const c = GROUP_COLORS[outer.color] || GROUP_COLORS.emerald;
          const subGroups = productGroups.filter((g) => g.parentId === outer.id);
          return (
            <div key={outer.id} className="border border-[var(--border)] rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.chip.split(" ")[0]}`} />
                {editingId === outer.id ? (
                  renderEditRow(outer)
                ) : (
                  <>
                    <span className="text-sm font-medium flex-1">{outer.name}</span>
                    <button onClick={() => startEdit(outer)} title="編集" className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteGroup(outer)} title="削除" className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] rounded">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>

              <div className="ml-4 space-y-1.5">
                {subGroups.map((sub) => {
                  const sc = GROUP_COLORS[sub.color] || GROUP_COLORS.emerald;
                  return (
                    <div key={sub.id} className="flex items-center gap-2 pl-3 border-l-2 border-[var(--border)]">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${sc.chip.split(" ")[0]}`} />
                      {editingId === sub.id ? (
                        renderEditRow(sub)
                      ) : (
                        <>
                          <span className="text-sm flex-1">{sub.name}</span>
                          <select
                            value={sub.parentId}
                            onChange={(e) => changeParent(sub, e.target.value)}
                            title="親の外側の梱包を変更"
                            className="text-xs border border-[var(--border)] rounded-md px-1.5 py-1 bg-[var(--card)] text-[var(--text)]"
                          >
                            {topGroups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                          <button onClick={() => startEdit(sub)} title="編集" className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteGroup(sub)} title="削除" className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] rounded">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}

                {addingSubFor === outer.id ? (
                  <div className="pl-3 border-l-2 border-dashed border-[var(--border)]">{renderNewRow(outer.id)}</div>
                ) : (
                  <button
                    onClick={() => startAddSub(outer.id)}
                    className="text-xs px-2 py-1 rounded-md border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center gap-1 ml-3"
                  >
                    <Plus size={12} /> 小分けを追加
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
