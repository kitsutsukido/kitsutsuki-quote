import { feesOf, patternFee, feeAmount } from "./profitFees.js";

// 損益分岐点表。経費(確定見積もりの合計)は、何部売れても変わらない固定の費用として扱う
// (刷った部数の分はすでに払っているため)。手数料・分配は売れた分だけかかる。
// fees を省略したときは、settings(とこのパターン)から項目一覧を読み替える。
export function computeBreakeven(costTotal, baseQty, settings, pattern, volumes, fees = feesOf(settings, [pattern])) {
  return volumes.map((vol) => {
    const revenue = vol * settings.price;
    const total = feesFor(fees, pattern, revenue, vol);
    const profit = revenue - total - costTotal;
    return { vol, revenue, fees: total, profit, margin: revenue ? profit / revenue : 0 };
  });
}

function feesFor(fees, pattern, revenue, vol) {
  let total = 0;
  for (const f of fees) {
    const { on, override } = patternFee(pattern, f);
    if (!on) continue;
    total += feeAmount(f, override ?? (Number(f.value) || 0), revenue, vol);
  }
  return total;
}

// 黒字になる最小の販売部数(1部あたりの手取りがマイナスなら null)
export function breakevenQty(costTotal, settings, pattern, fees = feesOf(settings, [pattern])) {
  const perUnit = settings.price - feesFor(fees, pattern, settings.price, 1);
  if (!(perUnit > 0)) return null;
  return Math.floor(costTotal / perUnit) + 1;
}
