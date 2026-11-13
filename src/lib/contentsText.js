import { buildGroupTree, groupPathLabel } from "./groupTree.js";
import { specString } from "./spec.js";

// 内職会社に共有する「どの梱包の中に何が入っているか」の表(金額・単価・依頼先は入れない)。
// 梱包の階層は「OPP › クリアファイル」のようなパスで1列にまとめる。
export const CONTENTS_COLUMNS = ["梱包", "名前", "仕様", "数量", "備考"];
// 列の幅(画面は%、メールの表はpx)。梱包のパスが長くても名前・仕様・備考が潰れないようにする
export const CONTENTS_WIDTHS_PCT = [20, 18, 32, 7, 23];
const CONTENTS_WIDTHS_PX = [170, 150, 280, 50, 200];

// 見積もり画面と同じ並び(梱包の木の深さ優先)で行を作る。どの梱包にも入っていない明細は最後に
export function contentsRows({ groups, items }) {
  const rows = [];
  const toRow = (it, path) => [path, it.name || "", specString(it), Number(it.qty) || 0, it.remark || ""];
  const walk = (node) => {
    const path = groupPathLabel(groups, node.group.id);
    for (const it of items.filter((x) => x.groupId === node.group.id)) rows.push(toRow(it, path));
    node.children.forEach(walk);
  };
  buildGroupTree(groups).forEach(walk);
  for (const it of items.filter((x) => !x.groupId || !groups.some((g) => g.id === x.groupId))) rows.push(toRow(it, "(指定なし)"));
  return rows;
}

export function contentsTitle({ productName, lotName, qty }) {
  return `${[productName, lotName].filter(Boolean).join("　")}${qty > 0 ? `(${qty}部)` : ""} 中身一覧`;
}

// Excelに貼るとセルに分かれる、タブ区切りのテキスト
export function contentsTsv(title, rows) {
  const clean = (v) => String(v).replace(/[\t\r\n]+/g, " ");
  return [title, "", CONTENTS_COLUMNS.join("\t"), ...rows.map((r) => r.map(clean).join("\t"))].join("\n");
}

// メール(Gmail・Outlookなど)に貼ると表になるHTML
export function contentsHtml(title, rows) {
  const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cell = "border:1px solid #999;padding:4px 8px;";
  const w = (i) => `width:${CONTENTS_WIDTHS_PX[i]}px;min-width:${CONTENTS_WIDTHS_PX[i]}px;`;
  const th = CONTENTS_COLUMNS.map((c, i) => `<th width="${CONTENTS_WIDTHS_PX[i]}" style="${cell}${w(i)}background:#eee;text-align:left;white-space:nowrap;">${esc(c)}</th>`).join("");
  const trs = rows
    .map((r) => `<tr>${r.map((v, i) => `<td style="${cell}${w(i)}vertical-align:top;${i === 3 ? "text-align:right;white-space:nowrap;" : ""}">${esc(v)}</td>`).join("")}</tr>`)
    .join("");
  return `<p>${esc(title)}</p><table style="border-collapse:collapse;font-size:13px;"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}
