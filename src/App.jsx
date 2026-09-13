import { useState } from "react";
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
import { Sidebar } from "./features/sidebar/Sidebar.jsx";
import { Dashboard } from "./features/dashboard/Dashboard.jsx";
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
  const [projects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState(deepLink?.selectedId ?? initialProjects[1].id); // 進行中の深海2026を初期表示
  const [view, setView] = useState(deepLink?.view ?? "dashboard");
  const [sessions, setSessions] = useState(initialSessions);
  const [groups] = useState(initialGroups);
  const [lineItems, setLineItems] = useState(initialLineItems);
  const [settings, setSettings] = useState(initialProfitSettings);
  const [patterns, setPatterns] = useState(initialPatterns);
  const [tab, setTab] = useState("quote");

  const project = projects.find((p) => p.id === selectedId);
  const product = products.find((p) => p.id === project.productId);
  const tabs = [
    { id: "quote", label: "見積もり" },
    { id: "submission", label: "入稿管理" },
    { id: "profit", label: "収支設定" },
  ];

  return (
    <div className="zk-root min-h-screen bg-[var(--paper)] flex text-[var(--text)]">
      <Sidebar
        products={products}
        projects={projects}
        selectedId={selectedId}
        view={view}
        setView={setView}
        setSelectedId={setSelectedId}
        onCreateNew={() => {}}
      />

      <main className="flex-1 p-6 max-w-4xl">
        {view === "dashboard" ? (
          <Dashboard
            products={products}
            projects={projects}
            sessions={sessions}
            lineItems={lineItems}
            onOpen={(id) => { setSelectedId(id); setView("project"); }}
          />
        ) : (
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
              <QuoteTab project={project} projects={projects} sessions={sessions} setSessions={setSessions} groups={groups} lineItems={lineItems} setLineItems={setLineItems} />
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
  );
}
