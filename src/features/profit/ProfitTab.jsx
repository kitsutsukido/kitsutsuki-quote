import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Chip } from "../../components/common/Chip.jsx";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { computeBreakeven } from "../../lib/breakeven.js";

// ---------- 収支設定・損益分岐点タブ ----------
export function ProfitTab({ project, sessions, lineItems, settings, setSettings, patterns, setPatterns }) {
  const confirmedIds = sessions.filter((s) => s.projectId === project.id && s.status === "確定").map((s) => s.id);
  const costTotal = lineItems.filter((it) => confirmedIds.includes(it.sessionId)).reduce((s, it) => s + it.amount, 0);
  const s = settings[project.id] || { price: 0, facilityRate: 0, localSalesRate: 0, royaltyRate: 0, taxRate: 10 };
  const projectPatterns = patterns.filter((p) => p.projectId === project.id);
  const [activePatternId, setActivePatternId] = useState(projectPatterns[0]?.id);
  const activePattern = projectPatterns.find((p) => p.id === activePatternId) || projectPatterns[0];

  const setS = (k) => (e) => setSettings((prev) => ({ ...prev, [project.id]: { ...s, [k]: Number(e.target.value) } }));
  const updatePattern = (id, fields) => setPatterns((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  const removePattern = (id) => setPatterns((prev) => prev.filter((p) => p.id !== id));
  const addPattern = () => {
    const id = `pp-${Date.now()}`;
    setPatterns((prev) => [...prev, { id, projectId: project.id, name: "新しいパターン", consignRate: 30, shopRate: null, shopFixed: null }]);
    setActivePatternId(id);
  };

  const volumes = [200, 400, 600, 800, 1000, 1200];
  const rows = activePattern ? computeBreakeven(costTotal, project.qty, s, activePattern, volumes) : [];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <p className="text-sm font-medium mb-3">収支設定</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label="販売価格(税込)"><input type="number" className={inputCls} value={s.price} onChange={setS("price")} /></Field>
          <Field label="施設分配率(%)"><input type="number" className={inputCls} value={s.facilityRate} onChange={setS("facilityRate")} /></Field>
          <Field label="現地販売分配率(%)"><input type="number" className={inputCls} value={s.localSalesRate} onChange={setS("localSalesRate")} /></Field>
          <Field label="版権料率(%)"><input type="number" className={inputCls} value={s.royaltyRate} onChange={setS("royaltyRate")} /></Field>
        </div>
        <p className="text-xs text-stone-400 mt-2">確定見積もりの経費合計：{costTotal.toLocaleString()}円(基準{project.qty}部)</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium">販売パターン</p>
          <button onClick={addPattern} className="text-sm px-3 py-1.5 border border-stone-300 rounded-md flex items-center gap-1 text-stone-600">
            <Plus size={14} /> パターンを追加
          </button>
        </div>
        <div className="space-y-2">
          {projectPatterns.map((p) => (
            <div key={p.id} className="border border-stone-200 rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <input className="text-sm font-medium border-b border-transparent hover:border-stone-300 focus:border-stone-400 outline-none"
                  value={p.name} onChange={(e) => updatePattern(p.id, { name: e.target.value })} />
                <button onClick={() => removePattern(p.id)} className="text-rose-500"><Trash2 size={15} /></button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="委託販売手数料率(%)">
                  <input type="number" className={inputCls} value={p.consignRate ?? ""} placeholder="空欄=対象外"
                    onChange={(e) => updatePattern(p.id, { consignRate: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
                <Field label="ショップ手数料率(%)">
                  <input type="number" className={inputCls} value={p.shopRate ?? ""} placeholder="空欄=対象外"
                    onChange={(e) => updatePattern(p.id, { shopRate: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
                <Field label="ショップ手数料固定額">
                  <input type="number" className={inputCls} value={p.shopFixed ?? ""} placeholder="空欄=対象外"
                    onChange={(e) => updatePattern(p.id, { shopFixed: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium">損益分岐点表</p>
          <div className="flex gap-2 flex-wrap">
            {projectPatterns.map((p) => (
              <Chip key={p.id} active={p.id === activePatternId} onClick={() => setActivePatternId(p.id)}>{p.name}</Chip>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-stone-500 border-b border-stone-200 text-left">
              <th className="py-2 font-normal">販売数</th>
              <th className="py-2 font-normal text-right">売上</th>
              <th className="py-2 font-normal text-right">手数料計</th>
              <th className="py-2 font-normal text-right">利益</th>
              <th className="py-2 font-normal text-right">利益率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vol} className="border-b border-stone-100 last:border-0">
                <td className="py-1.5">{r.vol}部</td>
                <td className="py-1.5 text-right">{Math.round(r.revenue).toLocaleString()}円</td>
                <td className="py-1.5 text-right">{Math.round(r.fees).toLocaleString()}円</td>
                <td className={`py-1.5 text-right ${r.profit < 0 ? "text-rose-600" : "text-emerald-700"}`}>{Math.round(r.profit).toLocaleString()}円</td>
                <td className="py-1.5 text-right">{(r.margin * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
