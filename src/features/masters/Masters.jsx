import { VendorSettings } from "../settings/VendorSettings.jsx";

// ---------- マスタ画面(今は印刷会社・購入先のみ。マスタが増えたらここに足す) ----------
export function Masters({ lineItems }) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-lg font-medium text-[var(--ink)]">マスタ</p>
      <VendorSettings lineItems={lineItems} />
    </div>
  );
}
