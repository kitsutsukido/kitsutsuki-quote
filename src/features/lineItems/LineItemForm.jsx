import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Chip } from "../../components/common/Chip.jsx";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { specString } from "../../lib/spec.js";
import { createLineItem } from "../../data/seedData.js";

// ---------- 明細追加/編集フォーム ----------
export function LineItemForm({ groups, onCancel, onSave, onDelete, sessionId, initial }) {
  const [form, setForm] = useState(initial ? { ...initial } : createLineItem({ sessionId, groupId: groups[0]?.id || null }));
  const [processInput, setProcessInput] = useState("");
  const isEdit = !!initial;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
            {groups.map((g) => (
              <Chip key={g.id} active={form.groupId === g.id} onClick={() => setForm({ ...form, groupId: g.id })}>
                {g.name}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="名称">
          <input className={inputCls} value={form.name} onChange={set("name")} placeholder="例：封筒" />
        </Field>
      </div>

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
