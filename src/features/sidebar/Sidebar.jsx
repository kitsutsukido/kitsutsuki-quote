import { useState } from "react";
import { Plus, ChevronRight, ChevronDown, Database, GripVertical } from "lucide-react";
import { useDragSort, arrayMove } from "../../lib/useDragSort.js";
import { sortLots } from "../../lib/lotOrder.js";

// シリーズの中の商品を、つまみ(⋮⋮)のドラッグで並べ替える(フックをシリーズごとに使うため部品に分けている)
function SortableList({ items, onMove, children }) {
  const sort = useDragSort(onMove);
  return items.map((item, i) => children(item, i, sort));
}

// ---------- サイドバー(ダッシュボード・マスタ、ジャンル > 商品 > 案件の3階層、新規商品の作成) ----------
export function Sidebar({ products, setProducts, projects, selectedId, selectedProductId, view, setView, setSelectedId, onOpenProduct, onCreateNew }) {
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
    <aside className="w-64 min-h-full border-r border-[var(--border)] bg-[var(--paper)] p-3">
      <button
        onClick={() => setView("dashboard")}
        className={`w-full text-left text-sm px-2 py-2 rounded-md mb-1 ${
          view === "dashboard" ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "text-[var(--text)] hover:bg-[var(--paper)]"
        }`}
      >
        ダッシュボード
      </button>
      <button
        onClick={() => setView("masters")}
        className={`w-full text-left text-sm px-2 py-2 rounded-md mb-3 flex items-center gap-1.5 ${
          view === "masters" ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "text-[var(--text)] hover:bg-[var(--paper)]"
        }`}
      >
        <Database size={14} /> マスタ
      </button>

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
                    <SortableList
                      items={genreProducts}
                      onMove={(from, to) => {
                        const moved = arrayMove(genreProducts, from, to);
                        let k = 0;
                        setProducts?.((prev) => prev.map((x) => (x.genre === genre ? moved[k++] : x)));
                      }}
                    >
                    {(prod, i, sort) => {
                      const productProjects = sortLots(projects.filter((p) => p.productId === prod.id));
                      const isProductOpen = openProducts.has(prod.id);
                      const dragging = sort.drag;
                      return (
                        <div
                          key={prod.id}
                          ref={sort.itemRef(i)}
                          className={`mb-1 group relative ${dragging?.from === i ? "opacity-50" : ""} ${
                            dragging && dragging.over === i && dragging.from !== i ? (dragging.over < dragging.from ? "border-t-2" : "border-b-2") + " border-[var(--accent)]" : ""
                          }`}
                        >
                          {setProducts && genreProducts.length > 1 && (
                            <span
                              {...sort.handleProps(i)}
                              className="absolute -left-3.5 top-1.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 md:opacity-0 max-md:opacity-60 select-none"
                            >
                              <GripVertical size={13} />
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const isCurrent = view === "productOverview" && selectedProductId === prod.id;
                              // 開いていない→商品の画面を開いて、ロット一覧も開く。すでにその商品の画面→一覧を開閉
                              if (isCurrent || (view === "project" && isProductOpen)) toggleProduct(prod.id);
                              else {
                                if (!isProductOpen) toggleProduct(prod.id);
                              }
                              if (!isCurrent) onOpenProduct(prod.id);
                            }}
                            className={`w-full flex items-center justify-between gap-1 px-2 py-1.5 text-sm rounded-md text-left ${
                              view === "productOverview" && selectedProductId === prod.id
                                ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                                : "text-[var(--text)] hover:bg-[var(--paper)]"
                            }`}
                          >
                            <span className="truncate">{prod.name}</span>
                            {isProductOpen ? <ChevronDown size={14} className="shrink-0 text-[var(--text-muted)]" /> : <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)]" />}
                          </button>
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
                                  <span className={`text-[11px] ml-2 shrink-0 ${p.status === "完了" ? "text-[var(--text-muted)]" : "text-[var(--accent2-ink)] font-medium"}`}>{p.status}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }}
                    </SortableList>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      <button onClick={onCreateNew} className="mt-3 w-full text-sm px-3 py-2 border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] rounded-md flex items-center justify-center gap-1">
        <Plus size={14} /> 新規商品を作成
      </button>
    </aside>
  );
}
