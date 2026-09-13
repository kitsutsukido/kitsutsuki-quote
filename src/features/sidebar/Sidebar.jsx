import { useState } from "react";
import { Plus, ChevronRight, ChevronDown } from "lucide-react";

// ---------- サイドバー(商品ごとにグループ化、既存/新規タブ) ----------
export function Sidebar({ products, projects, selectedId, view, setView, setSelectedId, onCreateNew }) {
  const [sideTab, setSideTab] = useState("existing"); // existing | new
  const [openProducts, setOpenProducts] = useState(() => {
    const s = new Set();
    const selProj = projects.find((p) => p.id === selectedId);
    if (selProj) s.add(selProj.productId);
    return s;
  });
  const toggleProduct = (id) => setOpenProducts((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <aside className="w-64 border-r border-stone-200 bg-white p-3">
      <button
        onClick={() => setView("dashboard")}
        className={`w-full text-left text-sm px-2 py-2 rounded-md mb-2 ${
          view === "dashboard" ? "bg-emerald-50 text-emerald-800 font-medium" : "text-stone-600 hover:bg-stone-100"
        }`}
      >
        ダッシュボード
      </button>
      <div className="flex gap-1 mb-3 border border-stone-200 rounded-md p-0.5 bg-stone-50">
        <button
          onClick={() => setSideTab("existing")}
          className={`flex-1 text-xs py-1.5 rounded ${sideTab === "existing" ? "bg-white shadow-sm text-stone-800 font-medium" : "text-stone-500"}`}
        >
          既存の案件
        </button>
        <button
          onClick={() => setSideTab("new")}
          className={`flex-1 text-xs py-1.5 rounded ${sideTab === "new" ? "bg-white shadow-sm text-stone-800 font-medium" : "text-stone-500"}`}
        >
          新規作成
        </button>
      </div>

      {sideTab === "existing" ? (
        <div>
          {products.map((prod) => {
            const productProjects = projects.filter((p) => p.productId === prod.id);
            const isOpen = openProducts.has(prod.id);
            return (
              <div key={prod.id} className="mb-1">
                <button
                  onClick={() => toggleProduct(prod.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100 rounded-md"
                >
                  <span className="truncate">{prod.name}</span>
                  {isOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                </button>
                {isOpen && (
                  <div className="ml-2 border-l border-stone-200 pl-2">
                    {productProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedId(p.id); setView("project"); }}
                        className={`w-full text-left text-sm px-2 py-1.5 rounded-md flex items-center justify-between mb-0.5 ${
                          p.id === selectedId && view === "project" ? "bg-emerald-50 text-emerald-800 font-medium" : "text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        <span className="truncate">{p.round}</span>
                        <span className={`text-[11px] ml-2 shrink-0 ${p.status === "完了" ? "text-stone-400" : "text-emerald-700"}`}>{p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-1 space-y-2">
          <p className="text-xs text-stone-500">既存の商品に新しい印刷ロットを追加するか、まったく新しい商品を作成します。</p>
          <button onClick={onCreateNew} className="w-full text-sm px-3 py-2 border border-emerald-700 text-emerald-800 rounded-md flex items-center justify-center gap-1">
            <Plus size={14} /> 新規案件を作成
          </button>
        </div>
      )}
    </aside>
  );
}
