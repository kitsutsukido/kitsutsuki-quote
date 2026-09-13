import { useState } from "react";
import { Plus, ChevronRight, ChevronDown } from "lucide-react";

// ---------- サイドバー(ジャンル > 商品 > 案件の3階層、既存/新規タブ) ----------
export function Sidebar({ products, projects, selectedId, selectedProductId, view, setView, setSelectedId, onOpenProduct, onCreateNew }) {
  const [sideTab, setSideTab] = useState("existing"); // existing | new

  const genres = [];
  for (const prod of products) {
    if (!genres.includes(prod.genre)) genres.push(prod.genre);
  }

  const selectedProject = projects.find((p) => p.id === selectedId);
  const selectedProduct = selectedProject
    ? products.find((prod) => prod.id === selectedProject.productId)
    : null;

  const [openGenres, setOpenGenres] = useState(() => {
    const s = new Set();
    if (selectedProduct) s.add(selectedProduct.genre);
    return s;
  });
  const [openProducts, setOpenProducts] = useState(() => {
    const s = new Set();
    if (selectedProject) s.add(selectedProject.productId);
    return s;
  });

  const toggleGenre = (genre) => setOpenGenres((prev) => {
    const next = new Set(prev);
    next.has(genre) ? next.delete(genre) : next.add(genre);
    return next;
  });
  const toggleProduct = (id) => setOpenProducts((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] p-3">
      <button
        onClick={() => setView("dashboard")}
        className={`w-full text-left text-sm px-2 py-2 rounded-md mb-2 ${
          view === "dashboard" ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "text-[var(--text)] hover:bg-[var(--paper)]"
        }`}
      >
        ダッシュボード
      </button>
      <div className="flex gap-1 mb-3 border border-[var(--border)] rounded-md p-0.5 bg-[var(--paper)]">
        <button
          onClick={() => setSideTab("existing")}
          className={`flex-1 text-xs py-1.5 rounded ${sideTab === "existing" ? "bg-[var(--card)] shadow-sm text-[var(--ink)] font-medium" : "text-[var(--text-muted)]"}`}
        >
          既存の商品
        </button>
        <button
          onClick={() => setSideTab("new")}
          className={`flex-1 text-xs py-1.5 rounded ${sideTab === "new" ? "bg-[var(--card)] shadow-sm text-[var(--ink)] font-medium" : "text-[var(--text-muted)]"}`}
        >
          新規作成
        </button>
      </div>

      {sideTab === "existing" ? (
        <div>
          {genres.map((genre) => {
            const genreProducts = products.filter((prod) => prod.genre === genre);
            const isGenreOpen = openGenres.has(genre);
            return (
              <div key={genre} className="mb-1">
                <button
                  onClick={() => toggleGenre(genre)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--paper)] rounded-md"
                >
                  <span className="truncate">{genre}</span>
                  {isGenreOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                </button>
                {isGenreOpen && (
                  <div className="ml-2 border-l border-[var(--border)] pl-2">
                    {genreProducts.map((prod) => {
                      const productProjects = projects.filter((p) => p.productId === prod.id);
                      const isProductOpen = openProducts.has(prod.id);
                      return (
                        <div key={prod.id} className="mb-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onOpenProduct(prod.id)}
                              className={`flex-1 min-w-0 px-2 py-1.5 text-sm rounded-md text-left ${
                                view === "productOverview" && selectedProductId === prod.id
                                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                                  : "text-[var(--text)] hover:bg-[var(--paper)]"
                              }`}
                            >
                              <span className="truncate block">{prod.name}</span>
                            </button>
                            <button
                              onClick={() => toggleProduct(prod.id)}
                              title={isProductOpen ? "折りたたむ" : "展開する"}
                              className="shrink-0 p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--paper)]"
                            >
                              {isProductOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>
                          {isProductOpen && (
                            <div className="ml-2 border-l border-[var(--border)] pl-2">
                              {productProjects.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => { setSelectedId(p.id); setView("project"); }}
                                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md flex items-center justify-between mb-0.5 ${
                                    p.id === selectedId && view === "project" ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "text-[var(--text)] hover:bg-[var(--paper)]"
                                  }`}
                                >
                                  <span className="truncate">{p.round}</span>
                                  <span className={`text-[11px] ml-2 shrink-0 ${p.status === "完了" ? "text-[var(--text-muted)]" : "text-[var(--accent)]"}`}>{p.status}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-1 space-y-2">
          <p className="text-xs text-[var(--text-muted)]">既存の商品に新しい印刷ロットを追加するか、まったく新しい商品を作成します。</p>
          <button onClick={onCreateNew} className="w-full text-sm px-3 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center justify-center gap-1">
            <Plus size={14} /> 新規案件を作成
          </button>
        </div>
      )}
    </aside>
  );
}
