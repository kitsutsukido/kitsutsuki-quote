// ---------- 初期データ(見積もり・入稿管理のスプレッドシートから) ----------
// 商品 = 在庫管理アプリの商品マスタと共通のproductIdで識別する(デザイン単位)。
// 商品名は当面、見積もりアプリ側の表示用キャッシュとして保持する。
// 案件 = その商品の印刷ロット(発注のたびに増えていく想定)
export const initialProducts = [
  { id: "P001", name: "深海遊園地からの招待状", genre: "招待状シリーズ" },
  { id: "P003", name: "不揃いなトランプ王国からの招待状", genre: "招待状シリーズ" },
  { id: "P002", name: "空飛ぶ寝台列車からの招待状", genre: "招待状シリーズ" },
  { id: "P004", name: "おかしな監獄からの招待状", genre: "招待状シリーズ" },
];

export const initialProjects = [
  { id: "prj-shinkai-2025", productId: "P001", round: "2025年11月ロット", qty: 500, status: "完了" },
  { id: "prj-shinkai", productId: "P001", round: "2026年5月ロット", qty: 500, status: "進行中" },
  { id: "prj-trump", productId: "P003", round: "2026年4月ロット", qty: 500, status: "進行中" },
  { id: "prj-shindai", productId: "P002", round: "2024年6月ロット", qty: 500, status: "完了" },
  { id: "prj-kangoku", productId: "P004", round: "2025年5月ロット", qty: 500, status: "完了" },
];

// 梱包グループは2階層：外側の梱包(例：OPP＝全品まとめて入れる袋) > 中の小分け梱包(例：招待状・アトラクション謎セット)
export const initialGroups = [
  { id: "outer1", productId: "P001", name: "OPP", parentId: null, color: "sky" },
  { id: "g-clearfile", productId: "P001", name: "クリアファイル", parentId: "outer1", color: "amber" },
  { id: "g-invite", productId: "P001", name: "招待状", parentId: "outer1", color: "emerald" },
  { id: "g-attraction", productId: "P001", name: "アトラクション謎セット", parentId: "outer1", color: "violet" },
  { id: "g-backyard", productId: "P001", name: "バックヤード", parentId: "outer1", color: "rose" },
  { id: "g-triton", productId: "P001", name: "トリトンの宝箱", parentId: "outer1", color: "sky" },
  { id: "g-labo", productId: "P001", name: "ラボ", parentId: "outer1", color: "amber" },
];

export const initialSessions = [
  // 深海遊園地：初回ロット(2025年11月)だけ仮見積もりを経て確定
  { id: "qs1", projectId: "prj-shinkai-2025", label: "仮見積もり①", date: "2025-08-01", status: "仮" },
  { id: "qs2", projectId: "prj-shinkai-2025", label: "仮見積もり②", date: "2025-09-15", status: "仮" },
  { id: "qs3", projectId: "prj-shinkai-2025", label: "確定見積もり", date: "2025-10-01", status: "確定" },
  // 深海遊園地：増刷ロット(2026年5月)は仮を経ずにいきなり確定
  { id: "qs5", projectId: "prj-shinkai", label: "確定見積もり", date: "2026-04-01", status: "確定" },
  { id: "qs4", projectId: "prj-trump", label: "仮見積もり①", date: "2026-02-01", status: "仮" },
];

let lineItemSeq = 1;
export const createLineItem = (fields) => ({
  id: `qli-${lineItemSeq++}`,
  sessionId: "qs5",
  groupId: null,
  name: "",
  size: "",
  paper: "",
  weight: "",
  colorFront: "4c",
  colorBack: "0c",
  processes: [],
  qty: 500,
  amount: 0,
  submitTo: "",
  leadTime: "",
  note: "",
  purchaseStatus: "未",
  plannedDate: "",
  actualDate: "",
  ...fields,
});

