import { useEffect, useState } from "react";
import {
  initialProducts,
  initialProjects,
  initialGroups,
  initialSessions,
  initialLineItems,
  initialProfitSettings,
  initialPatterns,
} from "./data/seedData.js";
import { resolveProductDeepLink } from "./lib/deepLink.js";
import {
  loadProjects, saveProjects,
  loadSessions, saveSessions,
  loadLineItems, saveLineItems,
  loadGroups, saveGroups,
  loadProfitSettings, saveProfitSettings,
  loadProfitPatterns, saveProfitPatterns,
} from "./lib/storage.js";
import { Header } from "./features/header/Header.jsx";
import { Sidebar } from "./features/sidebar/Sidebar.jsx";
import { Dashboard } from "./features/dashboard/Dashboard.jsx";
import { ProductOverview } from "./features/product/ProductOverview.jsx";
import { Settings } from "./features/settings/Settings.jsx";
import { QuoteTab } from "./features/quote/QuoteTab.jsx";
import { SubmissionTab } from "./features/submission/SubmissionTab.jsx";
import { ProfitTab } from "./features/profit/ProfitTab.jsx";

const deepLink = resolveProductDeepLink(
  initialProducts,
  initialProjects,
  typeof window !== "undefined" ? window.location.search : ""
);

// ---------- ルートアプリ ----------
export default function App() {
  const [products] = useState(initialProducts);
  const [projects, setProjects] = useState(() => loadProjects(initialProjects));
  const [selectedId, setSelectedId] = useState(deepLink?.selectedId ?? initialProjects[1].id); // 進行中の深海2026を初期表示
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [view, setView] = useState(deepLink?.view ?? "dashboard");
  const [sessions, setSessions] = useState(() => loadSessions(initialSessions));
  const [groups, setGroups] = useState(() => loadGroups(initialGroups));
  const [lineItems, setLineItems] = useState(() => loadLineItems(initialLineItems));
  const [settings, setSettings] = useState(() => loadProfitSettings(initialProfitSettings));
  const [patterns, setPatterns] = useState(() => loadProfitPatterns(initialPatterns));
  const [tab, setTab] = useState("quote");
  const [menuOpen, setMenuOpen] = useState(false); // スマホ幅でのサイドバー開閉

  useEffect(() => saveProjects(projects), [projects]);
  useEffect(() => saveSessions(sessions), [sessions]);
  useEffect(() => saveGroups(groups), [groups]);
  useEffect(() => saveLineItems(lineItems), [lineItems]);
  useEffect(() => saveProfitSettings(settings), [settings]);
  useEffect(() => saveProfitPatterns(patterns), [patterns]);

  const project = projects.find((p) => p.id === selectedId);
  const product = products.find((p) => p.id === project.productId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const tabs = [
    { id: "quote", label: "見積もり" },
    { id: "submission", label: "入稿管理" },
    { id: "profit", label: "収支設定" },
  ];

  const openProductOverview = (productId) => {
    setSelectedProductId(productId);
    setView("productOverview");
  };

  const registerLot = (productId, round, qty) => {
    const newProject = {
      id: `prj-${Date.now()}`,
      productId,
      round,
      qty: Number(qty) || 0,
      status: "進行中",
    };
    setProjects((prev) => [...prev, newProject]);
    setSelectedId(newProject.id);
    setView("project");
  };

  return (
    <div className="zk-root min-h-screen flex flex-col bg-[var(--paper)] text-[var(--text)]">
      <Header view={view} setView={(v) => { setView(v); setMenuOpen(false); }} onToggleMenu={() => setMenuOpen((o) => !o)} />

      <div className="flex flex-1">
        {menuOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMenuOpen(false)} />}
        <div className={`${menuOpen ? "fixed inset-y-0 left-0 z-40 overflow-y-auto" : "hidden"} md:block md:static md:z-auto md:overflow-visible shrink-0`}>
          <Sidebar
            products={products}
            projects={projects}
            selectedId={selectedId}
            selectedProductId={selectedProductId}
            view={view}
            setView={(v) => { setView(v); setMenuOpen(false); }}
            setSelectedId={(id) => { setSelectedId(id); setMenuOpen(false); }}
            onOpenProduct={(id) => { openProductOverview(id); setMenuOpen(false); }}
            onCreateNew={() => {}}
          />
        </div>

        <main className="flex-1 min-w-0 p-4 md:p-6 max-w-4xl">
          {view === "dashboard" && (
            <Dashboard
              products={products}
              projects={projects}
              sessions={sessions}
              lineItems={lineItems}
              onOpen={(id) => { setSelectedId(id); setView("project"); }}
            />
          )}

          {view === "productOverview" && selectedProduct && (
            <ProductOverview
              product={selectedProduct}
              projects={projects}
              sessions={sessions}
              lineItems={lineItems}
              setLineItems={setLineItems}
              groups={groups}
              setGroups={setGroups}
              settings={settings}
              patterns={patterns}
              onOpenProject={(id) => { setSelectedId(id); setView("project"); }}
              registerLot={registerLot}
            />
          )}

          {view === "settings" && <Settings products={products} />}

          {view === "project" && (
            <>
              <p className="text-lg font-medium mb-1 text-[var(--ink)]">{product.name}</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">{project.round}・印刷部数 {project.qty}部</p>

              <div className="flex gap-1 border-b border-[var(--border)] mb-4">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`text-sm px-3 py-2 border-b-2 -mb-px ${
                      tab === t.id ? "border-[var(--accent)] text-[var(--accent)] font-medium" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "quote" && (
                <QuoteTab project={project} projects={projects} sessions={sessions} setSessions={setSessions} groups={groups} setGroups={setGroups} lineItems={lineItems} setLineItems={setLineItems} />
              )}
              {tab === "submission" && (
                <SubmissionTab project={project} sessions={sessions} lineItems={lineItems} setLineItems={setLineItems} />
              )}
              {tab === "profit" && (
                <ProfitTab
                  project={project}
                  sessions={sessions}
                  lineItems={lineItems}
                  settings={settings}
                  setSettings={setSettings}
                  patterns={patterns}
                  setPatterns={setPatterns}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
