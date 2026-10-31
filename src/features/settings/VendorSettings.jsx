import { useState } from "react";
import { X, Plus } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";
import { useVendors } from "../../lib/vendors.jsx";

// ---------- 印刷会社・購入先マスタ ----------
export function VendorSettings({ lineItems }) {
  const { vendors, setVendors } = useVendors();
  const [input, setInput] = useState("");

  const add = () => {
    const name = input.trim();
    if (!name) return;
    setVendors((v) => [...v, name]);
    setInput("");
  };
  const remove = (name) => setVendors((v) => v.filter((x) => x !== name));

  // 今まで明細に入れた会社名のうち、マスタにまだ無いもの
  const unused = [...new Set((lineItems || []).map((it) => (it.submitTo || "").trim()).filter(Boolean))].filter((n) => !vendors.includes(n));

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--ink)]">印刷会社・購入先</p>
      <p className="text-xs text-[var(--text-muted)]">
        ここに登録した会社は、明細の「印刷場所/購入場所」をボタンで選べます(登録にない会社も、これまでどおり入力できます)。ログイン中は全部の端末で共有されます。
      </p>
      <div className="flex flex-wrap gap-2">
        {vendors.length === 0 && <span className="text-xs text-[var(--text-muted)]">まだ登録がありません。</span>}
        {vendors.map((name) => (
          <span key={name} className="bg-[var(--paper)] rounded-md px-2 py-1 text-sm flex items-center gap-1">
            {name}
            <X size={13} className="cursor-pointer" onClick={() => remove(name)} />
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="例: プリントパック"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button onClick={add} className="text-sm px-3 border border-[var(--border)] rounded-md flex items-center gap-1 shrink-0">
          <Plus size={14} /> 追加
        </button>
      </div>
      {unused.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[var(--text-muted)]">今までの明細で使った会社(押すと登録):</p>
          <div className="flex flex-wrap gap-2">
            {unused.map((name) => (
              <button key={name} onClick={() => setVendors((v) => [...v, name])} className="text-xs px-2 py-1 border border-[var(--border)] rounded-md flex items-center gap-1">
                <Plus size={12} /> {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
