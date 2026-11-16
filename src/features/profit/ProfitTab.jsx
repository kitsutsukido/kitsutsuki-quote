import { useState } from "react";
import { Chip } from "../../components/common/Chip.jsx";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { FeePatternEditor } from "./FeePatternEditor.jsx";
import { computeBreakeven, breakevenQty } from "../../lib/breakeven.js";
import { withLegacyFields } from "../../lib/profitFees.js";
import { resolveLotProfit, hasMaster, lotFromMaster, toMasterSettings } from "../../lib/profitMaster.js";

// ---------- 収支設定・損益分岐点タブ ----------
// 手数料・分配の項目と販売パターンは、マスタを使うロットならマスタの設定(ここでは見るだけ)、
// 「このロットだけ変える」にしたロット(またはマスタを作る前)はロットの設定を使う。販売価格はロットごと。
export function ProfitTab({ project, sessions, lineItems, settings, setSettings, patterns, setPatterns, master, onOpenMaster }) {
  const confirmedIds = sessions.filter((s) => s.projectId === project.id && s.status === "確定").map((s) => s.id);
  const costTotal = lineItems.filter((it) => confirmedIds.includes(it.sessionId)).reduce((s, it) => s + it.amount, 0);
  const { s, fees, patterns: projectPatterns, fromMaster } = resolveLotProfit(project.id, settings, patterns, master);
  const [activePatternId, setActivePatternId] = useState(projectPatterns[0]?.id);
  const activePattern = projectPatterns.find((p) => p.id === activePatternId) || projectPatterns[0];
  const masterReady = hasMaster(master);

  const patchSettings = (fn) => setSettings((prev) => ({ ...prev, [project.id]: fn(prev[project.id] || { price: 0, taxRate: 10 }) }));
  const setPrice = (e) => patchSettings((x) => ({ ...x, price: Number(e.target.value) }));

  // このロットの項目・パターンを保存する(パターンは全ロットで1つの配列なので、このロットの分だけ置き換える)
  const saveLot = (nextFees, nextPatterns) => {
    patchSettings((x) => withLegacyFields({ ...x, fees: nextFees }));
    setPatterns((prev) => {
      const out = [];
      let placed = false;
      for (const p of prev) {
        if (p.projectId !== project.id) out.push(p);
        else if (!placed) {
          out.push(...nextPatterns.map((x) => ({ ...x, projectId: project.id })));
          placed = true;
        }
      }
      if (!placed) out.push(...nextPatterns.map((x) => ({ ...x, projectId: project.id })));
      return out;
    });
  };

  // マスタ → このロットだけ変える:マスタの内容をこのロットにコピーして、ロットの設定として編集できるようにする
  const detach = () => {
    if (!window.confirm("このロットだけ、手数料・分配と販売パターンを変えられるようにします(今のマスタの内容をコピーします)。\nこのあとマスタを直しても、このロットには反映されません。よろしいですか？")) return;
    const copy = lotFromMaster(master, project.id);
    setSettings((prev) => ({ ...prev, [project.id]: withLegacyFields({ ...(prev[project.id] || { price: 0, taxRate: 10 }), fees: copy.fees, useMaster: false }) }));
    setPatterns((prev) => [...prev.filter((p) => p.projectId !== project.id), ...copy.patterns]);
  };
  // このロットの設定をやめてマスタを使う
  const attach = () => {
    if (!window.confirm("このロットの手数料・分配と販売パターンを消して、マスタの設定を使います。よろしいですか？")) return;
    setSettings((prev) => ({ ...prev, [project.id]: toMasterSettings(prev[project.id]) }));
    setPatterns((prev) => prev.filter((p) => p.projectId !== project.id));
  };
  const linkCls = "text-sm px-3 py-1.5 border border-[var(--border)] rounded-md text-[var(--text)] hover:border-[var(--accent)] whitespace-nowrap";

  // 100部きざみで、1,000部(刷った部数がそれより多ければその部数)まで
  const maxVol = Math.max(1000, Math.ceil((project.qty || 0) / 100) * 100);
  const volumes = Array.from({ length: maxVol / 100 }, (_, i) => (i + 1) * 100);
  const rows = activePattern ? computeBreakeven(costTotal, project.qty, s, activePattern, volumes, fees) : [];
  const beQty = activePattern ? breakevenQty(costTotal, s, activePattern, fees) : null;
  const firstPlus = rows.find((r) => r.profit >= 0)?.vol;

  return (
    <div className="space-y-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <p className="text-sm font-medium text-[var(--ink)] mb-3">収支設定</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Field label="販売価格(税込)"><input type="number" className={inputCls} value={s.price} onChange={setPrice} /></Field>
        </div>
        <div className={`rounded-md px-3 py-2 mb-3 flex flex-wrap items-center gap-2 text-sm ${!fromMaster && masterReady ? "bg-[var(--warn-soft)]" : "bg-[var(--paper)]"}`}>
          <span className="flex-1 min-w-[12rem]">
            {fromMaster
              ? "手数料・分配と販売パターンは、マスタの設定を使っています(直すときはマスタで。全ロットに反映されます)。"
              : masterReady
                ? "このロットだけの手数料・分配と販売パターンです(マスタを直しても反映されません)。"
                : "手数料・分配と販売パターンは、マスタにすると全ロットで共通にできます。"}
          </span>
          {onOpenMaster && <button onClick={onOpenMaster} className={linkCls}>マスタを開く</button>}
          {fromMaster && <button onClick={detach} className={linkCls}>このロットだけ変える</button>}
          {!fromMaster && masterReady && <button onClick={attach} className={linkCls}>マスタの設定に戻す</button>}
        </div>
        <FeePatternEditor key={fromMaster ? "master" : "lot"} fees={fees} patterns={projectPatterns} onChange={saveLot} readOnly={fromMaster} onAddPattern={setActivePatternId} />
        <p className="text-xs text-[var(--text-muted)] mt-3">確定見積もりの経費合計：<span className="font-mono">{costTotal.toLocaleString()}円</span>(基準{project.qty}部)</p>
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
        <p className="text-sm mb-2">
          {beQty === null ? (
            <span className="text-[var(--danger)]">1部売るごとに赤字が増えます(手数料・分配が販売価格以上)。</span>
          ) : (
            <>損益分岐点:<span className="font-mono font-medium">{beQty.toLocaleString()}部</span> 以上売れると黒字<span className="text-xs text-[var(--text-muted)]">(経費 {costTotal.toLocaleString()}円は何部売れても同じとして計算)</span></>
          )}
        </p>
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
              <tr key={r.vol} className={`border-b border-[var(--border)] last:border-0 ${r.vol === firstPlus ? "bg-[var(--success-soft)] font-medium" : ""}`}>
                <td className="py-1.5 font-mono">
                  {r.vol}部
                  {r.vol === firstPlus && <span className="ml-2 font-sans text-xs text-[var(--success)]">ここから黒字</span>}
                </td>
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
