import { isMaterial, isAssembly } from "./spec.js";
import { isOffDay } from "./businessDays.js";

// 今日の日付(この端末の時刻=日本時間で YYYY-MM-DD)。toISOString() はUTCなので、朝9時前は前日になってしまう
export function localToday(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// 日付(YYYY-MM-DD)から n 日さかのぼる。営業日に含まない日(会社マスタ)は数えない。
// mode に会社(vendor)を渡すと、その会社の「営業日に含まない日」を使う。"business" は昔の「土日を除く」。
const offCheck = (mode) => {
  if (mode && typeof mode === "object") return (s) => isOffDay(mode, s);
  if (mode === "business") return (s) => isOffDay({ days: "business" }, s);
  return () => false;
};
export function subtractDays(dateStr, n, mode) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  let left = Math.max(0, Math.floor(Number(n) || 0));
  const off = offCheck(mode);
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    if (off(d.toISOString().slice(0, 10))) continue;
    left -= 1;
  }
  return d.toISOString().slice(0, 10);
}

// 日付(YYYY-MM-DD)に n 日足す。営業日に含まない日は数えない。
export function addDays(dateStr, n, mode) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  let left = Math.max(0, Math.floor(Number(n) || 0));
  const off = offCheck(mode);
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (off(d.toISOString().slice(0, 10))) continue;
    left -= 1;
  }
  return d.toISOString().slice(0, 10);
}

// 明細の印刷場所・購入場所に対応するマスタの会社(種別の違うものは見ない)
export function findVendor(vendors, item) {
  const name = (item.submitTo || "").trim();
  if (!name) return null;
  const ok = (k) => (isMaterial(item) ? k === "material" : isAssembly(item) ? k === "assembly" : k === "print" || k === "assembly");
  return (vendors || []).find((x) => x.name === name && ok(x.kind)) || null;
}

// 入稿期限を、納品日から印刷日数を引いて出す。
//  ・加工・組立の外注先(内職市場など)の明細 → 商品納品日から逆算
//  ・それ以外 → 資材納品日(内職市場に納める日)があればそこから、無ければ(自分たちで組み立てるなど)商品納品日から逆算
//  ・数え方は、会社マスタの「営業日に含まない日」(土曜・日曜・祝日・夏期休暇・年末年始。未設定は全部数える)
// 印刷日数が未入力、または基準の日付が無いときは、手で入れた予定日(plannedDate)を使う。
export function submitDeadline(item, project, vendors) {
  const manual = item.plannedDate || "";
  const days = Number(item.printDays);
  if (!item.printDays || !Number.isFinite(days) || days <= 0) return { date: manual, calc: false };
  const vendor = findVendor(vendors, item);
  const assembly = vendor?.kind === "assembly" || isAssembly(item); // 内職・加工の明細は、依頼先がマスタに無くても商品納品日から
  const base = assembly ? project?.productDue : project?.materialDue || project?.productDue;
  if (!base) return { date: manual, calc: false };
  return { date: subtractDays(base, days, vendor), calc: true, base, assembly, vendor };
}

// 実際の納品日。手で入れた日(deliveryDate)があればそれ、無ければ入稿した日+日数で自動。
// 入稿していない・日数が無いときは空。
export function deliveryDateOf(item, vendors) {
  if (item.deliveryDate) return { date: item.deliveryDate, manual: true };
  const days = Number(item.printDays);
  if (!item.actualDate || !item.printDays || !Number.isFinite(days) || days <= 0) return { date: "", manual: false };
  const vendor = findVendor(vendors, item);
  return { date: addDays(item.actualDate, days, vendor), manual: false };
}
