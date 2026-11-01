import { VendorSettings } from "../settings/VendorSettings.jsx";
import { MemberSettings } from "../settings/MemberSettings.jsx";

// ---------- マスタ画面(今は印刷会社・購入先のみ。マスタが増えたらここに足す) ----------
export function Masters({ lineItems, members, setMembers }) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-lg font-medium text-[var(--ink)]">マスタ</p>
      <MemberSettings members={members} setMembers={setMembers} />
      <VendorSettings lineItems={lineItems} />
    </div>
  );
}
