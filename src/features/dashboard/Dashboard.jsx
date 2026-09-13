import { projectStats } from "../../lib/projectStats.js";

// ---------- ダッシュボード ----------
export function Dashboard({ series, projects, sessions, lineItems, onOpen }) {
  const active = projects.filter((p) => p.status === "進行中");
  return (
    <div>
      <p className="text-lg font-medium mb-1">ダッシュボード</p>
      <p className="text-sm text-stone-400 mb-4">進行中の案件 {active.length}件</p>
      <div className="grid grid-cols-2 gap-3">
        {active.map((p) => {
          const s = series.find((se) => se.id === p.seriesId);
          const stats = projectStats(p, sessions, lineItems);
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="text-left bg-white border border-stone-200 rounded-lg p-4 hover:border-emerald-400 transition"
            >
              <p className="text-sm font-medium text-stone-800">{s.name}</p>
              <p className="text-xs text-stone-400 mb-3">{p.round}</p>

              {!stats.hasConfirmed ? (
                <span className="text-xs bg-amber-50 text-amber-700 rounded-md px-2 py-1">{stats.quoteStage}</span>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                    <span>入稿進捗</span>
                    <span>{stats.submitted}/{stats.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${stats.total ? (stats.submitted / stats.total) * 100 : 0}%` }} />
                  </div>
                  {stats.overdue > 0 ? (
                    <span className="text-xs bg-rose-50 text-rose-700 rounded-md px-2 py-1">予定日超過 {stats.overdue}件</span>
                  ) : (
                    <span className="text-xs bg-emerald-50 text-emerald-700 rounded-md px-2 py-1">予定通り</span>
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
