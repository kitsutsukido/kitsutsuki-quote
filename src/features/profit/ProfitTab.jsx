import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Chip } from "../../components/common/Chip.jsx";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { computeBreakeven } from "../../lib/breakeven.js";
import { feesOf, patternFee, materializePattern, withLegacyFields } from "../../lib/profitFees.js";

// ---------- 収支設定・損益分岐点タブ ----------
export function ProfitTab({ project, sessions, lineItems, settings, setSettings, patterns, setPatterns }) {
  const confirmedIds = sessions.filter((s) => s.projectId === project.id && s.status === "確定").map((s) => s.id);
  const costTotal = lineItems.filter((it) => confirmedIds.includes(it.sessionId)).reduce((s, it) => s + it.amount, 0);
  const s = settings[project.id] || { price: 0, taxRate: 10 };
  const projectPatterns = patterns.filter((p) => p.projectId === project.id);
  const fees = feesOf(s, projectPatterns);
  const [activePatternId, setActivePatternId] = useState(projectPatterns[0]?.id);
  const activePattern = projectPatterns.find((p) => p.id === activePatternId) || projectPatterns[0];

  // 収支設定を保存する。項目を変えるときは、旧形式のパターンも新しい形式に書き出しておく(読み替えがずれないように)
  const saveSettings = (next) => setSettings((prev) => ({ ...prev, [project.id]: withLegacyFields({ ...s, fees, ...next }) }));
  const materializeAll = (feeList, extra = (p) => p) =>
    setPatterns((prev) => prev.map((p) => (p.projectId === project.id ? extra(p.use ? p : materializePattern(p, feeList)) : p)));
  const setPrice = (e) => saveSettings({ price: Number(e.target.value) });
  const updateFee = (id, fields) => {
    materializeAll(fees);
    saveSettings({ fees: fees.map((f) => (f.id === id ? { ...f, ...fields } : f)) });
  };
  const addFee = () => {
    const id = `fee-${Date.now()}`;
    const next = [...fees, { id, name: "新しい項目", kind: "rate", value: 0 }];
    // 追加した項目は、どのパターンでも最初は「使う」にする
    materializeAll(fees, (p) => ({ ...p, use: { ...p.use, [id]: true } }));
    saveSettings({ fees: next });
  };
  // 並べ替え(上へ・下へ)。並び順は損益の計算には影響しない
  const moveFee = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= fees.length) return;
    const next = [...fees];
    [next[i], next[j]] = [next[j], next[i]];
    materializeAll(fees);
    saveSettings({ fees: next });
  };
  const removeFee = (f) => {
    if (!window.confirm(`「${f.name}」を削除しますか？(販売パターンの設定からも外れます)`)) return;
    materializeAll(fees, (p) => {
      const use = { ...p.use };
      const overrides = { ...p.overrides };
      delete use[f.id];
      delete overrides[f.id];
      return { ...p, use, overrides };
    });
    saveSettings({ fees: fees.filter((x) => x.id !== f.id) });
  };

  const updatePattern = (id, fields) =>
    setPatterns((prev) => prev.map((p) => (p.id === id ? { ...(p.use ? p : materializePattern(p, fees)), ...fields } : p)));
  const setPatternUse = (p, feeId, on) => {
    const base = p.use ? p : materializePattern(p, fees);
    updatePattern(p.id, { use: { ...base.use, [feeId]: on } });
  };
  const setPatternOverride = (p, feeId, v) => {
    const base = p.use ? p : materializePattern(p, fees);
    const overrides = { ...base.overrides };
    if (v === "") delete overrides[feeId];
    else overrides[feeId] = Number(v);
    updatePattern(p.id, { overrides });
  };
  const removePattern = (id) => setPatterns((prev) => prev.filter((p) => p.id !== id));
  const addPattern = () => {
    const id = `pp-${Date.now()}`;
    // 新しいパターンは、全部の項目を「使う」で始める
    setPatterns((prev) => [...prev, { id, projectId: project.id, name: "新しいパターン", use: Object.fromEntries(fees.map((f) => [f.id, true])), overrides: {} }]);
    setActivePatternId(id);
  };
  const unit = (f) => (f.kind === "yen" ? "円/部" : "%");

  const volumes = [200, 400, 600, 800, 1000, 1200];
  const rows = activePattern ? computeBreakeven(costTotal, project.qty, s, activePattern, volumes, fees) : [];

  return (
    <div className="space-y-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <p className="text-sm font-medium text-[var(--ink)] mb-3">収支設定</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Field label="販売価格(税込)"><input type="number" className={inputCls} value={s.price} onChange={setPrice} /></Field>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-1">手数料・分配の項目(名前・種類・値を変えられます。販売パターンで使う項目を選びます)</p>
        <div className="space-y-2">
          {fees.map((f, i) => (
            <div key={f.id} className="flex flex-wrap items-center gap-2">
              <span className="flex flex-col">
                <button onClick={() => moveFee(i, -1)} disabled={i === 0} title="上へ" className="text-[var(--text-muted)] disabled:opacity-30"><ChevronUp size={14} /></button>
                <button onClick={() => moveFee(i, 1)} disabled={i === fees.length - 1} title="下へ" className="text-[var(--text-muted)] disabled:opacity-30"><ChevronDown size={14} /></button>
              </span>
              <input className={`${inputCls} !w-48`} value={f.name} onChange={(e) => updateFee(f.id, { name: e.target.value })} aria-label="項目名" />
              <select className="border border-[var(--border)] rounded-md px-2 py-1.5 text-sm bg-[var(--card)]" value={f.kind} onChange={(e) => updateFee(f.id, { kind: e.target.value })}>
                <option value="rate">売上の%</option>
                <option value="yen">1部あたり円</option>
              </select>
              <input type="number" className={`${inputCls} !w-28`} value={f.value} onChange={(e) => updateFee(f.id, { value: e.target.value === "" ? 0 : Number(e.target.value) })} aria-label="値" />
              <span className="text-xs text-[var(--text-muted)]">{unit(f)}</span>
              <button onClick={() => removeFee(f)} className="text-[var(--danger)]" title="この項目を削除"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button onClick={addFee} className="mt-2 text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]">
          <Plus size={14} /> 項目を追加
        </button>
        <p className="text-xs text-[var(--text-muted)] mt-2">確定見積もりの経費合計：<span className="font-mono">{costTotal.toLocaleString()}円</span>(基準{project.qty}部)</p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-[var(--ink)]">販売パターン</p>
          <button onClick={addPattern} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]">
            <Plus size={14} /> パターンを追加
          </button>
        </div>
        <div className="space-y-2">
          {projectPatterns.map((p) => (
            <div key={p.id} className="border border-[var(--border)] rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <input className="text-sm font-medium border-b border-transparent hover:border-[var(--border)] focus:border-[var(--ink-soft)] outline-none"
                  value={p.name} onChange={(e) => updatePattern(p.id, { name: e.target.value })} />
                <button onClick={() => removePattern(p.id)} className="text-[var(--danger)]"><Trash2 size={15} /></button>
              </div>
              <div className="space-y-1.5">
                {fees.map((f) => {
                  const { on, override } = patternFee(p, f);
                  return (
                    <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <label className="flex items-center gap-1.5 min-w-[11rem]">
                        <input type="checkbox" checked={on} onChange={(e) => setPatternUse(p, f.id, e.target.checked)} />
                        {f.name}
                      </label>
                      {on && (
                        <>
                          <input type="number" className={`${inputCls} !w-24`} value={override ?? ""} placeholder={String(f.value)}
                            onChange={(e) => setPatternOverride(p, f.id, e.target.value)} />
                          <span className="text-xs text-[var(--text-muted)]">{unit(f)}(空欄=収支設定の{f.value}{unit(f)})</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-[var(--ink)]">損益分岐点表</p>
          <div className="flex gap-2 flex-wrap">
            {projectPatterns.map((p) => (
              <Chip key={p.id} active={p.id === activePatternId} onClick={() => setActivePatternId(p.id)}>{p.name}</Chip>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border)] text-left">
              <th className="py-2 font-normal">販売数</th>
              <th className="py-2 font-normal text-right">売上</th>
              <th className="py-2 font-normal text-right">手数料計</th>
              <th className="py-2 font-normal text-right">利益</th>
              <th className="py-2 font-normal text-right">利益率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vol} className="border-b border-[var(--border)] last:border-0">
                <td className="py-1.5 font-mono">{r.vol}部</td>
                <td className="py-1.5 text-right font-mono">{Math.round(r.revenue).toLocaleString()}円</td>
                <td className="py-1.5 text-right font-mono">{Math.round(r.fees).toLocaleString()}円</td>
                <td className={`py-1.5 text-right font-mono ${r.profit < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{Math.round(r.profit).toLocaleString()}円</td>
                <td className="py-1.5 text-right font-mono">{(r.margin * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
