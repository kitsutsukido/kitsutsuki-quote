import { VendorSettings } from "../settings/VendorSettings.jsx";
import { MemberSettings } from "../settings/MemberSettings.jsx";
import { MaterialNames } from "./MaterialNames.jsx";

// ---------- マスタ画面(メンバー・印刷会社と購入先・資材の商品名。マスタが増えたらここに足す) ----------
export function Masters({ lineItems, setLineItems, projects, sessions, members, setMembers }) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-lg font-medium text-[var(--ink)]">マスタ</p>
      <MemberSettings members={members} setMembers={setMembers} />
      <VendorSettings lineItems={lineItems} />
      <MaterialNames lineItems={lineItems} setLineItems={setLineItems} projects={projects} sessions={sessions} />
    </div>
  );
}
