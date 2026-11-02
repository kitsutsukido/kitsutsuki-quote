import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { computeBreakeven, breakevenQty } from "../../lib/breakeven.js";
import { feesOf } from "../../lib/profitFees.js";
import { GroupManager } from "./GroupManager.jsx";

// この商品の各案件のうち、確定見積もりを持つものの中から最新のものを探す
function findLatestConfirmedLot(product, projects, sessions) {
  const productProjects = projects.filter((p) => p.productId === product.id);
  const confirmedEntries = productProjects
    .map((project) => {
      const confirmedSession = sessions.find((s) => s.projectId === project.id && s.status === "確定");
      return confirmedSession ? { project, session: confirmedSession } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.session.date < b.session.date ? 1 : -1));
  return confirmedEntries[0] || null;
}

// ---------- 商品サマリー画面 ----------
export function ProductOverview({ product, projects, sessions, lineItems, setLineItems, groups, setGroups, settings, patterns, onOpenProject, registerLot, onDeleteLot }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ round: "", qty: "500", baseId: "" });

  const productProjects = projects.filter((p) => p.productId === product.id);
  const confirmedOptions = productProjects.flatMap((p) =>
    sessions
      .filter((s) => s.projectId === p.id && s.status === "確定")
      .map((s) => ({
        id: s.id,
        text: `${p.round} ${s.label}(${(s.date || "").slice(0, 7)}・${lineItems.filter((it) => it.sessionId === s.id).reduce((t, it) => t + it.amount, 0).toLocaleString()}円)`,
      }))
  );
  const latest = findLatestConfirmedLot(product, projects, sessions);

  let unitPrice = null;
  let margins = []; // 販売パターンごとの { name, margin, be }(刷った部数が全部売れたとき)
  if (latest) {
    const costTotal = lineItems
      .filter((it) => it.sessionId === latest.session.id)
      .reduce((sum, it) => sum + it.amount, 0);
    unitPrice = latest.project.qty ? costTotal / latest.project.qty : null;

    const s = settings[latest.project.id];
    const projectPatterns = patterns.filter((p) => p.projectId === latest.project.id);
    if (s && projectPatterns.length) {
      const fees = feesOf(s, projectPatterns);
      margins = projectPatterns.map((pattern) => {
        const [row] = computeBreakeven(costTotal, latest.project.qty, s, pattern, [latest.project.qty], fees);
        return { id: pattern.id, name: pattern.name, margin: row.margin, be: breakevenQty(costTotal, s, pattern, fees) };
      });
    }
  }

  // 累計の単価:確定見積もりがある全ロットの経費の合計 ÷ 印刷部数の合計
  const cumulative = productProjects.reduce(
    (acc, project) => {
      const conf = sessions.find((x) => x.projectId === project.id && x.status === "確定");
      if (!conf || !project.qty) return acc;
      const cost = lineItems.filter((it) => it.sessionId === conf.id).reduce((t, it) => t + it.amount, 0);
      return { cost: acc.cost + cost, qty: acc.qty + project.qty, lots: acc.lots + 1 };
    },
    { cost: 0, qty: 0, lots: 0 }
  );
  const cumulativeUnit = cumulative.qty ? cumulative.cost / cumulative.qty : null;

  const submit = () => {
    const round = form.round.trim();
    if (!round) return;
    registerLot(product.id, round, form.qty, form.baseId);
    setShowForm(false);
    setForm({ round: "", qty: "500", baseId: "" });
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-[var(--ink)]">{product.name}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">最新の単価</p>
          <p className="text-xl font-medium font-mono text-[var(--ink)]">
            {unitPrice != null ? `${unitPrice.toFixed(1)}円` : "―"}
          </p>
          {latest && <p className="text-[11px] text-[var(--text-muted)]">{latest.project.round}・{latest.project.qty}部</p>}
          <p className="text-xs text-[var(--text-muted)] mt-3 mb-1">累計の単価</p>
          <p className="text-lg font-medium font-mono text-[var(--ink)]">
            {cumulativeUnit != null ? `${cumulativeUnit.toFixed(1)}円` : "―"}
          </p>
          {cumulative.lots > 0 && (
            <p className="text-[11px] text-[var(--text-muted)]">
              {cumulative.lots}ロット・{cumulative.qty.toLocaleString()}部・経費 {cumulative.cost.toLocaleString()}円
            </p>
          )}
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">
            利益率(販売パターンごと)
            {latest && <span className="block">{latest.project.round}・{latest.project.qty}部が全部売れたとき</span>}
          </p>
          {margins.length === 0 ? (
            <p className="text-xl font-medium font-mono text-[var(--ink)]">―</p>
          ) : (
            <ul className="space-y-1">
              {margins.map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-[var(--text)] truncate">{m.name}</span>
                  <span className="shrink-0 text-right">
                    <span className={`font-mono font-medium ${m.margin < 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>{(m.margin * 100).toFixed(1)}%</span>
                    {m.be != null && <span className="block text-[10px] text-[var(--text-muted)]">{m.be.toLocaleString()}部で黒字</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--ink)]">ロット一覧</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1"
        >
          <Plus size={14} /> 増刷を登録
        </button>
      </div>

      {showForm && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3 max-w-sm">
          <Field label="ロット名">
            <input
              className={inputCls}
              placeholder="例：2026年12月ロット"
              value={form.round}
              onChange={(e) => setForm((f) => ({ ...f, round: e.target.value }))}
              autoFocus
            />
          </Field>
          <Field label="印刷部数">
            <input
              type="number"
              className={inputCls}
              value={form.qty}
              onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
            />
          </Field>
          <Field label="金額のもとにする確定見積もり">
            <select className={inputCls} value={form.baseId} onChange={(e) => setForm((f) => ({ ...f, baseId: e.target.value }))}>
              <option value="">(使わない・空から作る)</option>
              {confirmedOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.text}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)] mt-1">選ぶと、その明細をコピーした確定見積もりが新ロットに作られます。あとで自由に直せます。</p>
          </Field>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md text-[var(--text)]">
              キャンセル
            </button>
            <button onClick={submit} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md">
              登録
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {productProjects.map((p) => (
          <div key={p.id} className="relative">
            <button
              onClick={() => onOpenProject(p.id)}
              className="w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 pr-11 hover:border-[var(--accent)] transition"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--ink)]">{p.round}</p>
                <span className={`text-[11px] shrink-0 ${p.status === "完了" ? "text-[var(--text-muted)]" : "text-[var(--accent)]"}`}>{p.status}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{p.qty}部</p>
            </button>
            {onDeleteLot && (
              <button
                onClick={() => onDeleteLot(p)}
                title="このロットを削除"
                className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--paper)]"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <GroupManager productId={product.id} groups={groups} setGroups={setGroups} lineItems={lineItems} setLineItems={setLineItems} />
    </div>
  );
}
