import { buildGroupTree } from "./groupTree.js";
import { specString } from "./spec.js";

// 内職会社に共有する「どの梱包の中に何が入っているか」のテキスト(金額・単価は入れない)。
// メールに貼っても崩れないよう、表ではなく「↳」と全角スペースの字下げで階層を表す。
// 例: ■OPP / ↳ 難易度表 / ↳ ■クリアファイル / 　↳ ストーリー
export function contentsText({ productName, lotName, qty, groups, items }) {
  const lines = [];
  const title = [productName, lotName].filter(Boolean).join("　");
  lines.push(`${title}${qty > 0 ? `(${qty}部)` : ""} 中身一覧`);
  lines.push("");

  const itemLine = (it, indent) => {
    const spec = specString(it);
    const parts = [it.name || "(名前なし)", spec].filter(Boolean).join("　");
    return `${indent}↳ ${parts}　×${Number(it.qty) || 0}`;
  };

  // 明細のない枝は出さない(見積もり画面と同じ)
  const hasItems = (node) => items.some((it) => it.groupId === node.group.id) || node.children.some(hasItems);
  const walk = (node) => {
    if (!hasItems(node)) return;
    // 最上位の梱包は「■名前」、その中の梱包は親の中身と同じ位置に「↳ ■名前」
    const head = node.depth === 0 ? "" : `${"　".repeat(node.depth - 1)}↳ `;
    lines.push(`${head}■${node.group.name}`);
    for (const it of items.filter((x) => x.groupId === node.group.id)) lines.push(itemLine(it, "　".repeat(node.depth)));
    node.children.forEach(walk);
  };
  buildGroupTree(groups).forEach((n) => {
    walk(n);
  });

  const ungrouped = items.filter((it) => !it.groupId || !groups.some((g) => g.id === it.groupId));
  if (ungrouped.length > 0) {
    lines.push("■梱包の指定なし");
    for (const it of ungrouped) lines.push(itemLine(it, ""));
  }
  return lines.join("\n");
}
