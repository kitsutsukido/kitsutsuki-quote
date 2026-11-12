import { useRef, useState } from "react";

// 入力欄をクリックすると候補のリストが出る。候補から選ぶか、そのまま自由に入力する。
// 入力中は、入力した文字を含む候補だけに絞る(全角・半角の違いは無視)。
const norm = (v) => String(v || "").normalize("NFKC").toLowerCase();

export function ComboInput({ value, onChange, options, className, placeholder }) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);
  const q = norm(value);
  const exact = options.some((o) => norm(o) === q);
  // 候補ちょうどの値が入っているとき(選んだ直後など)は、全部の候補を見せる
  const shown = !q || exact ? options : options.filter((o) => norm(o).includes(q));
  return (
    <div className="relative">
      <input
        className={className}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        autoComplete="off"
      />
      {open && shown.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-md shadow-sm max-h-48 overflow-auto text-sm">
          {shown.map((o) => (
            <li key={o}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  clearTimeout(blurTimer.current);
                  onChange(o);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-[var(--paper)] ${norm(o) === q ? "text-[var(--accent)] font-medium" : "text-[var(--text)]"}`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
