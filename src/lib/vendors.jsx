import { createContext, useContext, useEffect, useRef, useState } from "react";
import { kvGet, kvPut } from "./remote.js";

// 印刷会社・購入先のマスタ(会社名の一覧)。
// この端末のlocalStorageに持ち、サーバーに繋がっているときは共有データ(KV)とも同期して、端末間で同じ一覧にする。
const LS_KEY = "zk-quote:vendors";
const KV_KEY = "zk-quote:vendors";

const clean = (list) => {
  const seen = new Set();
  const out = [];
  for (const v of Array.isArray(list) ? list : []) {
    const name = String(v || "").trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
};

const loadLocal = () => {
  try {
    return clean(JSON.parse(window.localStorage.getItem(LS_KEY) || "[]"));
  } catch (e) {
    return [];
  }
};

const VendorsContext = createContext({ vendors: [], setVendors: () => {} });

export function VendorsProvider({ children }) {
  const [vendors, setVendorsState] = useState(loadLocal);
  const synced = useRef(false); // 共有データを読み終えるまでは書き込まない

  const setVendors = (next) => setVendorsState((prev) => clean(typeof next === "function" ? next(prev) : next));

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(vendors));
    } catch (e) {
      /* 保存できなくても続ける */
    }
  }, [vendors]);

  // 起動時: 共有データがあれば、この端末の一覧と合わせる(会社名は消さず足し合わせる)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await kvGet(KV_KEY);
        if (cancelled) return;
        if (remote) setVendorsState((prev) => clean([...remote, ...prev]));
        synced.current = true;
        setVendorsState((cur) => [...cur]); // 同期後に一度書き出す
      } catch (e) {
        /* サーバーに繋がらない・未ログインのときはこの端末だけで使う */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!synced.current) return;
    const t = setTimeout(() => kvPut(KV_KEY, vendors).catch(() => {}), 500);
    return () => clearTimeout(t);
  }, [vendors]);

  return <VendorsContext.Provider value={{ vendors, setVendors }}>{children}</VendorsContext.Provider>;
}

export const useVendors = () => useContext(VendorsContext);
