import { useState } from "react";
import { Plus } from "lucide-react";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { computeBreakeven } from "../../lib/breakeven.js";

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
export function ProductOverview({ product, projects, sessions, lineItems, settings, patterns, onOpenProject, registerLot }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ round: "", qty: "500" });

  const productProjects = projects.filter((p) => p.productId === product.id);
  const latest = findLatestConfirmedLot(product, projects, sessions);

  let unitPrice = null;
  let margin = null;
  if (latest) {
    const costTotal = lineItems
      .filter((it) => it.sessionId === latest.session.id)
      .reduce((sum, it) => sum + it.amount, 0);
    unitPrice = latest.project.qty ? costTotal / latest.project.qty : null;

    const s = settings[latest.project.id];
    const pattern = patterns.find((p) => p.projectId === latest.project.id);
    if (s && pattern) {
      const [row] = computeBreakeven(costTotal, latest.project.qty, s, pattern, [latest.project.qty]);
      margin = row.margin;
    }
  }

  const submit = () => {
    const round = form.round.trim();
    if (!round) return;
    registerLot(product.id, round, form.qty);
    setShowForm(false);
    setForm({ round: "", qty: "500" });
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
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">利益率</p>
          <p className="text-xl font-medium font-mono text-[var(--ink)]">
            {margin != null ? `${(margin * 100).toFixed(1)}%` : "―"}
          </p>
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

      <div className="grid grid-cols-2 gap-3">
        {productProjects.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpenProject(p.id)}
            className="text-left bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--ink)]">{p.round}</p>
              <span className={`text-[11px] shrink-0 ${p.status === "完了" ? "text-[var(--text-muted)]" : "text-[var(--accent)]"}`}>{p.status}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{p.qty}部</p>
          </button>
        ))}
      </div>
    </div>
  );
}
