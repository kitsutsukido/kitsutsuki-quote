export function computeBreakeven(costTotal, baseQty, settings, pattern, volumes) {
  const unitCost = costTotal / baseQty;
  return volumes.map((vol) => {
    const revenue = vol * settings.price;
    const facility = revenue * (settings.facilityRate / 100);
    const local = revenue * (settings.localSalesRate / 100);
    const royalty = revenue * (settings.royaltyRate / 100);
    const consign = pattern.consignRate ? revenue * (pattern.consignRate / 100) : 0;
    const shop = pattern.shopRate ? revenue * (pattern.shopRate / 100) + (pattern.shopFixed || 0) * vol : 0;
    const fees = facility + local + royalty + consign + shop;
    const cost = unitCost * vol;
    const profit = revenue - fees - cost;
    return { vol, revenue, fees, profit, margin: revenue ? profit / revenue : 0 };
  });
}
