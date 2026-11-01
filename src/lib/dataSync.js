import { useCallback, useEffect, useRef, useState } from "react";
import { kvGet, kvPut } from "./remote.js";

// 見積もりデータ本体(案件・見積もり・明細・梱包グループ・収支設定)を、
// 共有データ(KV)と自動で同期する。パソコンとスマホで同じ内容になる。
//
// 共有データ: { updatedAt(最後に保存した時刻), data: {...} } の1つの文書。
// 端末ごとの記録(localStorage zk-quote:syncMeta): { lastSyncedAt: 最後に見た共有データのupdatedAt, dirty: 未送信の変更あり }
//
// 動き:
//  ・開いたとき/画面に戻ったとき: 共有データを確認。自分に未送信の変更が無ければ、新しい共有データに置き換える
//  ・変更したとき: 少し待って共有データへ保存(別の端末が先に保存していたら上書きせず、確認画面を出す)
//  ・見本データのままの端末(まだ何も入れていない)は、共有データを送らない(見本で本物を上書きしない)
//  ・共有データが使えない環境(開発中・未ログイン)では何もしない
const KEY = "zk-quote:data";
const META_KEY = "zk-quote:syncMeta";
const BEFORE_KEY = "zk-quote:backup-before-sync";
const DATA_KEYS = ["projects", "sessions", "lineItems", "groups", "profitSettings", "profitPatterns"];
const SAVE_DELAY_MS = 1500;

const readMeta = () => {
  try {
    return JSON.parse(window.localStorage.getItem(META_KEY) || "{}") || {};
  } catch (e) {
    return {};
  }
};
const writeMeta = (meta) => {
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) {
    /* 保存できなくても続ける */
  }
};
const sigOf = (data) => JSON.stringify(DATA_KEYS.map((k) => data[k]));
export const summarize = (d) => ({
  lots: Array.isArray(d?.projects) ? d.projects.length : 0,
  items: Array.isArray(d?.lineItems) ? d.lineItems.length : 0,
});

// data: 今の状態 / apply(data): 状態を置き換える / seed: 見本データ(まだ何も入れていない状態の判定用)
export function useDataSync({ data, apply, seed }) {
  const [status, setStatus] = useState("checking"); // off | checking | synced | dirty | saving | error
  const [conflict, setConflictState] = useState(null); // { remote }
  const setConflict = (c) => { conflictRef.current = c; setConflictState(c); };
  const dataRef = useRef(data);
  dataRef.current = data;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const seedSig = useRef(sigOf(seed));
  const baseSig = useRef(sigOf(data)); // 起動時・共有データを取り込んだ直後の内容(これと同じなら「変更なし」)
  const ready = useRef(false); // 最初の確認が済み、自動保存してよい状態
  const busy = useRef(false);
  const timer = useRef(null);
  const ver = useRef(0);
  const conflictRef = useRef(null);

  const isPristine = () => sigOf(dataRef.current) === seedSig.current;

  const adopt = useCallback((remote) => {
    // 置き換える前に、この端末のデータを控えとして残す(見本のままなら不要)
    if (!isPristine()) {
      try {
        window.localStorage.setItem(BEFORE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: dataRef.current }));
      } catch (e) {
        /* 控えを残せなくても続ける */
      }
    }
    baseSig.current = sigOf({ ...dataRef.current, ...remote.data });
    applyRef.current(remote.data);
    writeMeta({ lastSyncedAt: remote.updatedAt, dirty: false });
    ready.current = true;
    setConflict(null);
    setStatus("synced");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = useCallback(async (base) => {
    if (busy.current) return;
    busy.current = true;
    setStatus("saving");
    const startVer = ver.current;
    const updatedAt = new Date().toISOString();
    try {
      await kvPut(KEY, { updatedAt, data: dataRef.current }, { baseUpdatedAt: base || "none" });
      const changedMeanwhile = ver.current !== startVer;
      writeMeta({ lastSyncedAt: updatedAt, dirty: changedMeanwhile });
      ready.current = true;
      busy.current = false;
      if (changedMeanwhile) schedule(updatedAt);
      else setStatus("synced");
    } catch (e) {
      busy.current = false;
      if (e.message === "conflict") {
        ready.current = false;
        await check(); // 別の端末が先に保存していた→確認画面へ
      } else setStatus(e.message === "unauthorized" ? "off" : "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schedule = useCallback((base) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => upload(base ?? readMeta().lastSyncedAt), SAVE_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = useCallback(async () => {
    if (busy.current) return;
    let remote;
    try {
      remote = await kvGet(KEY);
    } catch (e) {
      setStatus(e.message === "unauthorized" || /fetch/i.test(e.message) ? "off" : "error");
      return;
    }
    const meta = readMeta();
    if (!remote) {
      // 共有データがまだ無い: 本物のデータがある端末だけが最初の共有データを作る
      if (isPristine()) {
        ready.current = true;
        setStatus("synced");
      } else await upload(null);
      return;
    }
    if (meta.lastSyncedAt === remote.updatedAt) {
      ready.current = true;
      if (meta.dirty) await upload(remote.updatedAt);
      else setStatus("synced");
      return;
    }
    // 共有データが、この端末が最後に見たものと違う
    if (isPristine() || (meta.lastSyncedAt && !meta.dirty)) adopt(remote);
    else {
      ready.current = false;
      clearTimeout(timer.current);
      setStatus("dirty");
      setConflict({ remote });
    }
  }, [adopt, upload]);

  // 起動時と、画面に戻ったときに確認
  useEffect(() => {
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible" && ready.current && !busy.current && !conflictRef.current) check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // データが変わったら、未送信の印を付けて、少し待って保存
  const sig = sigOf(data);
  useEffect(() => {
    if (sig === baseSig.current) return;
    ver.current += 1;
    writeMeta({ ...readMeta(), dirty: true });
    setStatus((s) => (s === "off" ? s : "dirty"));
    if (ready.current) schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const useLocal = () => {
    const remote = conflict?.remote;
    setConflict(null);
    ready.current = true;
    upload(remote?.updatedAt || "none");
  };
  const useRemote = () => conflict?.remote && adopt(conflict.remote);

  // 共有データに最後に保存された時刻(表示用)。保存済みのときだけ使う
  const syncedAt = status === "synced" ? readMeta().lastSyncedAt || "" : "";
  return { status, syncedAt, conflict, useLocal, useRemote, retry: check };
}
