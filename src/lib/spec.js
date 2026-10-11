// 明細の種別: 印刷物(既定) / 資材(OPP袋・ダンボールなど。印刷しないので色・紙・加工は持たない)
export const KIND_PRINT = "print";
export const KIND_MATERIAL = "material";

export const TAPE_OPTIONS = ["なし", "本体テープ付き", "別売りテープ"];
const TAPE_LABEL = { "なし": "テープなし", "本体テープ付き": "テープ付き", "別売りテープ": "別売りテープ" };

export const isMaterial = (item) => item.kind === KIND_MATERIAL;

// 資材の購入数量(入数 × パック数)。入力が足りなければ null
export function materialTotalQty(item) {
  const size = Number(item.packSize);
  const count = Number(item.packCount);
  return size > 0 && count > 0 ? size * count : null;
}

export function specString(item) {
  if (isMaterial(item)) {
    const total = materialTotalQty(item);
    return [
      item.size,
      item.tape ? TAPE_LABEL[item.tape] || item.tape : "",
      total ? `${Number(item.packSize).toLocaleString()}枚入×${Number(item.packCount).toLocaleString()}パック` : "",
    ].filter(Boolean).join("・");
  }
  const parts = [
    item.size,
    `${item.colorFront}/${item.colorBack}`,
    item.paper ? `${item.paper}${item.weight || ""}` : item.weight,
    ...(item.processes || []),
  ].filter(Boolean);
  return parts.join(" ");
}
