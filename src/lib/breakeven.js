import { feesOf, patternFee, feeAmount } from "./profitFees.js";

// fees を省略したときは、settings(とこのパターン)から項目一覧を読み替える
export function computeBreakeven(costTotal, baseQty, settings, pattern, volumes, fees = feesOf(settings, [pattern])) {
  const unitCost = costTotal / baseQty;
  return volumes.map((vol) => {
    const revenue = vol * settings.price;
    let total = 0;
    for (const f of fees) {
      const { on, override } = patternFee(pattern, f);
      if (!on) continue;
      total += feeAmount(f, override ?? (Number(f.value) || 0), revenue, vol);
    }
    const cost = unitCost * vol;
    const profit = revenue - total - cost;
    return { vol, revenue, fees: total, profit, margin: revenue ? profit / revenue : 0 };
  });
}
