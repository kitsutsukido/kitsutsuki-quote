import { useCallback, useEffect, useRef, useState } from "react";
import { getConfig, kvGet, kvPut } from "./remote.js";
import { mergeData } from "./mergeLib.js";
import {
  initialProducts,
  initialProjects,
  initialSessions,
  initialGroups,
  initialLineItems,
  initialProfitSettings,
  initialPatterns,
} from "../data/seedData.js";
import {
  loadProjects,
  loadSessions,
  loadGroups,
  loadLineItems,
  loadProfitSettings,
  loadProfitPatterns,
} from "./storage.js";

// 見積もりデータ本体(案件・見積もり・明細・梱包グループ・収支設定)の保存先は、共有データ(KV)の1か所だけ。
// 在庫管理アプリと同じ考え方で、端末のブラウザにはデータを持たない。
//
//  ・開いたとき: 共有データを読み込んでから画面を出す(読めなければ、古いデータで編集しないよう、再試行の画面)
//  ・変更したとき: 少し待って共有データへ保存。別の人が先に保存していたら、変更を項目ごとに自動で合わせてから保存
//  ・開いている間: 30秒ごと・画面に戻ったときに最新を確認して取り込む(自分の未保存の変更は残す)
//  ・共有データが使えない環境(開発中)だけ、従来どおりこの端末のlocalStorageで動く
//
// 共有データ: { updatedAt(最後に保存した時刻), data: {...} } の1つの文書(キー zk-quote:data)
export const DATA_KEY = "zk-quote:data";
const MIGRATED_KEY = "zk-quote:migratedToShared";
const BEFORE_KEY = "zk-quote:backup-before-sync";
export const DATA_KEYS = ["members", "products", "projects", "sessions", "lineItems", "groups", "profitSettings", "profitPatterns"];
const SAVE_DELAY_MS = 1200;
const POLL_MS = 30000;

const SEED = {
  members: [],
  products: initialProducts,
  projects: initialProjects,
  sessions: initialSessions,
  lineItems: initialLineItems,
  groups: initialGroups,
  profitSettings: initialProfitSettings,
  profitPatterns: initialPatterns,
};

export const sigOf = (d) => JSON.stringify(DATA_KEYS.map((k) => d[k]));
export const summarize = (d) => ({
  lots: Array.isArray(d?.projects) ? d.projects.length : 0,
  items: Array.isArray(d?.lineItems) ? d.lineItems.length : 0,
});

// この端末のlocalStorageに残っている(これまでの)データ
const readLocal = () => ({
  members: [], // メンバーは共有データだけで持つ
  products: SEED.products, // 商品は共有データだけで持つ(昔の端末のデータには無い)
  projects: loadProjects(SEED.projects),
  sessions: loadSessions(SEED.sessions),
  groups: loadGroups(SEED.groups),
  lineItems: loadLineItems(SEED.lineItems),
  profitSettings: loadProfitSettings(SEED.profitSettings),
  profitPatterns: loadProfitPatterns(SEED.profitPatterns),
});

