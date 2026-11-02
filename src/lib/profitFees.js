// 収支設定の手数料・分配の項目(ロットごとに追加・削除できる)。
// 新しい形式: settings[projectId] = { price, taxRate, fees: [{ id, name, kind: "rate" | "yen", value }] }
//   kind "rate" = 売上の○%、"yen" = 1部あたり○円
// 販売パターン: { id, projectId, name, use: { [feeId]: true/false }, overrides: { [feeId]: 値 } }
//   use で「このパターンで使う項目」を選ぶ。overrides に値があれば、収支設定の値の代わりに使う。
// 旧形式(facilityRate などの固定の欄+パターンごとの consignRate / shopRate / shopFixed)は、
// 保存し直すまでは読むときに新しい形式へ読み替える(データは書き換えない)。

const num = (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

const LEGACY_PATTERN_KEY = { consign: "consignRate", shop: "shopRate", shopFixed: "shopFixed" };
const LEGACY_ALWAYS = ["facility", "local", "royalty"];

export const DEFAULT_FEES = () => [
  { id: "facility", name: "施設分配率", kind: "rate", value: 0 },
  { id: "local", name: "現地販売分配率", kind: "rate", value: 0 },
  { id: "royalty", name: "版権料", kind: "rate", value: 0 },
  { id: "consign", name: "委託販売手数料", kind: "rate", value: 0 },
  { id: "shop", name: "ショップ手数料", kind: "rate", value: 0 },
];

// このロットの項目一覧
export function feesOf(s, projectPatterns = []) {
  if (Array.isArray(s?.fees)) return s.fees;
  const firstVal = (k) => {
    const p = projectPatterns.find((x) => num(x[k]) !== null);
    return p ? num(p[k]) : 0;
  };
  const fees = [
    { id: "facility", name: "施設分配率", kind: "rate", value: num(s?.facilityRate) ?? 0 },
    { id: "local", name: "現地販売分配率", kind: "rate", value: num(s?.localSalesRate) ?? 0 },
    { id: "royalty", name: "版権料", kind: "rate", value: num(s?.royaltyRate) ?? 0 },
    { id: "consign", name: "委託販売手数料", kind: "rate", value: firstVal("consignRate") },
    { id: "shop", name: "ショップ手数料", kind: "rate", value: firstVal("shopRate") },
  ];
  if (projectPatterns.some((p) => num(p.shopFixed) !== null)) {
    fees.push({ id: "shopFixed", name: "ショップ手数料(固定額)", kind: "yen", value: firstVal("shopFixed") });
  }
  return fees;
}

// パターンでその項目を使うか、使うときの上書きの値(null=収支設定の値)
export function patternFee(p, fee) {
  if (p.use) {
    return { on: !!p.use[fee.id], override: num(p.overrides?.[fee.id]) };
  }
  if (LEGACY_ALWAYS.includes(fee.id)) return { on: true, override: null };
  const k = LEGACY_PATTERN_KEY[fee.id];
  if (!k) return { on: false, override: null };
  const v = num(p[k]);
  return { on: v !== null, override: v };
}

// 旧形式のパターンを、新しい形式(use / overrides)に書き出す
export function materializePattern(p, fees) {
  const use = {};
  const overrides = {};
  for (const f of fees) {
    const { on, override } = patternFee(p, f);
    use[f.id] = on;
    if (override !== null && override !== f.value) overrides[f.id] = override;
  }
  const { consignRate, shopRate, shopFixed, ...rest } = p; // eslint-disable-line no-unused-vars
  return { ...rest, use, overrides };
}

// 1項目の金額
export function feeAmount(fee, value, revenue, vol) {
  return fee.kind === "yen" ? value * vol : revenue * (value / 100);
}

// 旧形式の欄(スプレッドシートの「収支設定」シート用)も、同じ意味の項目があれば合わせて入れておく
export function withLegacyFields(s) {
  const rate = (id) => {
    const f = (s.fees || []).find((x) => x.id === id && x.kind === "rate");
    return f ? f.value : 0;
  };
  return { ...s, facilityRate: rate("facility"), localSalesRate: rate("local"), royaltyRate: rate("royalty") };
}
