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
import { useSharedData } from "./lib/dataSync.js";
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
export default function App({ boot }) {
  const serverMode = boot.mode === "server";
  // 共有データがあるときは共有データから、無いとき(開発中)はこの端末のlocalStorageから
  const init = (key, loader, seed) => (serverMode ? boot.data[key] ?? seed : loader(seed));
  const [products] = useState(initialProducts);
  const [projects, setProjects] = useState(() => init("projects", loadProjects, initialProjects));
  const [selectedId, setSelectedId] = useState(deepLink?.selectedId ?? initialProjects[1].id); // 進行中の深海2026を初期表示
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [view, setView] = useState(deepLink?.view ?? "dashboard");
  const [sessions, setSessions] = useState(() => init("sessions", loadSessions, initialSessions));
  const [groups, setGroups] = useState(() => init("groups", loadGroups, initialGroups));
  const [lineItems, setLineItems] = useState(() => init("lineItems", loadLineItems, initialLineItems));
  const [settings, setSettings] = useState(() => init("profitSettings", loadProfitSettings, initialProfitSettings));
  const [patterns, setPatterns] = useState(() => init("profitPatterns", loadProfitPatterns, initialPatterns));
  const [tab, setTab] = useState("quote");
  const [menuOpen, setMenuOpen] = useState(false); // スマホ幅でのサイドバー開閉

  useEffect(() => { if (!serverMode) saveProjects(projects); }, [projects, serverMode]);
  useEffect(() => { if (!serverMode) saveSessions(sessions); }, [sessions, serverMode]);
  useEffect(() => { if (!serverMode) saveGroups(groups); }, [groups, serverMode]);
  useEffect(() => { if (!serverMode) saveLineItems(lineItems); }, [lineItems, serverMode]);
  useEffect(() => { if (!serverMode) saveProfitSettings(settings); }, [settings, serverMode]);
  useEffect(() => { if (!serverMode) saveProfitPatterns(patterns); }, [patterns, serverMode]);

  // 共有データへの自動保存・最新の取り込み
  const sync = useSharedData({
    mode: boot.mode,
    initialUpdatedAt: boot.updatedAt,
    data: { projects, sessions, lineItems, groups, profitSettings: settings, profitPatterns: patterns },
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
      <Header syncStatus={sync.status} onRetrySync={sync.retry} view={view} setView={(v) => { setView(v); setMenuOpen(false); }} onToggleMenu={() => setMenuOpen((o) => !o)} />

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
                <SubmissionTab project={project} sessions={sessions} lineItems={lineItems} setLineItems={setLineItems} onUpdateProject={(fields) => setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, ...fields } : p)))} />
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
