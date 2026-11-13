import { createContext, useContext, useEffect, useRef, useState } from "react";
import { kvGet, kvPut } from "./remote.js";

// 印刷会社・資材仕入先のマスタ(会社名と種別の一覧)。
// この端末のlocalStorageに持ち、サーバーに繋がっているときは共有データ(KV)とも同期して、端末間で同じ一覧にする。
const LS_KEY = "zk-quote:vendors";
const KV_KEY = "zk-quote:vendors";

// 各要素は { name, kind, memo, days, off?, breaks? }。memo は自由記入。
// off は営業日に含まない日のチェック、breaks は夏期休暇・年末年始の期間(lib/businessDays.js)。
// days は昔の納期の数え方("calendar"=土日も数える / "business"=土日を除く / ""=未設定)。off があれば off を使う。kind は "print"(印刷会社)・"material"(資材仕入先)・"assembly"(加工・組立の外注先)。
// 昔の形(会社名の文字列だけ)は印刷会社として読む。
export const KIND_PRINT = "print";
export const KIND_MATERIAL = "material";
export const KIND_ASSEMBLY = "assembly";
export const KIND_IGNORE = "ignore"; // 「今までの明細で使った会社」の候補から外した名前(候補にも一覧にも出ない)
export const DAYS_LABEL = { calendar: "土日も数える", business: "土日を除く" };
export const VENDOR_KIND_LABEL = { print: "印刷会社", material: "資材仕入先", assembly: "加工・組立の外注先" };

const clean = (list) => {
  const seen = new Set();
  const out = [];
  for (const v of Array.isArray(list) ? list : []) {
    const name = String((v && typeof v === "object" ? v.name : v) || "").trim();
    const kind = v && typeof v === "object" && v.kind === KIND_MATERIAL || v.kind === KIND_ASSEMBLY || v.kind === KIND_IGNORE ? v.kind : KIND_PRINT;
    const key = `${kind}|${name}`;
    if (name && !seen.has(key)) {
      seen.add(key);
      const o = v && typeof v === "object" ? v : {};
      const v2 = { name, kind, memo: String(o.memo || ""), days: o.days === "calendar" || o.days === "business" ? o.days : "" };
      // 営業日に含まない日(チェックボックス)と、夏期休暇・年末年始の期間(businessDays.js)
      if (o.off && typeof o.off === "object") v2.off = { sat: !!o.off.sat, sun: !!o.off.sun, holiday: !!o.off.holiday, summer: !!o.off.summer, newyear: !!o.off.newyear };
      if (o.breaks && typeof o.breaks === "object") v2.breaks = o.breaks;
      out.push(v2);
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
