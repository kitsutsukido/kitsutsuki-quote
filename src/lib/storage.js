// 見積もり台帳の案件・見積もりデータの永続化。
// GAS(Google Apps Script)でのスプレッドシート連携が本格稼働するまでの暫定保存先としてlocalStorageを使う。
// 将来GAS連携に差し替える際は、各関数の中身を実際のAPI呼び出しに置き換えればよい。

const PREFIX = "zk-quote";

function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    window.localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
  } catch (e) {
    // プライベートモード等でlocalStorageが使えない場合は保存をあきらめる
  }
}

export const loadProjects = (fallback) => load("projects", fallback);
export const saveProjects = (value) => save("projects", value);

export const loadSessions = (fallback) => load("sessions", fallback);
export const saveSessions = (value) => save("sessions", value);

// 過去の不具合でidが重複した明細は、2件目以降に新しいidを振って別々の明細に戻す
const dedupeIds = (items) => {
  if (!Array.isArray(items)) return items;
  const seen = new Set();
  return items.map((it, i) => {
    if (!seen.has(it.id)) {
      seen.add(it.id);
      return it;
    }
    const id = `qli-fix-${Date.now().toString(36)}-${i}`;
    seen.add(id);
    return { ...it, id };
  });
};
export const loadLineItems = (fallback) => dedupeIds(load("lineItems", fallback));
export const saveLineItems = (value) => save("lineItems", value);

export const loadGroups = (fallback) => load("groups", fallback);
export const saveGroups = (value) => save("groups", value);

export const loadProfitSettings = (fallback) => load("profitSettings", fallback);
export const saveProfitSettings = (value) => save("profitSettings", value);

export const loadProfitPatterns = (fallback) => load("profitPatterns", fallback);
export const saveProfitPatterns = (value) => save("profitPatterns", value);

export const loadSheetUrlsByGenre = (fallback) => load("sheetUrlsByGenre", fallback);
export const saveSheetUrlsByGenre = (value) => save("sheetUrlsByGenre", value);
export const loadSecretsByGenre = (fallback) => load("secretsByGenre", fallback);
export const saveSecretsByGenre = (value) => save("secretsByGenre", value);
