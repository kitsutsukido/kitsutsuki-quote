import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";
import { GROUP_COLORS, COLOR_KEYS } from "../../lib/colors.js";
import { buildGroupTree, selfAndDescendantIds, selectableParents } from "../../lib/groupTree.js";

// ---------- 梱包グループ管理(商品サマリー画面) ----------
export function GroupManager({ productId, groups, setGroups, lineItems, setLineItems }) {
  const productGroups = groups.filter((g) => g.productId === productId);
  const tree = buildGroupTree(productGroups);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", color: COLOR_KEYS[0] });
  const [addingParent, setAddingParent] = useState(undefined); // undefined=非表示 / null=最上位に追加 / id=そのグループの中に追加
  const [newDraft, setNewDraft] = useState({ name: "", color: COLOR_KEYS[0] });

  const startEdit = (g) => {
    setAddingParent(undefined);
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
    const idsToDelete = selfAndDescendantIds(productGroups, group.id);
    const childGroups = productGroups.filter((g) => idsToDelete.includes(g.id) && g.id !== group.id);
    const affectedCount = lineItems.filter((it) => idsToDelete.includes(it.groupId)).length;

    let message = `「${group.name}」を削除しますか？`;
    if (childGroups.length > 0) {
      message += `\nこの中のグループ(${childGroups.map((g) => g.name).join("、")})も一緒に削除されます。`;
    }
    if (affectedCount > 0) {
      message += `\n${affectedCount}件の明細がこのグループを使っています。削除するとそれらの明細はグループなしになります。`;
    }
    if (!window.confirm(message)) return;

    setGroups((prev) => prev.filter((g) => !idsToDelete.includes(g.id)));
    setLineItems((prev) => prev.map((it) => (idsToDelete.includes(it.groupId) ? { ...it, groupId: null } : it)));
    if (idsToDelete.includes(editingId)) setEditingId(null);
  };

  const changeParent = (group, newParentId) => {
    setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, parentId: newParentId || null } : g)));
  };

  const startAdd = (parentId) => {
    setEditingId(null);
    setNewDraft({ name: "", color: COLOR_KEYS[0] });
    setAddingParent(parentId);
  };
  const cancelAdd = () => setAddingParent(undefined);

  const submitAdd = (parentId) => {
    const name = newDraft.name.trim();
    if (!name) return;
    setGroups((prev) => [...prev, { id: `grp-${Date.now()}`, productId, name, parentId, color: newDraft.color }]);
    setAddingParent(undefined);
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

  const renderNode = ({ group, depth, children }) => {
    const c = GROUP_COLORS[group.color] || GROUP_COLORS.emerald;
    const parentOptions = selectableParents(productGroups, group.id);
    const row = (
      <div className="flex flex-wrap items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.chip.split(" ")[0]}`} />
        {editingId === group.id ? (
          renderEditRow(group)
        ) : (
          <>
            <span className={`text-sm flex-1 min-w-[6rem] ${depth === 0 ? "font-medium" : ""}`}>{group.name}</span>
            <select
              value={group.parentId || ""}
              onChange={(e) => changeParent(group, e.target.value)}
              title="入れる先(親)を変更"
              className="text-xs border border-[var(--border)] rounded-md px-1.5 py-1 bg-[var(--card)] text-[var(--text)] max-w-[10rem]"
            >
              <option value="">(最上位)</option>
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => startAdd(group.id)}
              title="このグループの中に追加"
              className="text-xs px-2 py-1 rounded-md border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center gap-1"
            >
              <Plus size={12} /> 中に追加
            </button>
            <button onClick={() => startEdit(group)} title="編集" className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded">
              <Pencil size={14} />
            </button>
            <button onClick={() => deleteGroup(group)} title="削除" className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] rounded">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    );
    const nested = (children.length > 0 || addingParent === group.id) && (
      <div className="ml-3 mt-1.5 pl-3 border-l-2 border-[var(--border)] space-y-1.5">
        {children.map(renderNode)}
        {addingParent === group.id && (
          <div className="border border-dashed border-[var(--border)] rounded-md p-2">{renderNewRow(group.id)}</div>
        )}
      </div>
    );
    if (depth === 0) {
      return (
        <div key={group.id} className="border border-[var(--border)] rounded-md p-3">
          {row}
          {nested}
        </div>
      );
    }
    return (
      <div key={group.id}>
        {row}
        {nested}
      </div>
    );
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--ink)]">梱包グループ管理</p>
        <button
          onClick={() => startAdd(null)}
          className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1"
        >
          <Plus size={14} /> 外側の梱包を追加
        </button>
      </div>

      {addingParent === null && <div className="border border-dashed border-[var(--border)] rounded-md p-2">{renderNewRow(null)}</div>}

      {tree.length === 0 && addingParent !== null && (
        <p className="text-sm text-[var(--text-muted)]">梱包グループがまだありません。「外側の梱包を追加」から作成してください。</p>
      )}

      <p className="text-xs text-[var(--text-muted)]">グループの「中に追加」で、何階層でも入れ子にできます。入れる先は右のプルダウンでいつでも変えられます。</p>

      <div className="space-y-3">{tree.map(renderNode)}</div>
    </div>
  );
}
