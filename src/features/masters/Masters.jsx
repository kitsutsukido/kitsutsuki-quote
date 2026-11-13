import { useState } from "react";
import { ChevronRight, ChevronLeft, Users, Building2, Tag } from "lucide-react";
import { VendorSettings } from "../settings/VendorSettings.jsx";
import { MemberSettings } from "../settings/MemberSettings.jsx";
import { MaterialNames } from "./MaterialNames.jsx";
import { useVendors, KIND_IGNORE } from "../../lib/vendors.jsx";
import { isMaterial } from "../../lib/spec.js";

// ---------- マスタ画面 ----------
// 最初はメニュー(社員マスタ/印刷・資材会社/資材の名前の一括変更)。押すとその画面へ。マスタが増えたらメニューに足す。
export function Masters({ lineItems, setLineItems, projects, sessions, members, setMembers }) {
  const [section, setSection] = useState(null);
  const { vendors } = useVendors();
  const vendorCount = vendors.filter((v) => v.kind !== KIND_IGNORE).length;
  const materialNames = new Set(lineItems.filter((it) => isMaterial(it) && (it.size || "").trim()).map((it) => it.size.normalize("NFKC").replace(/\s+/g, " ").trim())).size;

  const MENU = [
    { id: "members", icon: Users, title: "社員マスタ", desc: "入稿・購入の担当者。在庫管理アプリと同期します。", count: `${members.length}人` },
    { id: "vendors", icon: Building2, title: "印刷・資材会社", desc: "印刷会社・資材仕入先・加工の外注先と、営業日(休み)の設定。", count: `${vendorCount}社` },
    { id: "materials", icon: Tag, title: "資材の名前の一括変更", desc: "資材の商品名を、全部のロットの明細でまとめて置き換えます。", count: `${materialNames}件` },
  ];
  const current = MENU.find((m) => m.id === section);

  return (
    <div className="max-w-2xl space-y-4">
      {!current ? (
        <>
          <p className="zk-title zk-title-line text-lg font-bold text-[var(--ink)]">マスタ</p>
          <div className="space-y-2">
            {MENU.map((m) => (
              <button
                key={m.id}
                onClick={() => setSection(m.id)}
                className="w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 flex items-center gap-3 hover:border-[var(--accent)] transition"
              >
                <m.icon size={20} className="text-[var(--accent)] shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-[var(--ink)]">{m.title}</span>
                  <span className="block text-xs text-[var(--text-muted)] mt-0.5">{m.desc}</span>
                </span>
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{m.count}</span>
                <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setSection(null)} className="text-sm text-[var(--accent)] flex items-center gap-1">
            <ChevronLeft size={16} /> マスタ一覧へ
          </button>
          <p className="zk-title zk-title-line text-lg font-bold text-[var(--ink)]">{current.title}</p>
          {section === "members" && <MemberSettings members={members} setMembers={setMembers} />}
          {section === "vendors" && <VendorSettings lineItems={lineItems} />}
          {section === "materials" && <MaterialNames lineItems={lineItems} setLineItems={setLineItems} projects={projects} sessions={sessions} />}
        </>
      )}
    </div>
  );
}
