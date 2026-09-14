const STORAGE_KEY = "zk-quote:relatedApps";

// GAS連携ができるまでの暫定保存先としてlocalStorageを使う
export function loadRelatedApps() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveRelatedApps(apps) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch (e) {
    // プライベートモード等でlocalStorageが使えない場合は保存をあきらめる
  }
}
