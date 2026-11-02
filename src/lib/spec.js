// 明細の種別: 印刷物(既定) / 資材(OPP袋・ダンボールなど) / 内職・加工(アッセンブリ・袋詰めなどの手作業)
// 資材と内職・加工は印刷しないので、色・紙・加工は持たない(仕様は「名称・作業内容」と備考だけ)
export const KIND_PRINT = "print";
export const KIND_MATERIAL = "material";
export const KIND_ASSEMBLY = "assembly";

export const isMaterial = (item) => item.kind === KIND_MATERIAL;
export const isAssembly = (item) => item.kind === KIND_ASSEMBLY;
export const isPrint = (item) => !isMaterial(item) && !isAssembly(item);

// withProcesses=false: 加工を除いた仕様(加工は別行の箇条書きで出すとき用)
export function specString(item, { withProcesses = true } = {}) {
  if (!isPrint(item)) {
    return [item.size, item.note].filter(Boolean).join("・");
  }
  // 色数は「指定なし」(空)のとき表示しない(クリアファイルなど面の区別がないもの用)
  const front = item.colorFront || "";
  const colors = front.endsWith("*") ? `${front.slice(0, -1)}(面指定なし)` : [front, item.colorBack].filter(Boolean).join("/");
  const parts = [
    // 折り後のサイズは、加工ではなく大きさの情報なのでサイズの横に出す(例: A4(折り後A6))
    item.foldedSize ? `${item.size || ""}(折り後${item.foldedSize})` : item.size,
    colors,
    item.paper ? `${item.paper}${item.weight || ""}` : item.weight,
    item.paperColor ? `紙色:${item.paperColor}` : "",
    item.inkColor ? `インク:${item.inkColor}` : "",
    ...(withProcesses ? item.processes || [] : []),
  ].filter(Boolean);
  return parts.join(" ");
}
