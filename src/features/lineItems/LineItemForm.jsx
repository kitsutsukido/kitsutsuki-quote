import { useState } from "react";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { Chip } from "../../components/common/Chip.jsx";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { specString } from "../../lib/spec.js";
import { createLineItem } from "../../data/seedData.js";
import { GROUP_COLORS, COLOR_KEYS } from "../../lib/colors.js";

const groupFormDefaults = { name: "", color: COLOR_KEYS[0], hierarchy: "outer", parentId: "" };

// ---------- 明細追加/編集フォーム ----------
export function LineItemForm({ groups, productId, setGroups, lineItems, setLineItems, onCancel, onSave, onDelete, sessionId, initial }) {
  const [form, setForm] = useState(initial ? { ...initial } : createLineItem({ sessionId, groupId: groups[0]?.id || null }));
  const [processInput, setProcessInput] = useState("");
  const [groupFormTarget, setGroupFormTarget] = useState(null); // null=非表示 / "new"=新規追加 / それ以外=編集中のグループid
  const [groupForm, setGroupForm] = useState(groupFormDefaults);
  const isEdit = !!initial;
  const isEditingGroup = groupFormTarget && groupFormTarget !== "new";

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const topGroups = groups.filter((g) => !g.parentId);

  const openNewGroupForm = () => {
    setGroupForm(groupFormDefaults);
    setGroupFormTarget("new");
  };
  const openEditGroupForm = (group) => {
    setGroupForm({
      name: group.name,
      color: group.color,
      hierarchy: group.parentId ? "sub" : "outer",
      parentId: group.parentId || "",
    });
    setGroupFormTarget(group.id);
  };
  const cancelGroupForm = () => setGroupFormTarget(null);

  const availableParents = topGroups.filter((g) => g.id !== groupFormTarget);
  const editingChildGroups = isEditingGroup ? groups.filter((g) => g.parentId === groupFormTarget) : [];

  const selectSubHierarchy = () => {
    if (editingChildGroups.length > 0) {
      window.alert(
        `このグループには小分けグループ(${editingChildGroups.map((g) => g.name).join("、")})があります。小分けに変更すると階層の整合性が崩れるため、先に中の小分けグループを別の場所に移すか削除してください。`
      );
      return;
    }
    if (availableParents.length === 0) return;
    setGroupForm({ ...groupForm, hierarchy: "sub", parentId: groupForm.parentId || availableParents[0].id });
  };

  const submitGroupForm = () => {
    const name = groupForm.name.trim();
    if (!name) return;
    if (groupForm.hierarchy === "sub" && !groupForm.parentId) return;
    if (isEditingGroup) {
      if (groupForm.hierarchy === "sub" && editingChildGroups.length > 0) return;
      const parentId = groupForm.hierarchy === "sub" ? groupForm.parentId : null;
      setGroups((prev) => prev.map((g) => (g.id === groupFormTarget ? { ...g, name, color: groupForm.color, parentId } : g)));
    } else {
      const newGroup = {
        id: `grp-${Date.now()}`,
        productId,
        name,
        parentId: groupForm.hierarchy === "sub" ? groupForm.parentId : null,
        color: groupForm.color,
      };
      setGroups((prev) => [...prev, newGroup]);
      setForm({ ...form, groupId: newGroup.id });
    }
    setGroupFormTarget(null);
  };

  const deleteGroup = () => {
    const group = groups.find((g) => g.id === groupFormTarget);
    if (!group) return;
    const childGroups = groups.filter((g) => g.parentId === group.id);
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
    if (idsToDelete.includes(form.groupId)) {
      setForm({ ...form, groupId: null });
    }
    setGroupFormTarget(null);
  };

  const addProcess = () => {
    const v = processInput.trim();
    if (!v) return;
    setForm({ ...form, processes: [...form.processes, v] });
    setProcessInput("");
  };
  const removeProcess = (i) => setForm({ ...form, processes: form.processes.filter((_, idx) => idx !== i) });

  return (
    <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)] space-y-4">
      <p className="text-sm font-medium text-[var(--ink)]">{isEdit ? "明細を編集" : "明細を追加"}</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="梱包グループ">
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const active = form.groupId === g.id;
              return (
                <div
                  key={g.id}
                  className={`flex items-stretch rounded-md border overflow-hidden ${
                    active ? "border-[var(--accent)]" : "border-[var(--border)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, groupId: g.id })}
                    className={`text-sm pl-3 pr-2 py-1.5 ${
                      active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text)] hover:bg-[var(--paper)]"
                    }`}
                  >
                    {g.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditGroupForm(g)}
                    title="グループを編集"
                    className={`px-1.5 border-l ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--paper)]"
                    }`}
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={openNewGroupForm}
              className="text-sm px-3 py-1.5 rounded-md border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center gap-1"
            >
              <Plus size={14} /> 新規
            </button>
          </div>
        </Field>
        <Field label="名称">
          <input className={inputCls} value={form.name} onChange={set("name")} placeholder="例：封筒" />
        </Field>
      </div>

      {groupFormTarget && (
        <div className="border border-[var(--border)] rounded-md p-3 space-y-3">
          <p className="text-xs text-[var(--text-muted)]">{isEditingGroup ? "梱包グループを編集" : "梱包グループを新規作成"}</p>
          <Field label="グループ名">
            <input
              className={inputCls}
              placeholder="例：チケット袋"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              autoFocus
            />
          </Field>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">色</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGroupForm({ ...groupForm, color: key })}
                  className={`text-xs px-3 py-1 rounded-md border ${GROUP_COLORS[key].chip} ${
                    groupForm.color === key ? "ring-2 ring-[var(--accent)]" : ""
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">階層</label>
            <div className="flex flex-wrap gap-2">
              <Chip active={groupForm.hierarchy === "outer"} onClick={() => setGroupForm({ ...groupForm, hierarchy: "outer" })}>
                {isEditingGroup ? "外側の梱包にする" : "新しい外側の梱包として追加"}
              </Chip>
              <Chip
                active={groupForm.hierarchy === "sub"}
                onClick={selectSubHierarchy}
                colorClass={availableParents.length === 0 ? "border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed" : undefined}
              >
                既存の外側の梱包の中に小分けとして追加
              </Chip>
            </div>
            {groupForm.hierarchy === "sub" && (
              <select
                className={`${inputCls} mt-2`}
                value={groupForm.parentId}
                onChange={(e) => setGroupForm({ ...groupForm, parentId: e.target.value })}
              >
                {availableParents.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div>
              {isEditingGroup && (
                <button onClick={deleteGroup} className="text-sm px-3 py-1.5 border border-[var(--danger)] text-[var(--danger)] rounded-md flex items-center gap-1">
                  <Trash2 size={14} /> このグループを削除
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={cancelGroupForm} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md text-[var(--text)]">
                キャンセル
              </button>
              <button onClick={submitGroupForm} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md">
                {isEditingGroup ? "保存" : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-[var(--border)] rounded-md p-3 space-y-3">
        <p className="text-xs text-[var(--text-muted)]">仕様</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="サイズ"><input className={inputCls} value={form.size} onChange={set("size")} placeholder="A6" /></Field>
          <Field label="紙"><input className={inputCls} value={form.paper} onChange={set("paper")} placeholder="上質紙" /></Field>
          <Field label="斤量"><input className={inputCls} value={form.weight} onChange={set("weight")} placeholder="90kg" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="表面の色数">
            <select className={inputCls} value={form.colorFront} onChange={set("colorFront")}>
              <option value="0c">印刷なし(0c)</option><option value="1c">1色(1c)</option><option value="2c">2色(2c)</option><option value="4c">4色(4c)</option>
            </select>
          </Field>
          <Field label="裏面の色数">
            <select className={inputCls} value={form.colorBack} onChange={set("colorBack")}>
              <option value="0c">印刷なし(0c)＝片面</option><option value="1c">1色(1c)</option><option value="2c">2色(2c)</option><option value="4c">4色(4c)＝両面</option>
            </select>
          </Field>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">加工(複数可)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.processes.map((p, i) => (
              <span key={i} className="bg-[var(--paper)] rounded-md px-2 py-1 text-sm flex items-center gap-1">
                {p}
                <X size={13} className="cursor-pointer" onClick={() => removeProcess(i)} />
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={processInput}
              onChange={(e) => setProcessInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addProcess(); } }}
              placeholder="加工名を入力してEnterで追加"
            />
            <button onClick={addProcess} className="text-sm px-3 border border-[var(--border)] rounded-md">追加</button>
          </div>
        </div>
        <div className="bg-[var(--paper)] rounded-md px-3 py-2 text-sm">
          <span className="text-[var(--text-muted)] text-xs">仕様プレビュー：</span> <span className="font-medium">{specString(form)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="部数"><input type="number" className={inputCls} value={form.qty} onChange={set("qty")} /></Field>
        <Field label="金額(合計)"><input type="number" className={inputCls} value={form.amount} onChange={set("amount")} /></Field>
        <Field label="入稿先"><input className={inputCls} value={form.submitTo} onChange={set("submitTo")} placeholder="プリントパック" /></Field>
      </div>

      <div className="flex justify-between items-center pt-2">
        <div>
          {isEdit && (
            <button
              onClick={() => onDelete(form.id)}
              className="text-sm px-3 py-1.5 border border-[var(--danger)] text-[var(--danger)] rounded-md flex items-center gap-1"
            >
              <Trash2 size={14} /> この明細を削除
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md">キャンセル</button>
          <button
            onClick={() => onSave({ ...form, qty: Number(form.qty), amount: Number(form.amount) })}
            className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md"
          >
            {isEdit ? "保存" : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
