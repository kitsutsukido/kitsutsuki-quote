// 明細の種別: 印刷物(既定) / 資材(OPP袋・ダンボールなど。印刷しないので色・紙・加工は持たない)
export const KIND_PRINT = "print";
export const KIND_MATERIAL = "material";

export const isMaterial = (item) => item.kind === KIND_MATERIAL;

// withProcesses=false: 加工を除いた仕様(加工は別行の箇条書きで出すとき用)
export function specString(item, { withProcesses = true } = {}) {
  if (isMaterial(item)) {
    return [item.size, item.note].filter(Boolean).join("・");
  }
  // 色数は「指定なし」(空)のとき表示しない(クリアファイルなど面の区別がないもの用)
  const front = item.colorFront || "";
  const colors = front.endsWith("*") ? `${front.slice(0, -1)}(面指定なし)` : [front, item.colorBack].filter(Boolean).join("/");
  const parts = [
    item.size,
    colors,
    item.paper ? `${item.paper}${item.weight || ""}` : item.weight,
    item.paperColor ? `紙色:${item.paperColor}` : "",
    item.inkColor ? `インク:${item.inkColor}` : "",
    ...(withProcesses ? item.processes || [] : []),
    withProcesses && item.foldedSize ? `折り後:${item.foldedSize}` : "",
  ].filter(Boolean);
  return parts.join(" ");
}
