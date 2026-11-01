import { useState } from "react";
import { X, Plus } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";
import { useVendors, KIND_PRINT, KIND_MATERIAL, VENDOR_KIND_LABEL } from "../../lib/vendors.jsx";

// ---------- 印刷会社・資材仕入先マスタ ----------
export function VendorSettings({ lineItems }) {
  return (
    <div className="space-y-4">
      <VendorList kind={KIND_PRINT} lineItems={lineItems} placeholder="例: プリントパック" help="明細の「印刷場所」で候補になります。" />
      <VendorList kind={KIND_MATERIAL} lineItems={lineItems} placeholder="例: シモジマ" help="OPP袋・ダンボールなど資材の「購入場所」で候補になります。" />
    </div>
  );
}

function VendorList({ kind, lineItems, placeholder, help }) {
  const { vendors, setVendors } = useVendors();
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const mine = vendors.filter((v) => v.kind === kind);
  const shown = mine.filter((v) => v.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const add = (name) => {
    const n = name.trim();
    if (!n) return;
    setVendors((v) => [...v, { name: n, kind }]);
  };
  const remove = (name) => setVendors((v) => v.filter((x) => !(x.kind === kind && x.name === name)));

  // 今まで同じ種別の明細に入れた会社名のうち、マスタにまだ無いもの
  const itemKind = kind === KIND_MATERIAL ? "material" : "print";
  const names = new Set(mine.map((v) => v.name));
  const unused = [
    ...new Set((lineItems || []).filter((it) => (it.kind === "material" ? "material" : "print") === itemKind).map((it) => (it.submitTo || "").trim()).filter(Boolean)),
  ].filter((n) => !names.has(n));

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--ink)]">{VENDOR_KIND_LABEL[kind]}</p>
      <p className="text-xs text-[var(--text-muted)]">
        {help} 文字を入れると候補が絞り込まれ、よく使う5社はボタンでも選べます(登録にない会社も入力できます)。ログイン中は全部の端末で共有されます。
      </p>
      {mine.length > 8 && (
        <input className={inputCls} placeholder={`登録済み${mine.length}社から検索`} value={filter} onChange={(e) => setFilter(e.target.value)} />
      )}
      <div className="flex flex-wrap gap-2">
        {mine.length === 0 && <span className="text-xs text-[var(--text-muted)]">まだ登録がありません。</span>}
        {shown.map((v) => (
          <span key={v.name} className="bg-[var(--paper)] rounded-md px-2 py-1 text-sm flex items-center gap-1">
            {v.name}
            <X size={13} className="cursor-pointer" onClick={() => remove(v.name)} />
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
              setInput("");
            }
          }}
        />
        <button
          onClick={() => {
            add(input);
            setInput("");
          }}
          className="text-sm px-3 border border-[var(--border)] rounded-md flex items-center gap-1 shrink-0"
        >
          <Plus size={14} /> 追加
        </button>
      </div>
      {unused.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[var(--text-muted)]">今までの明細で使った会社(押すと登録):</p>
          <div className="flex flex-wrap gap-2">
            {unused.map((name) => (
              <button key={name} onClick={() => add(name)} className="text-xs px-2 py-1 border border-[var(--border)] rounded-md flex items-center gap-1">
                <Plus size={12} /> {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
