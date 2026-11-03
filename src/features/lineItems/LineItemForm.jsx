import { useState } from "react";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { Chip } from "../../components/common/Chip.jsx";
import { specString, isMaterial, isAssembly, KIND_PRINT, KIND_MATERIAL, KIND_ASSEMBLY } from "../../lib/spec.js";
import { VendorPicker } from "./VendorPicker.jsx";
import { createLineItem } from "../../data/seedData.js";
import { flattenGroupTree, selfAndDescendantIds, selectableParents } from "../../lib/groupTree.js";

const groupFormDefaults = { name: "", parentId: "" };

// ---------- 明細追加/編集フォーム ----------
export function LineItemForm({ groups, productId, setGroups, lineItems, setLineItems, onCancel, onSave, onDelete, sessionId, initial }) {
  const [form, setForm] = useState(initial ? { ...initial } : createLineItem({ sessionId, groupId: groups[0]?.id || null }));
  const [processInput, setProcessInput] = useState("");
  const [groupFormTarget, setGroupFormTarget] = useState(null); // null=非表示 / "new"=新規追加 / それ以外=編集中のグループid
  const [groupForm, setGroupForm] = useState(groupFormDefaults);
  const isEdit = !!initial;
  const isEditingGroup = groupFormTarget && groupFormTarget !== "new";

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // まとめ買い(例:OPP袋を2,500枚 ¥2,500で買い、この明細では500枚使う)から金額を出す。
  // 買った数量・買った金額の両方が入っているときだけ、金額(合計) = 買った金額 ÷ 買った数量 × 数量(円未満四捨五入)。
  const bulkAmountFor = (f) => {
    const bq = Number(f.bulkQty);
    const ba = Number(f.bulkAmount);
    const q = Number(f.qty);
    if (!(bq > 0) || !(ba >= 0) || f.bulkAmount === "" || f.bulkAmount == null) return null;
    return Math.round((ba / bq) * (q || 0));
  };
  // 数量・買った数量・買った金額のどれかを変えたら、金額(合計)を計算し直す
  const setWithBulk = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    const amt = bulkAmountFor(next);
    if (amt !== null) next.amount = amt;
    setForm(next);
  };
  const bulkUnit = Number(form.bulkQty) > 0 && form.bulkAmount !== "" && form.bulkAmount != null ? Number(form.bulkAmount) / Number(form.bulkQty) : null;

  const material = isMaterial(form);
  const assembly = isAssembly(form);
  const printKind = !material && !assembly;
  const anySide = (form.colorFront || "").endsWith("*"); // 「面の指定なし」(クリアファイルなど)
  // 表面の色数を変える。「面の指定なし」を選ぶと裏面は選べなくなる(空)。戻したら裏面は片面(0c)に
  const setFront = (e) => {
    const v = e.target.value;
    const next = { ...form, colorFront: v };
    if (v.endsWith("*")) next.colorBack = "";
    else if (anySide || next.colorBack === "") next.colorBack = "0c";
    setForm(next);
  };

  const openNewGroupForm = () => {
    setGroupForm(groupFormDefaults);
    setGroupFormTarget("new");
  };
  const openEditGroupForm = (group) => {
    setGroupForm({
      name: group.name,
      parentId: group.parentId || "",
    });
    setGroupFormTarget(group.id);
  };
  const cancelGroupForm = () => setGroupFormTarget(null);

  const parentOptions = selectableParents(groups, isEditingGroup ? groupFormTarget : null);

  const submitGroupForm = () => {
    const name = groupForm.name.trim();
    if (!name) return;
    const parentId = groupForm.parentId || null;
    if (isEditingGroup) {
      setGroups((prev) => prev.map((g) => (g.id === groupFormTarget ? { ...g, name, parentId } : g)));
    } else {
      const newGroup = { id: `grp-${Date.now()}`, productId, name, parentId };
      setGroups((prev) => [...prev, newGroup]);
      setForm({ ...form, groupId: newGroup.id });
    }
    setGroupFormTarget(null);
  };

  const deleteGroup = () => {
    const group = groups.find((g) => g.id === groupFormTarget);
    if (!group) return;
    const idsToDelete = selfAndDescendantIds(groups, group.id);
    const childGroups = groups.filter((g) => idsToDelete.includes(g.id) && g.id !== group.id);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="梱包グループ">
          <div className="flex flex-wrap gap-2">
            <select
              className={`${inputCls} w-full min-w-0`}
              value={form.groupId || ""}
              onChange={(e) => setForm({ ...form, groupId: e.target.value || null })}
            >
              <option value="">(グループなし)</option>
              {flattenGroupTree(groups).map(({ group: g, depth }) => (
                <option key={g.id} value={g.id}>
                  {"\u00A0".repeat(depth * 2)}{depth > 0 ? "└" : ""}{g.name}
                </option>
              ))}
            </select>
            {form.groupId && groups.some((g) => g.id === form.groupId) && (
              <button
                type="button"
                onClick={() => openEditGroupForm(groups.find((g) => g.id === form.groupId))}
                title="選んでいるグループを編集"
                className="px-2.5 py-1.5 border border-[var(--border)] rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]"
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={openNewGroupForm}
              title="新しいグループを作る"
              className="text-sm px-3 py-1.5 rounded-md border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center gap-1 shrink-0"
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
          <Field label="入れる先(親グループ)">
            <select
              className={inputCls}
              value={groupForm.parentId}
              onChange={(e) => setGroupForm({ ...groupForm, parentId: e.target.value })}
            >
              <option value="">(最上位の梱包にする)</option>
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </Field>
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

      <div>
        <label className="text-xs text-[var(--text-muted)] block mb-1">種別</label>
        <div className="flex flex-wrap gap-2">
          <Chip active={printKind} onClick={() => setForm({ ...form, kind: KIND_PRINT })}>印刷物</Chip>
          <Chip active={material} onClick={() => setForm({ ...form, kind: KIND_MATERIAL })}>資材(OPP袋・ダンボールなど)</Chip>
          <Chip active={assembly} onClick={() => setForm({ ...form, kind: KIND_ASSEMBLY })}>内職・加工(アッセンブリ・袋詰めなど)</Chip>
        </div>
      </div>

      <div className="border border-[var(--border)] rounded-md p-3 space-y-3">
        <p className="text-xs text-[var(--text-muted)]">仕様</p>
        {material && (
          <>
            <Field label="商品名"><input className={inputCls} value={form.size} onChange={set("size")} placeholder="例：SWAN OPP袋 ピュアパック T16-22.5(A5用)" /></Field>
            <Field label="備考"><input className={inputCls} value={form.note || ""} onChange={set("note")} placeholder="例：本体テープ付き・100枚入×5パック" /></Field>
          </>
        )}
        {assembly && (
          <>
            <Field label="作業内容"><input className={inputCls} value={form.size} onChange={set("size")} placeholder="例：アッセンブリ(19点)・袋詰め" /></Field>
            <Field label="備考"><input className={inputCls} value={form.note || ""} onChange={set("note")} placeholder="例：1セットあたりの単価・作業の注意" /></Field>
          </>
        )}
        {printKind && (
        <>
        <div className="grid grid-cols-3 gap-3">
          <Field label="サイズ"><input className={inputCls} value={form.size} onChange={set("size")} placeholder="A6" /></Field>
          <Field label="紙"><input className={inputCls} value={form.paper} onChange={set("paper")} placeholder="上質紙" /></Field>
          <Field label="斤量"><input className={inputCls} value={form.weight} onChange={set("weight")} placeholder="90kg" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={anySide ? "印刷の色数" : "表面の色数"}>
            <select className={inputCls} value={form.colorFront} onChange={setFront}>
              {form.colorFront === "" && <option value="">(未選択)</option>}
              <option value="0c">印刷なし(0c)</option><option value="1c">1色(1c)</option><option value="2c">2色(2c)</option><option value="4c">4色(4c)</option>
              <option value="1c*">1色(面の指定なし)</option><option value="2c*">2色(面の指定なし)</option><option value="4c*">4色(面の指定なし)</option>
            </select>
          </Field>
          <Field label="裏面の色数">
            <select className={inputCls} value={anySide ? "" : form.colorBack} onChange={set("colorBack")} disabled={anySide}>
              {anySide && <option value="">― (面の指定なし)</option>}
              <option value="0c">印刷なし(0c)＝片面</option><option value="1c">1色(1c)</option><option value="2c">2色(2c)</option><option value="4c">4色(4c)＝両面</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="紙の色(複数ならまとめて記入)"><input className={inputCls} value={form.paperColor || ""} onChange={set("paperColor")} placeholder="例：ホワイト、ピンク" /></Field>
          <Field label="インクの色(複数ならまとめて記入)"><input className={inputCls} value={form.inkColor || ""} onChange={set("inkColor")} placeholder="例：黒、赤" /></Field>
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
            <button onClick={addProcess} className="text-sm px-3 shrink-0 whitespace-nowrap border border-[var(--border)] rounded-md">追加</button>
          </div>
        </div>
        <Field label="折り後のサイズ(折りがあるとき)"><input className={inputCls} value={form.foldedSize || ""} onChange={set("foldedSize")} placeholder="例：A6、90×55mm" /></Field>
        </>
        )}
        <div className="bg-[var(--paper)] rounded-md px-3 py-2 text-sm">
          <span className="text-[var(--text-muted)] text-xs">仕様プレビュー：</span> <span className="font-medium">{specString(form)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={printKind ? "部数" : "数量"}><input type="number" className={inputCls} value={form.qty} onChange={setWithBulk("qty")} /></Field>
        <Field label="金額(合計)"><input type="number" className={inputCls} value={form.amount} onChange={set("amount")} /></Field>
        <Field label={material ? "購入場所" : assembly ? "依頼先" : "印刷場所"}>
          <VendorPicker value={form.submitTo} onChange={(v) => setForm((f) => ({ ...f, submitTo: v }))} placeholder={material ? "シモジマ" : assembly ? "内職市場" : "プリントパック"} lineItems={lineItems} kind={material ? KIND_MATERIAL : assembly ? KIND_ASSEMBLY : KIND_PRINT} />
        </Field>
      </div>

      {(material || printKind) && (
        <div className="border border-[var(--border)] rounded-md p-3 space-y-2">
          <p className="text-xs text-[var(--text)]">
            {material
              ? "まとめ買いのとき(任意):買った数量と金額を入れると、上の「数量」の分の金額を自動で出します(買った金額 ÷ 買った数量 × 数量、円未満は四捨五入)。"
              : "まとめて刷るとき(任意):例えば1,000部刷って、このロットでは500部使うとき。刷った部数と金額を入れ、上の「部数」をこのロットで使う部数にすると、その分の金額を自動で出します(刷った金額 ÷ 刷った部数 × 部数、円未満は四捨五入)。"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={material ? "買った数量" : "刷った部数"}><input type="number" className={inputCls} value={form.bulkQty ?? ""} onChange={setWithBulk("bulkQty")} placeholder={material ? "例：2500" : "例：1000"} /></Field>
            <Field label={material ? "買った金額(合計)" : "刷った金額(合計)"}><input type="number" className={inputCls} value={form.bulkAmount ?? ""} onChange={setWithBulk("bulkAmount")} placeholder={material ? "例：2500" : "例：4000"} /></Field>
          </div>
          {bulkUnit !== null && (
            <p className="text-xs text-[var(--text-muted)]">
              1つあたり ¥{bulkUnit.toLocaleString("ja-JP", { maximumFractionDigits: 2 })} × {Number(form.qty || 0).toLocaleString("ja-JP")} = ¥{(bulkAmountFor(form) ?? 0).toLocaleString("ja-JP")}
            </p>
          )}
        </div>
      )}

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
            onClick={() => {
              const out = { ...form, qty: Number(form.qty), amount: Number(form.amount) };
              // まとめ買いの欄は、両方入っているときだけ数値で残す(片方だけ・空なら消す)
              if (Number(form.bulkQty) > 0 && form.bulkAmount !== "" && form.bulkAmount != null) {
                out.bulkQty = Number(form.bulkQty);
                out.bulkAmount = Number(form.bulkAmount);
              } else {
                delete out.bulkQty;
                delete out.bulkAmount;
              }
              onSave(out);
            }}
            className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md"
          >
            {isEdit ? "保存" : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
