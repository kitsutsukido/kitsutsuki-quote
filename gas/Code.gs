/**
 * 見積もりアプリ(謎文具キツツキ堂見積台帳) ⇄ Googleスプレッドシート連携スクリプト
 *
 * 在庫管理アプリ(謎文具キツツキ堂在庫台帳)とは完全に別のApps Scriptプロジェクト・
 * 別のウェブアプリデプロイとして動かす想定。スプレッドシート自体は在庫アプリと同じ
 * ファイル(商品マスタ・資材マスタが既にあるファイル)を共有してよいが、このスクリプトは
 * そのファイルに見積もりアプリ専用のシートを追加するだけで、在庫アプリ側のシート
 * (商品マスタ・資材マスタ等)には一切読み書きしない。
 *
 * 使い方:
 * 1. (在庫アプリと同じ)連携させたいGoogleスプレッドシートを開く
 * 2. 拡張機能 > Apps Script を開く
 * 3. 「+」(プロジェクトを追加)などで、在庫アプリ用のスクリプトとは別の
 *    新しいスクリプトファイル(このファイル)を追加する
 *    ※ 在庫アプリ用の既存コード(Code.gs等)は絶対に上書き・削除しないこと
 * 4. 上部の「デプロイ」>「新しいデプロイ」を選択
 * 5. 種類の選択で「ウェブアプリ」を選ぶ
 * 6. 「アクセスできるユーザー」を「全員」に設定してデプロイ
 *    (これは在庫アプリのデプロイとは別の、新規のデプロイになる)
 * 7. 発行された「ウェブアプリのURL」を見積もりアプリ側の設定に使う
 */

const SHEETS = {
  projects: "商品案件",
  sessions: "見積もりセッション",
  lineItems: "見積もり明細",
  groups: "梱包グループマスタ",
  profitSettings: "収支設定",
  profitPatterns: "販売パターン",
};

// legacyNames: このシートの表示名を過去に変更したことがある場合、旧名の配列を渡す。
// 新名のシートが無く、旧名のシートが見つかった場合は、新規に空シートを作るのでは
// なく、既存シートをそのままリネームして中身を引き継ぐ。
function getOrCreateSheet_(name, legacyNames) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (sh) return sh;
  if (legacyNames) {
    for (let i = 0; i < legacyNames.length; i++) {
      const legacySh = ss.getSheetByName(legacyNames[i]);
      if (legacySh) {
        legacySh.setName(name);
        return legacySh;
      }
    }
  }
  return ss.insertSheet(name);
}

function writeArrayToSheet_(sheetName, arr, legacyNames) {
  const sh = getOrCreateSheet_(sheetName, legacyNames);
  sh.clearContents();
  if (!arr || !arr.length) return;
  const headers = Object.keys(arr[0]);
  const rows = arr.map((obj) => headers.map((h) => (obj[h] === undefined ? "" : obj[h])));
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function readSheetAsArray_(sheetName, legacyNames) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(sheetName);
  if (!sh && legacyNames) {
    for (let i = 0; i < legacyNames.length; i++) {
      sh = ss.getSheetByName(legacyNames[i]);
      if (sh) break;
    }
  }
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}

// lineItems.processes は文字列の配列(例: ["展開A4", "十字折り"])なので、
// シート1セルに収めるためJSON文字列にして書き込み、読み込み時にパースし直す。
function lineItemsForSheet_(lineItems) {
  return (lineItems || []).map((it) =>
    Object.assign({}, it, { processes: JSON.stringify(it.processes || []) })
  );
}

function lineItemsFromSheet_(rows) {
  return (rows || []).map((row) => {
    let processes = [];
    try {
      processes = JSON.parse(row.processes || "[]");
    } catch (e) {
      processes = [];
    }
    return Object.assign({}, row, { processes });
  });
}

// profitSettings はアプリ内では { [projectId]: {price, facilityRate, ...} } という
// projectIdキーのオブジェクトだが、スプレッドシート上では1行=1案件の表の方が扱い
// やすいため、doPost/doGetの境界でオブジェクト⇄配列を変換する。
function profitSettingsToRows_(settingsObj) {
  return Object.keys(settingsObj || {}).map((projectId) => {
    const s = settingsObj[projectId] || {};
    return {
      projectId: projectId,
      price: s.price,
      facilityRate: s.facilityRate,
      localSalesRate: s.localSalesRate,
      royaltyRate: s.royaltyRate,
      taxRate: s.taxRate,
    };
  });
}

function profitSettingsFromRows_(rows) {
  const obj = {};
  (rows || []).forEach((row) => {
    obj[row.projectId] = {
      price: Number(row.price) || 0,
      facilityRate: Number(row.facilityRate) || 0,
      localSalesRate: Number(row.localSalesRate) || 0,
      royaltyRate: Number(row.royaltyRate) || 0,
      taxRate: Number(row.taxRate) || 0,
    };
  });
  return obj;
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.type === "full-sync") {
    // フロント側が一部のフィールドだけ送ってくることもあるため、
    // 存在するフィールドだけを書き込む(未送信の項目は上書きしない)。
    const data = body.data || {};
    if (data.projects !== undefined) writeArrayToSheet_(SHEETS.projects, data.projects);
    if (data.sessions !== undefined) writeArrayToSheet_(SHEETS.sessions, data.sessions);
    if (data.lineItems !== undefined) writeArrayToSheet_(SHEETS.lineItems, lineItemsForSheet_(data.lineItems));
    if (data.groups !== undefined) writeArrayToSheet_(SHEETS.groups, data.groups);
    if (data.profitSettings !== undefined) writeArrayToSheet_(SHEETS.profitSettings, profitSettingsToRows_(data.profitSettings));
    if (data.profitPatterns !== undefined) writeArrayToSheet_(SHEETS.profitPatterns, data.profitPatterns);
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "unknown type" })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const data = {
    projects: readSheetAsArray_(SHEETS.projects),
    sessions: readSheetAsArray_(SHEETS.sessions),
    lineItems: lineItemsFromSheet_(readSheetAsArray_(SHEETS.lineItems)),
    groups: readSheetAsArray_(SHEETS.groups),
    profitSettings: profitSettingsFromRows_(readSheetAsArray_(SHEETS.profitSettings)),
    profitPatterns: readSheetAsArray_(SHEETS.profitPatterns),
  };
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", data })).setMimeType(ContentService.MimeType.JSON);
}
