import { Plus, Trash2, GripVertical } from "lucide-react";
import { useDragSort, arrayMove } from "../../lib/useDragSort.js";
import { inputCls } from "../../components/common/inputStyles.js";
import { patternFee, materializePattern } from "../../lib/profitFees.js";

// 手数料・分配の項目と販売パターンの編集(ロットの収支設定タブと、収支設定マスタで共用)
//   fees, patterns: 今の内容(パターンは旧形式でもよい) / onChange(fees, patterns): 直したあとの内容(パターンは新しい形式)
//   readOnly: 見るだけ(マスタを使っているロット)
export function FeePatternEditor({ fees, patterns, onChange, readOnly = false, onAddPattern }) {
  // 直すときは、旧形式のパターンも新しい形式に書き出しておく(読み替えがずれないように)
  const mat = (list = patterns, feeList = fees) => list.map((p) => (p.use ? p : materializePattern(p, feeList)));
  const save = (nextFees, nextPatterns) => onChange(nextFees, nextPatterns);

  const updateFee = (id, fields) => save(fees.map((f) => (f.id === id ? { ...f, ...fields } : f)), mat());
  const addFee = () => {
    const id = `fee-${Date.now()}`;
    // 追加した項目は、どのパターンでも最初は「使う」にする
    save([...fees, { id, name: "新しい項目", kind: "rate", value: 0 }], mat().map((p) => ({ ...p, use: { ...p.use, [id]: true } })));
  };
  const feeSort = useDragSort((from, to) => save(arrayMove(fees, from, to), mat()));
  const removeFee = (f) => {
    if (!window.confirm(`「${f.name}」を削除しますか？(販売パターンの設定からも外れます)`)) return;
    save(
      fees.filter((x) => x.id !== f.id),
      mat().map((p) => {
        const use = { ...p.use };
        const overrides = { ...p.overrides };
        delete use[f.id];
        delete overrides[f.id];
        return { ...p, use, overrides };
      })
    );
  };

  const updatePattern = (id, fn) => save(fees, mat().map((p) => (p.id === id ? fn(p) : p)));
  const setPatternUse = (p, feeId, on) => updatePattern(p.id, (x) => ({ ...x, use: { ...x.use, [feeId]: on } }));
  // 上書きの値。入力中の空欄は "" のまま持ち(計算は項目の値)、欄を離れたときに
  // 空欄や項目と同じ値なら上書きをやめる(項目の値を変えたらパターンにも反映されるように)
  const setPatternOverride = (p, feeId, v) =>
    updatePattern(p.id, (x) => ({ ...x, overrides: { ...x.overrides, [feeId]: v === "" ? "" : Number(v) } }));
  const tidyPatternOverride = (p, f) => {
    const raw = p.overrides?.[f.id];
    if (raw === undefined) return;
    if (raw === "" || Number(raw) === Number(f.value)) {
      updatePattern(p.id, (x) => {
        const overrides = { ...x.overrides };
        delete overrides[f.id];
        return { ...x, overrides };
      });
    }
  };
  const patternSort = useDragSort((from, to) => save(fees, arrayMove(mat(), from, to)));
  const removePattern = (id) => save(fees, mat().filter((p) => p.id !== id));
  const addPattern = () => {
    const id = `pp-${Date.now()}`;
    // 新しいパターンは、全部の項目を「使う」で始める
    save(fees, [...mat(), { id, name: "新しいパターン", use: Object.fromEntries(fees.map((f) => [f.id, true])), overrides: {} }]);
    onAddPattern?.(id);
  };

  // ドラッグ中の見た目:動かしている行は半透明、落とす位置に線
  const dragCls = (drag, i, base = "flex flex-wrap items-center gap-2") => {
    if (!drag) return base;
    if (i === drag.from) return `${base} opacity-50`;
    if (i === drag.over) return `${base} ${drag.over < drag.from ? "border-t-2" : "border-b-2"} border-[var(--accent)]`;
    return base;
  };
  const unit = (f) => (f.kind === "yen" ? "円/部" : "%");
  const sel = "border border-[var(--border)] rounded-md px-2 py-1.5 text-sm bg-[var(--card)]";

  return (
    <fieldset disabled={readOnly} className={`space-y-4 min-w-0 ${readOnly ? "opacity-80" : ""}`}>
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-1">手数料・分配の項目{readOnly ? "" : "(名前・種類・値を変えられます。販売パターンで使う項目を選びます)"}</p>
        <div className="space-y-2">
          {fees.map((f, i) => (
            <div key={f.id} ref={feeSort.itemRef(i)} className={dragCls(feeSort.drag, i)}>
              {!readOnly && <span {...feeSort.handleProps(i)} className="text-[var(--text-muted)] p-1 -ml-1 select-none"><GripVertical size={16} /></span>}
              <input className={`${inputCls} !w-48`} value={f.name} onChange={(e) => updateFee(f.id, { name: e.target.value })} aria-label="項目名" />
              <select className={sel} value={f.kind} onChange={(e) => updateFee(f.id, { kind: e.target.value })}>
                <option value="rate">売上の%</option>
                <option value="yen">1部あたり円</option>
              </select>
              <input type="number" className={`${inputCls} !w-28`} value={f.value} onChange={(e) => updateFee(f.id, { value: e.target.value === "" ? 0 : Number(e.target.value) })} aria-label="値" />
              <span className="text-xs text-[var(--text-muted)]">{unit(f)}</span>
              {!readOnly && <button onClick={() => removeFee(f)} className="text-[var(--danger)]" title="この項目を削除"><Trash2 size={15} /></button>}
            </div>
          ))}
        </div>
        {!readOnly && (
          <button onClick={addFee} className="mt-2 text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]">
            <Plus size={14} /> 項目を追加
          </button>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-[var(--ink)]">販売パターン</p>
          {!readOnly && (
            <button onClick={addPattern} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]">
              <Plus size={14} /> パターンを追加
            </button>
          )}
        </div>
        {patterns.length === 0 && <p className="text-xs text-[var(--text-muted)]">販売パターンがありません。</p>}
        <div className="space-y-2">
          {patterns.map((p, i) => (
            <div key={p.id} ref={patternSort.itemRef(i)} className={`border border-[var(--border)] rounded-md p-3 ${dragCls(patternSort.drag, i, "")}`}>
              <div className="flex justify-between items-center mb-2 gap-2">
                {!readOnly && <span {...patternSort.handleProps(i)} className="text-[var(--text-muted)] p-1 -ml-1 select-none"><GripVertical size={16} /></span>}
                <input className="flex-1 min-w-0 text-sm font-medium border-b border-transparent hover:border-[var(--border)] focus:border-[var(--ink-soft)] outline-none bg-transparent"
                  value={p.name} onChange={(e) => updatePattern(p.id, (x) => ({ ...x, name: e.target.value }))} />
                {!readOnly && <button onClick={() => removePattern(p.id)} className="text-[var(--danger)]" title="このパターンを削除"><Trash2 size={15} /></button>}
              </div>
              <div className="space-y-1.5">
                {fees.map((f) => {
                  const { on, override } = patternFee(p, f);
                  return (
                    <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <label className="flex items-center gap-1.5 min-w-[11rem]">
                        <input type="checkbox" checked={on} onChange={(e) => setPatternUse(p, f.id, e.target.checked)} />
                        {f.name}
                      </label>
                      {on && (
                        <>
                          {/* 最初から項目の値を表示。直した値はこのパターンだけに使う */}
                          <input type="number" className={`${inputCls} !w-24`}
                            value={p.use && p.overrides?.[f.id] !== undefined ? p.overrides[f.id] : override ?? f.value}
                            onChange={(e) => setPatternOverride(p, f.id, e.target.value)}
                            onBlur={() => tidyPatternOverride(p, f)} />
                          <span className="text-xs text-[var(--text-muted)]">
                            {unit(f)}{override !== null && override !== Number(f.value) ? `(項目の値は${f.value}${unit(f)})` : ""}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
