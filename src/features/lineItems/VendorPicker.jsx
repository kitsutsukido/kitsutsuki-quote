import { useMemo, useState } from "react";
import { inputCls } from "../../components/common/inputStyles.js";
import { useVendors } from "../../lib/vendors.jsx";

const norm = (s) => String(s || "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");

// 印刷場所・購入場所の入力。会社が増えても使えるよう、
// ・入力した文字で候補を絞り込む(使った回数が多い順)
// ・よく使う上位5社は、いつでもボタンで選べる
// 登録にない会社名も、そのまま入力できる。
export function VendorPicker({ value, onChange, placeholder, lineItems }) {
  const { vendors } = useVendors();
  const [open, setOpen] = useState(false);

  const ranked = useMemo(() => {
    const count = new Map();
    for (const it of lineItems || []) {
      const n = (it.submitTo || "").trim();
      if (n) count.set(n, (count.get(n) || 0) + 1);
    }
    return [...vendors].sort((a, b) => (count.get(b) || 0) - (count.get(a) || 0));
  }, [vendors, lineItems]);

  const q = norm(value);
  const matches = ranked.filter((v) => v !== value && (q === "" || norm(v).includes(q))).slice(0, 8);
  const top = ranked.slice(0, 5);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-auto bg-[var(--card)] border border-[var(--border)] rounded-md shadow-md text-sm">
          {matches.map((v) => (
            <li key={v}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(v); }} className="w-full text-left px-2 py-1.5 hover:bg-[var(--paper)]">
                {v}
              </button>
            </li>
          ))}
        </ul>
      )}
      {top.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {top.map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => pick(v)}
              className={`text-xs px-2 py-0.5 rounded-md border ${value === v ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text)]"}`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
