import { isMaterial } from "./spec.js";

// 日付(YYYY-MM-DD)から n 日さかのぼる。business なら土日を数えない(祝日は考えない)。
export function subtractDays(dateStr, n, mode) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  let left = Math.max(0, Math.floor(Number(n) || 0));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    const w = d.getUTCDay();
    if (mode === "business" && (w === 0 || w === 6)) continue;
    left -= 1;
  }
  return d.toISOString().slice(0, 10);
}

// 日付(YYYY-MM-DD)に n 日足す。business なら土日を数えない。
export function addDays(dateStr, n, mode) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  let left = Math.max(0, Math.floor(Number(n) || 0));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (mode === "business" && (w === 0 || w === 6)) continue;
    left -= 1;
  }
  return d.toISOString().slice(0, 10);
}

// 明細の印刷場所・購入場所に対応するマスタの会社(種別の違うものは見ない)
export function findVendor(vendors, item) {
  const name = (item.submitTo || "").trim();
  if (!name) return null;
  return (vendors || []).find((x) => x.name === name && (isMaterial(item) ? x.kind === "material" : x.kind === "print" || x.kind === "assembly")) || null;
}

// 入稿期限を、納品日から印刷日数を引いて出す。
//  ・加工・組立の外注先(内職市場など)の明細 → 商品納品日から逆算
//  ・それ以外 → 資材納品日(内職市場に納める日)があればそこから、無ければ(自分たちで組み立てるなど)商品納品日から逆算
//  ・数え方は、会社マスタの「納期の数え方」(未設定は土日も数える)
// 印刷日数が未入力、または基準の日付が無いときは、手で入れた予定日(plannedDate)を使う。
export function submitDeadline(item, project, vendors) {
  const manual = item.plannedDate || "";
  const days = Number(item.printDays);
  if (!item.printDays || !Number.isFinite(days) || days <= 0) return { date: manual, calc: false };
  const vendor = findVendor(vendors, item);
  const assembly = vendor?.kind === "assembly";
  const base = assembly ? project?.productDue : project?.materialDue || project?.productDue;
  if (!base) return { date: manual, calc: false };
  return { date: subtractDays(base, days, vendor?.days === "business" ? "business" : "calendar"), calc: true, base, assembly };
}

// 実際の納品日。手で入れた日(deliveryDate)があればそれ、無ければ入稿した日+日数で自動。
// 入稿していない・日数が無いときは空。
export function deliveryDateOf(item, vendors) {
  if (item.deliveryDate) return { date: item.deliveryDate, manual: true };
  const days = Number(item.printDays);
  if (!item.actualDate || !item.printDays || !Number.isFinite(days) || days <= 0) return { date: "", manual: false };
  const vendor = findVendor(vendors, item);
  return { date: addDays(item.actualDate, days, vendor?.days === "business" ? "business" : "calendar"), manual: false };
}
