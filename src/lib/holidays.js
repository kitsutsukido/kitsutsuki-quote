// 日本の祝日(2020年以降の法律に合わせて計算。振替休日・国民の休日を含む)。
// 春分・秋分の日は、1980〜2099年に使える近似式で出す(国立天文台の発表と同じ日になる)。
const cache = new Map();
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
// その月の第n月曜日
const nthMonday = (y, m, n) => {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return 1 + ((8 - first) % 7) + (n - 1) * 7;
};

export function jpHolidays(year) {
  if (cache.has(year)) return cache.get(year);
  const y = year;
  const base = [
    ymd(y, 1, 1),
    ymd(y, 1, nthMonday(y, 1, 2)), // 成人の日
    ymd(y, 2, 11),
    ymd(y, 2, 23), // 天皇誕生日
    ymd(y, 3, Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))), // 春分の日
    ymd(y, 4, 29),
    ymd(y, 5, 3),
    ymd(y, 5, 4),
    ymd(y, 5, 5),
    ymd(y, 7, nthMonday(y, 7, 3)), // 海の日
    ymd(y, 8, 11), // 山の日
    ymd(y, 9, nthMonday(y, 9, 3)), // 敬老の日
    ymd(y, 9, Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))), // 秋分の日
    ymd(y, 10, nthMonday(y, 10, 2)), // スポーツの日
    ymd(y, 11, 3),
    ymd(y, 11, 23),
  ];
  const set = new Set(base);
  const dayOf = (s) => new Date(`${s}T00:00:00Z`);
  const next = (s, n = 1) => {
    const d = dayOf(s);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  // 国民の休日:前後が祝日にはさまれた平日
  for (const s of base) {
    const mid = next(s, 1);
    if (set.has(next(s, 2)) && !set.has(mid) && dayOf(mid).getUTCDay() !== 0) set.add(mid);
  }
  // 振替休日:祝日が日曜なら、その後のいちばん近い祝日でない日
  for (const s of [...set].sort()) {
    if (dayOf(s).getUTCDay() !== 0) continue;
    let d = next(s);
    while (set.has(d)) d = next(d);
    set.add(d);
  }
  cache.set(year, set);
  return set;
}

export const isJpHoliday = (dateStr) => jpHolidays(Number(dateStr.slice(0, 4))).has(dateStr);
