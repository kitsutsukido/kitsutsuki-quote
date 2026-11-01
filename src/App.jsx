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
import { useDataSync } from "./lib/dataSync.js";
import { SyncConflictModal } from "./components/SyncConflictModal.jsx";
import { Header } from "./features/header/Header.jsx";
import { Sidebar } from "./features/sidebar/Sidebar.jsx";
import { Dashboard } from "./features/dashboard/Dashboard.jsx";
import { ProductOverview } from "./features/product/ProductOverview.jsx";
import { Masters } from "./features/masters/Masters.jsx";
import { Settings } from "./features/settings/Settings.jsx";
import { LotHeader } from "./features/project/LotHeader.jsx";
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

  // 共有データとの自動同期(パソコン・スマホで同じ内容にする)
  const sync = useDataSync({
    data: { projects, sessions, lineItems, groups, profitSettings: settings, profitPatterns: patterns },
    seed: { projects: initialProjects, sessions: initialSessions, lineItems: initialLineItems, groups: initialGroups, profitSettings: initialProfitSettings, profitPatterns: initialPatterns },
    apply: (d) => {
      if (d.projects) setProjects(d.projects);
      if (d.sessions) setSessions(d.sessions);
      if (d.lineItems) setLineItems(d.lineItems);
      if (d.groups) setGroups(d.groups);
      if (d.profitSettings) setSettings(d.profitSettings);
      if (d.profitPatterns) setPatterns(d.profitPatterns);
    },
  });

  const project = projects.find((p) => p.id === selectedId) || projects[0];
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

  // baseSessionId を渡すと、その確定見積もりの明細をコピーした確定見積もりを新ロットに作る
  const registerLot = (productId, round, qty, baseSessionId) => {
    const newProject = {
      id: `prj-${Date.now()}`,
      productId,
      round,
      qty: Number(qty) || 0,
      status: "進行中",
    };
    setProjects((prev) => [...prev, newProject]);
    const base = baseSessionId ? sessions.find((x) => x.id === baseSessionId) : null;
    if (base) {
      const sid = `qs-${Date.now()}`;
      const baseProject = projects.find((p) => p.id === base.projectId);
      const rm = round.match(/^(\d{4})年(\d{1,2})月/);
      const lotMonth = rm ? `${rm[1]}-${rm[2].padStart(2, "0")}` : new Date().toISOString().slice(0, 7);
      const baseLabel = `${baseProject ? baseProject.round + " " : ""}${base.label}`;
      setSessions((prev) => [
        ...prev,
        { id: sid, projectId: newProject.id, label: "確定見積もり", date: lotMonth, status: "確定", baseSessionId: base.id, baseLabel },
      ]);
      const copies = lineItems
        .filter((it) => it.sessionId === base.id)
        .map((it, i) => ({
          ...it,
          id: `qli-${Date.now()}-${i}`,
          sessionId: sid,
          processes: [...(it.processes || [])],
          purchaseStatus: "未",
          actualDate: "",
        }));
      setLineItems((prev) => [...prev, ...copies]);
    }
    setSelectedId(newProject.id);
    setView("project");
  };

  return (
    <div className="zk-root min-h-screen flex flex-col bg-[var(--paper)] text-[var(--text)]">
      <Header syncStatus={sync.status} syncedAt={sync.syncedAt} onRetrySync={sync.retry} view={view} setView={(v) => { setView(v); setMenuOpen(false); }} onToggleMenu={() => setMenuOpen((o) => !o)} />

      {sync.conflict && (
        <SyncConflictModal
          local={{ projects, sessions, lineItems, groups, profitSettings: settings, profitPatterns: patterns }}
          remote={sync.conflict.remote}
          onUseLocal={sync.useLocal}
          onUseRemote={sync.useRemote}
        />
      )}

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

        <main className="flex-1 min-w-0 p-4 md:p-6 max-w-6xl">
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

          {view === "masters" && <Masters lineItems={lineItems} />}
          {view === "settings" && <Settings products={products} sync={{ projects, sessions, groups, lineItems, settings, patterns, setProjects, setSessions, setGroups, setLineItems, setSettings, setPatterns }} />}

          {view === "project" && (
            <>
              <button
                onClick={() => openProductOverview(product.id)}
                title="この商品のダッシュボードへ"
                className="text-lg font-medium mb-1 text-[var(--ink)] text-left hover:text-[var(--accent)] hover:underline underline-offset-4"
              >
                {product.name}
              </button>
              <LotHeader key={project.id} project={project} onSave={(patch) => setProjects((ps) => ps.map((x) => (x.id === project.id ? { ...x, ...patch } : x)))} />

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
                <QuoteTab project={project} projects={projects} setProjects={setProjects} sessions={sessions} setSessions={setSessions} groups={groups} setGroups={setGroups} lineItems={lineItems} setLineItems={setLineItems} />
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
