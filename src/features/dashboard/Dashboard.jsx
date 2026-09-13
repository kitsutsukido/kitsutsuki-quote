import { projectStats } from "../../lib/projectStats.js";
import { APP_NAME } from "../../lib/constants.js";

// ---------- ダッシュボード ----------
export function Dashboard({ products, projects, sessions, lineItems, onOpen }) {
  const active = projects.filter((p) => p.status === "進行中");
  return (
    <div>
      <div className="mb-6 pb-4 border-b border-[var(--border)]">
        <p className="font-display text-2xl font-bold text-[var(--ink)]">{APP_NAME}</p>
      </div>

      <p className="text-lg font-medium mb-1 text-[var(--ink)]">ダッシュボード</p>
      <p className="text-sm text-[var(--text-muted)] mb-4">進行中の案件 {active.length}件</p>
      <div className="grid grid-cols-2 gap-3">
        {active.map((p) => {
          const product = products.find((prod) => prod.id === p.productId);
          const stats = projectStats(p, sessions, lineItems);
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="text-left bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition"
            >
              <p className="text-sm font-medium text-[var(--ink)]">{product.name}</p>
              <p className="text-xs text-[var(--text-muted)] mb-3">{p.round}</p>

              {!stats.hasConfirmed ? (
                <span className="text-xs bg-[var(--accent-soft)] text-[var(--accent)] rounded-md px-2 py-1">{stats.quoteStage}</span>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
                    <span>入稿進捗</span>
                    <span className="font-mono">{stats.submitted}/{stats.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${stats.total ? (stats.submitted / stats.total) * 100 : 0}%` }} />
                  </div>
                  {stats.overdue > 0 ? (
                    <span className="text-xs bg-[var(--danger-soft)] text-[var(--danger)] rounded-md px-2 py-1">予定日超過 {stats.overdue}件</span>
                  ) : (
                    <span className="text-xs bg-[var(--success-soft)] text-[var(--success)] rounded-md px-2 py-1">予定通り</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
