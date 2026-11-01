import { createContext, useContext, useEffect, useRef, useState } from "react";
import { kvGet, kvPut } from "./remote.js";

// 印刷会社・資材仕入先のマスタ(会社名と種別の一覧)。
// この端末のlocalStorageに持ち、サーバーに繋がっているときは共有データ(KV)とも同期して、端末間で同じ一覧にする。
const LS_KEY = "zk-quote:vendors";
const KV_KEY = "zk-quote:vendors";

// 各要素は { name, kind, memo, days }。memo は自由記入、days は納期の数え方("calendar"=土日も数える / "business"=土日を除く / ""=未設定)。kind は "print"(印刷会社) か "material"(資材仕入先)。
// 昔の形(会社名の文字列だけ)は印刷会社として読む。
export const KIND_PRINT = "print";
export const KIND_MATERIAL = "material";
export const DAYS_LABEL = { calendar: "土日も数える", business: "土日を除く" };
export const VENDOR_KIND_LABEL = { print: "印刷会社", material: "資材仕入先" };

const clean = (list) => {
  const seen = new Set();
  const out = [];
  for (const v of Array.isArray(list) ? list : []) {
    const name = String((v && typeof v === "object" ? v.name : v) || "").trim();
    const kind = v && typeof v === "object" && v.kind === KIND_MATERIAL ? KIND_MATERIAL : KIND_PRINT;
    const key = `${kind}|${name}`;
    if (name && !seen.has(key)) {
      seen.add(key);
      const o = v && typeof v === "object" ? v : {};
      out.push({ name, kind, memo: String(o.memo || ""), days: o.days === "calendar" || o.days === "business" ? o.days : "" });
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
