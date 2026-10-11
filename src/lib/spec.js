// 明細の種別: 印刷物(既定) / 資材(OPP袋・ダンボールなど。印刷しないので色・紙・加工は持たない)
export const KIND_PRINT = "print";
export const KIND_MATERIAL = "material";

export const isMaterial = (item) => item.kind === KIND_MATERIAL;

export function specString(item) {
  if (isMaterial(item)) {
    return [item.size, item.note].filter(Boolean).join("・");
  }
  // 色数は「指定なし」(空)のとき表示しない(クリアファイルなど面の区別がないもの用)
  const colors = [item.colorFront, item.colorBack].filter(Boolean).join("/");
  const parts = [
    item.size,
    colors,
    item.paper ? `${item.paper}${item.weight || ""}` : item.weight,
    item.paperColor ? `紙色:${item.paperColor}` : "",
    item.inkColor ? `インク:${item.inkColor}` : "",
    ...(item.processes || []),
  ].filter(Boolean);
  return parts.join(" ");
}
