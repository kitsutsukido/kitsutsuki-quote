import { isJpHoliday } from "./holidays.js";

// 会社ごとの「営業日に含まない日」。
// vendor.off = { sat, sun, holiday, summer, newyear }(チェックボックス)
// vendor.breaks = {
//   summer:  { from: "08-13", to: "08-16" }            毎年の夏期休暇の目安(月-日)
//   newyear: { from: "12-29", to: "01-04" }            毎年の年末年始の目安(年をまたいでよい)
//   years:   [{ kind: "summer"|"newyear", from: "2026-08-12", to: "2026-08-17" }]  その年だけ違うとき(目安より優先)
// }
// 昔の形(days: "business" = 土日を除く)は、土曜・日曜にチェックが入っているものとして読む。
export const BREAK_LABEL = { summer: "夏期休暇", newyear: "年末年始" };
export const DEFAULT_BREAKS = { summer: { from: "08-13", to: "08-16" }, newyear: { from: "12-29", to: "01-04" } };

export function offOf(vendor) {
  if (vendor?.off) return vendor.off;
  if (vendor?.days === "business") return { sat: true, sun: true };
  return {};
}

// その会社の、その年の休み(夏期休暇・年末年始)の期間。年末年始は「その年の12月に始まる休み」とする。
export function breakRange(vendor, kind, year) {
  const exact = (vendor?.breaks?.years || []).find((b) => b.kind === kind && b.from && b.to && Number(b.from.slice(0, 4)) === year);
  if (exact) return { from: exact.from, to: exact.to, exact: true };
  const md = vendor?.breaks?.[kind] || DEFAULT_BREAKS[kind];
  if (!md?.from || !md?.to) return null;
  const from = `${year}-${md.from}`;
  const to = md.to < md.from ? `${year + 1}-${md.to}` : `${year}-${md.to}`;
  return { from, to, exact: false };
}

// dateStr がどの休みに入っているか(なければ null)
export function breakOn(vendor, dateStr) {
  const off = offOf(vendor);
  const y = Number(dateStr.slice(0, 4));
  for (const kind of ["summer", "newyear"]) {
    if (!off[kind]) continue;
    // 年末年始は、前の年の12月に始まる休みが1月にかかることがある
    for (const yy of kind === "newyear" ? [y - 1, y] : [y]) {
      const r = breakRange(vendor, kind, yy);
      if (r && dateStr >= r.from && dateStr <= r.to) return kind;
    }
  }
  return null;
}

// 営業日に含まない日か
export function isOffDay(vendor, dateStr) {
  const off = offOf(vendor);
  const w = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  if (off.sat && w === 6) return true;
  if (off.sun && w === 0) return true;
  if (off.holiday && isJpHoliday(dateStr)) return true;
  return !!breakOn(vendor, dateStr);
}

// from〜to(両端を含む)の間にかかる休み(夏期休暇・年末年始)の名前
export function breaksBetween(vendor, from, to) {
  if (!from || !to) return [];
  const [a, b] = from <= to ? [from, to] : [to, from];
  const found = new Set();
  const d = new Date(`${a}T00:00:00Z`);
  for (let i = 0; i < 400; i++) {
    const s = d.toISOString().slice(0, 10);
    if (s > b) break;
    const k = breakOn(vendor, s);
    if (k) found.add(BREAK_LABEL[k]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return [...found];
}

// 営業日の説明(会社マスタ・入稿管理のメモ用)。例:「日曜・祝日・夏期休暇・年末年始を除く」
export function offLabel(vendor) {
  const off = offOf(vendor);
  const names = [off.sat && "土曜", off.sun && "日曜", off.holiday && "祝日", off.summer && "夏期休暇", off.newyear && "年末年始"].filter(Boolean);
  return names.length ? `${names.join("・")}を除く` : "";
}
