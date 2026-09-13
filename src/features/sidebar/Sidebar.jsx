import { useState } from "react";
import { Plus, ChevronRight, ChevronDown } from "lucide-react";

// ---------- サイドバー(ジャンル > 商品 > 案件の3階層、既存/新規タブ) ----------
export function Sidebar({ products, projects, setProjects, selectedId, view, setView, setSelectedId, onCreateNew }) {
  const [sideTab, setSideTab] = useState("existing"); // existing | new
  const [lotFormProductId, setLotFormProductId] = useState(null);
  const [lotForm, setLotForm] = useState({ round: "", qty: "500" });

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

  const openLotForm = (productId) => {
    setLotFormProductId(productId);
    setLotForm({ round: "", qty: "500" });
  };
  const cancelLotForm = () => setLotFormProductId(null);

  const submitLotForm = (product) => {
    const round = lotForm.round.trim();
    if (!round) return;
    const newProject = {
      id: `prj-${Date.now()}`,
      productId: product.id,
      round,
      qty: Number(lotForm.qty) || 0,
      status: "進行中",
    };
    setProjects((prev) => [...prev, newProject]);
    setOpenProducts((prev) => new Set(prev).add(product.id));
    setLotFormProductId(null);
    setSelectedId(newProject.id);
    setView("project");
  };

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
                              onClick={() => toggleProduct(prod.id)}
                              className="flex-1 min-w-0 flex items-center justify-between px-2 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--paper)] rounded-md"
                            >
                              <span className="truncate">{prod.name}</span>
                              {isProductOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                            </button>
                            <button
                              onClick={() => openLotForm(prod.id)}
                              title="増刷を登録"
                              className="shrink-0 whitespace-nowrap text-[11px] px-1.5 py-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--paper)]"
                            >
                              ＋増刷を登録
                            </button>
                          </div>
                          {lotFormProductId === prod.id && (
                            <div className="ml-2 mb-1 p-2 border border-[var(--border)] rounded-md bg-[var(--paper)] space-y-2">
                              <input
                                className="w-full border border-[var(--border)] rounded-md px-2 py-1 text-xs bg-[var(--card)]"
                                placeholder="例：2026年12月ロット"
                                value={lotForm.round}
                                onChange={(e) => setLotForm((f) => ({ ...f, round: e.target.value }))}
                                autoFocus
                              />
                              <input
                                type="number"
                                className="w-full border border-[var(--border)] rounded-md px-2 py-1 text-xs bg-[var(--card)]"
                                placeholder="印刷部数"
                                value={lotForm.qty}
                                onChange={(e) => setLotForm((f) => ({ ...f, qty: e.target.value }))}
                              />
                              <div className="flex justify-end gap-1">
                                <button onClick={cancelLotForm} className="text-xs px-2 py-1 border border-[var(--border)] rounded-md text-[var(--text)]">
                                  キャンセル
                                </button>
                                <button
                                  onClick={() => submitLotForm(prod)}
                                  className="text-xs px-2 py-1 border border-[var(--accent)] text-[var(--accent)] rounded-md"
                                >
                                  登録
                                </button>
                              </div>
                            </div>
                          )}
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
