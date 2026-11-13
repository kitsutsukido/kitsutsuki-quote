// ロット名(例:「2026年4月ロット」「2026/4」)から年月を読んで、古い順に並べる。
// 年月が読めないロットは最後に、もとの並びのまま置く。
export function lotSortKey(round) {
  const s = String(round || "").normalize("NFKC");
  const m = s.match(/(\d{4})\s*[年/.\-]\s*(\d{1,2})/) || s.match(/(\d{4})/);
  if (!m) return Infinity;
  return Number(m[1]) * 100 + (m[2] ? Number(m[2]) : 0);
}

export function sortLots(projects) {
  return projects
    .map((p, i) => ({ p, i, k: lotSortKey(p.round) }))
    .sort((a, b) => (a.k === b.k ? a.i - b.i : a.k < b.k ? -1 : 1))
    .map((x) => x.p);
}