const markMigrated = () => {
  try {
    window.localStorage.setItem(MIGRATED_KEY, "1");
  } catch (e) {
    /* 印を付けられなくても続ける */
  }
};
const backupLocal = (data) => {
  try {
    window.localStorage.setItem(BEFORE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch (e) {
    /* 控えを残せなくても続ける */
  }
};

// 起動時に1回。{ mode: "local" | "server" | "error", data, updatedAt, choice?: { local, remote }, message? }
export async function bootstrapData() {
  const cfg = await getConfig();
  if (!cfg || !cfg.googleClientId) return { mode: "local" };
  let remote;
  try {
    remote = await kvGet(DATA_KEY);
  } catch (e) {
    return { mode: "error", message: e.message === "unauthorized" ? "ログインの有効期限が切れました。ページを再読み込みしてください。" : e.message };
  }
  const local = readLocal();
  const pristine = sigOf(local) === sigOf(SEED);
  const migrated = window.localStorage.getItem(MIGRATED_KEY) === "1";

  if (!remote) {
    // 共有データがまだ無い: この端末に本物のデータがあれば、それを最初の共有データにする
    if (pristine) return { mode: "server", data: SEED, updatedAt: null };
    const updatedAt = new Date().toISOString();
    try {
      await kvPut(DATA_KEY, { updatedAt, data: local }, { baseUpdatedAt: "none" });
    } catch (e) {
      return { mode: "error", message: e.message === "conflict" ? "別の端末が先に保存しました。再読み込みしてください。" : e.message };
    }
    markMigrated();
    return { mode: "server", data: local, updatedAt };
  }
  // 初めて共有データに切り替わった端末で、この端末のデータが共有データと違うときだけ、どちらを使うか聞く
  if (!pristine && !migrated && sigOf(local) !== sigOf({ ...SEED, ...remote.data })) {
    return { mode: "server", data: { ...SEED, ...remote.data }, updatedAt: remote.updatedAt, choice: { local, remote } };
  }
  markMigrated();
  return { mode: "server", data: { ...SEED, ...remote.data }, updatedAt: remote.updatedAt };
}

// 初回の選択を確定する
export async function resolveChoice(choice, useLocal) {
  if (useLocal) {
    const updatedAt = new Date().toISOString();
    await kvPut(DATA_KEY, { updatedAt, data: choice.local }, { baseUpdatedAt: choice.remote.updatedAt });
    markMigrated();
    return { mode: "server", data: choice.local, updatedAt };
  }
  backupLocal(choice.local);
  markMigrated();
  return { mode: "server", data: { ...SEED, ...choice.remote.data }, updatedAt: choice.remote.updatedAt };
}

// data: 今の状態 / apply(data): 状態を置き換える
// 複数人で使うので、別の人が先に保存していても上書きせず、変更を項目ごとに合わせてから保存する(mergeLib)
export function useSharedData({ mode, data, apply, initialUpdatedAt }) {
  const [status, setStatus] = useState("ok"); // ok | error
  const dataRef = useRef(data);
  dataRef.current = data;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const lastUpdatedAt = useRef(initialUpdatedAt || null); // 最後に見た・保存した共有データの時刻
  const baseData = useRef(data); // 最後に共有データと同じだった内容(マージの基準)
  const lastSig = useRef(sigOf(data)); // 共有データと同じはずの内容の目印
  const busy = useRef(false);
  const timer = useRef(null);
  const server = mode === "server";

  // 共有データの最新を、この端末の(未保存の変更を含む)内容に合わせて取り込む。
  // 取り込んだあとに自分の変更が残っていれば、状態の変化で自動的に保存される。
  const integrate = useCallback((remote) => {
    const theirs = { ...baseData.current, ...remote.data };
    const merged = mergeData(baseData.current, dataRef.current, theirs);
    baseData.current = theirs;
    lastUpdatedAt.current = remote.updatedAt;
    lastSig.current = sigOf(theirs);
    applyRef.current(merged);
    setStatus("ok");
  }, []);

  const upload = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const payload = dataRef.current;
    const mySig = sigOf(payload);
    const updatedAt = new Date().toISOString();
    try {
      await kvPut(DATA_KEY, { updatedAt, data: payload }, { baseUpdatedAt: lastUpdatedAt.current || "none" });
      lastUpdatedAt.current = updatedAt;
      lastSig.current = mySig;
      baseData.current = payload;
      busy.current = false;
      setStatus("ok");
      if (sigOf(dataRef.current) !== lastSig.current) {
        clearTimeout(timer.current);
        timer.current = setTimeout(upload, 300);
      }
    } catch (e) {
      busy.current = false;
      if (e.message === "conflict") {
        // 別の人が先に保存していた: 最新を読み込んで変更を合わせ、そのあと保存し直す
        const remote = await kvGet(DATA_KEY).catch(() => null);
        if (remote) integrate(remote);
        else {
          setStatus("error");
          clearTimeout(timer.current);
          timer.current = setTimeout(upload, 5000);
        }
      } else {
        setStatus("error");
        clearTimeout(timer.current);
        timer.current = setTimeout(upload, 5000);
      }
    }
  }, [integrate]);

  // 変更したら、少し待って保存
  const sig = sigOf(data);
  useEffect(() => {
    if (!server) return;
    if (sig !== lastSig.current) {
      clearTimeout(timer.current);
      timer.current = setTimeout(upload, SAVE_DELAY_MS);
    }
  }, [sig, server, upload]);

  // 最新を確認して取り込む
  const poll = useCallback(async () => {
    if (!server || busy.current) return;
    let remote;
    try {
      remote = await kvGet(DATA_KEY);
    } catch (e) {
      return;
    }
    if (!remote || remote.updatedAt === lastUpdatedAt.current || busy.current) return;
    integrate(remote);
  }, [server, integrate]);

  useEffect(() => {
    if (!server) return undefined;
    const iv = setInterval(poll, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") poll();
      else if (sigOf(dataRef.current) !== lastSig.current) {
        clearTimeout(timer.current);
        upload(); // 画面を離れるときは、待たずに保存
      }
    };
    const onBeforeUnload = (e) => {
      if (sigOf(dataRef.current) !== lastSig.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", poll);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", poll);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [server, poll, upload]);

  const retry = () => {
    clearTimeout(timer.current);
    upload();
  };

  return { status: server ? status : "off", retry };
}