// 増刷ロット(2026年5月・進行中)の明細。外側の梱包「OPP」に全品が入り、その中を小分け梱包で分ける
export const initialLineItems = [
  // 小分け梱包なし・外側の梱包(OPP)に直接入るもの
  createLineItem({ groupId: "outer1", name: "OPP", size: "A5", colorFront: "0c", colorBack: "0c", amount: 2310, submitTo: "シモジマ", purchaseStatus: "済", actualDate: "2026-04-02" }),
  createLineItem({ groupId: "outer1", name: "難易度表", size: "A7", amount: 1420, submitTo: "プリントパック", purchaseStatus: "済", actualDate: "2026-04-08" }),
  // 小分け梱包：クリアファイル
  createLineItem({ groupId: "g-clearfile", name: "クリアファイル", size: "A5", amount: 28050, submitTo: "カサマート", leadTime: "6営業日", purchaseStatus: "済", actualDate: "2026-04-10" }),
  createLineItem({ groupId: "g-clearfile", name: "ストーリー/ルール", size: "A5", colorBack: "0c", amount: 2270, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "済", actualDate: "2026-04-08" }),
  createLineItem({ groupId: "g-clearfile", name: "アクションシート", size: "A5", colorBack: "4c", amount: 2740, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  // 小分け梱包：招待状
  createLineItem({ groupId: "g-invite", name: "封筒", size: "洋２カマス", amount: 30855, submitTo: "プリントパック", leadTime: "3営業日", purchaseStatus: "済", plannedDate: "2026-09-15" }),
  createLineItem({ groupId: "g-invite", name: "チケット", size: "変形", amount: 2380, submitTo: "プリントパック", purchaseStatus: "済", plannedDate: "2026-09-20" }),
  createLineItem({ groupId: "g-invite", name: "遊園地マップ", size: "A6", processes: ["展開A4", "十字折り"], amount: 4205, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  createLineItem({ groupId: "g-invite", name: "招待状", size: "A6", processes: ["展開A5", "二つ折り"], amount: 1980, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  // 小分け梱包：アトラクション謎セット
  createLineItem({ groupId: "g-attraction", name: "OPP", size: "A6", amount: 1100, submitTo: "シモジマ", purchaseStatus: "済", actualDate: "2026-04-02" }),
  createLineItem({ groupId: "g-attraction", name: "手紙", size: "A6", amount: 1360, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  createLineItem({ groupId: "g-attraction", name: "アトラクション謎", size: "A6", processes: ["展開A4", "十字折り"], amount: 4205, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  // 小分け梱包：バックヤード
  createLineItem({ groupId: "g-backyard", name: "OPP", size: "A6", amount: 1100, submitTo: "シモジマ", leadTime: "7営業日", purchaseStatus: "済", actualDate: "2026-04-02" }),
  createLineItem({ groupId: "g-backyard", name: "バックヤードマップ", size: "A6", processes: ["展開A5", "二つ折り"], amount: 3805, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  // 小分け梱包：トリトンの宝箱
  createLineItem({ groupId: "g-triton", name: "OPP", size: "A6", amount: 1100, submitTo: "シモジマ", leadTime: "7営業日", purchaseStatus: "済", actualDate: "2026-04-02" }),
  createLineItem({ groupId: "g-triton", name: "ラボパスワード", size: "A6", processes: ["展開A5", "二つ折り"], amount: 3805, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  // 小分け梱包：ラボ
  createLineItem({ groupId: "g-labo", name: "OPP", size: "A6", amount: 1100, submitTo: "シモジマ", leadTime: "7営業日", purchaseStatus: "済", actualDate: "2026-04-02" }),
  createLineItem({ groupId: "g-labo", name: "日誌", size: "A6", processes: ["展開A5", "二つ折り"], amount: 3605, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  createLineItem({ groupId: "g-labo", name: "ラボ", size: "A6", colorBack: "4c", amount: 1980, submitTo: "プリントパック", leadTime: "7営業日", purchaseStatus: "未" }),
  // 梱包対象外(内職)
  createLineItem({ groupId: null, name: "アッセ(アッセンブリ)", size: "19点", amount: 41552, submitTo: "内職市場", purchaseStatus: "未" }),
  // 初回ロット(2025年11月・完了)の明細。すべて購入・入稿済み
  createLineItem({ sessionId: "qs3", groupId: "outer1", name: "OPP", size: "A5", amount: 1603, submitTo: "シモジマ", purchaseStatus: "済", actualDate: "2025-10-20" }),
  createLineItem({ sessionId: "qs3", groupId: "g-invite", name: "封筒", size: "洋2カマス", amount: 18700, submitTo: "プリントパック", purchaseStatus: "済", actualDate: "2025-10-25" }),
  createLineItem({ sessionId: "qs3", groupId: "g-attraction", name: "手紙", size: "A6", amount: 1360, submitTo: "プリントパック", purchaseStatus: "済", actualDate: "2025-10-25" }),
];

export const initialProfitSettings = {
  "prj-shinkai": { price: 1800, facilityRate: 0, localSalesRate: 0, royaltyRate: 0, taxRate: 10 },
};

export const initialPatterns = [
  { id: "pp1", projectId: "prj-shinkai", name: "ショップ販売", consignRate: null, shopRate: 5.6, shopFixed: 48 },
  { id: "pp2", projectId: "prj-shinkai", name: "委託販売(30%)", consignRate: 30, shopRate: null, shopFixed: null },
  { id: "pp3", projectId: "prj-shinkai", name: "委託販売(35%)", consignRate: 35, shopRate: null, shopFixed: null },
];
