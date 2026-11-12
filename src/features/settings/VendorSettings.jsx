import { Fragment, useState } from "react";
import { X, Plus } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";
import { useVendors, KIND_PRINT, KIND_MATERIAL, KIND_ASSEMBLY, KIND_IGNORE, VENDOR_KIND_LABEL } from "../../lib/vendors.jsx";
import { offOf, DEFAULT_BREAKS, BREAK_LABEL } from "../../lib/businessDays.js";

// ---------- 印刷会社・資材仕入先マスタ ----------
export function VendorSettings({ lineItems }) {
  return (
    <div className="space-y-4">
      <VendorList kind={KIND_PRINT} lineItems={lineItems} placeholder="例: プリントパック" help="明細の「印刷場所」で候補になります。" />
      <VendorList kind={KIND_MATERIAL} lineItems={lineItems} placeholder="例: シモジマ" help="OPP袋・ダンボールなど資材の「購入場所」で候補になります。" />
      <VendorList kind={KIND_ASSEMBLY} lineItems={lineItems} placeholder="例: 内職市場" help="内職・袋詰め・アッセンブリなどの手作業を頼む先です。内職・加工の明細の「依頼先」(と印刷物の「印刷場所」)で候補になります。" />
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
    setVendors((v) => [...v.filter((x) => !(x.kind === KIND_IGNORE && x.name === n)), { name: n, kind, memo: "", days: "" }]);
  };
  const patch = (name, fields) => setVendors((v) => v.map((x) => (x.kind === kind && x.name === name ? { ...x, ...fields } : x)));
  const dismiss = (name) => setVendors((v) => [...v, { name, kind: KIND_IGNORE, memo: "", days: "" }]);
  const remove = (name) => setVendors((v) => v.filter((x) => !(x.kind === kind && x.name === name)));

  // 今まで同じ種別の明細に入れた会社名のうち、マスタにまだ無いもの
  const itemKind = kind === KIND_MATERIAL ? "material" : kind === KIND_ASSEMBLY ? "assembly" : "print";
  const names = new Set(vendors.map((v) => v.name)); // どの種別にも登録済みの会社は出さない
  const unused = [
    ...new Set((lineItems || []).filter((it) => (it.kind === "material" || it.kind === "assembly" ? it.kind : "print") === itemKind).map((it) => (it.submitTo || "").trim()).filter(Boolean)),
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
      {mine.length === 0 ? (
        <span className="text-xs text-[var(--text-muted)]">まだ登録がありません。</span>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)] text-left text-xs">
                <th className="py-1.5 px-2 font-normal whitespace-nowrap">会社名</th>
                <th className="py-1.5 px-2 font-normal whitespace-nowrap">営業日に含まない日</th>
                <th className="py-1.5 px-2 font-normal">メモ</th>
                <th className="py-1.5 px-2 font-normal w-16"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <Fragment key={v.name}>
                <tr className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1.5 px-2 whitespace-nowrap align-top">{v.name}</td>
                  <td className="py-1.5 px-2">
                    <OffDays vendor={v} onChange={(fields) => patch(v.name, fields)} />
                  </td>
                  <td className="py-1.5 px-2">
                    <input className={`${inputCls} min-w-[10rem]`} value={v.memo} placeholder="例: クリアファイルもここ" onChange={(e) => patch(v.name, { memo: e.target.value })} />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`「${v.name}」をマスタから削除します。よろしいですか？\n(これまでの明細の入力は変わりません)`)) remove(v.name);
                      }}
                      className="text-xs text-[var(--danger)] border border-[var(--border)] rounded-md px-2 py-1"
                    >
                      削除
                    </button>
                  </td>
                </tr>
                {(offOf(v).summer || offOf(v).newyear) && (
                  <tr className="border-b border-[var(--border)] last:border-0 bg-[var(--paper)]">
                    <td></td>
                    <td colSpan={3} className="py-2 px-2">
                      <BreakSettings vendor={v} onChange={(fields) => patch(v.name, fields)} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
          <p className="text-xs text-[var(--text-muted)]">今までの明細で使った会社(押すと登録、×で候補から消す):</p>
          <div className="flex flex-wrap gap-2">
            {unused.map((name) => (
              <span key={name} className="text-xs border border-[var(--border)] rounded-md flex items-center">
                <button onClick={() => add(name)} className="px-2 py-1 flex items-center gap-1" title="押すと登録">
                  <Plus size={12} /> {name}
                </button>
                <button onClick={() => dismiss(name)} className="px-1.5 py-1 border-l border-[var(--border)] text-[var(--text-muted)]" title="この候補を消す(会社ではないものなど)">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 営業日に含まない日(チェックボックス)。昔の「土日を除く」は土曜・日曜にチェックが入った状態で表示する
const OFF_ITEMS = [
  ["sat", "土曜"],
  ["sun", "日曜"],
  ["holiday", "祝日"],
  ["summer", "夏期休暇"],
  ["newyear", "年末年始"],
];
function OffDays({ vendor, onChange }) {
  const off = offOf(vendor);
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {OFF_ITEMS.map(([k, label]) => (
        <label key={k} className="flex items-center gap-1 whitespace-nowrap">
          <input type="checkbox" checked={!!off[k]} onChange={(e) => onChange({ off: { ...off, [k]: e.target.checked }, days: "" })} />
          {label}
        </label>
      ))}
    </div>
  );
}

// 「8/13」→「08-13」、「08-13」→「8/13」
const toMD = (t) => {
  const m = String(t || "").normalize("NFKC").match(/^\s*(\d{1,2})\s*[\/\-月.]\s*(\d{1,2})\s*日?\s*$/);
  if (!m) return null;
  const mo = Number(m[1]);
  const d = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
const showMD = (md) => (md ? `${Number(md.slice(0, 2))}/${Number(md.slice(3, 5))}` : "");

// 月/日の入力(欄を離れたときに形をそろえる。読めないときは元に戻す)
function MonthDay({ value, onChange }) {
  const [draft, setDraft] = useState(null);
  return (
    <input
      className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm w-16 bg-[var(--card)]"
      value={draft ?? showMD(value)}
      placeholder="8/13"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const md = toMD(draft ?? showMD(value));
        if (md) onChange(md);
        setDraft(null);
      }}
    />
  );
}

// 夏期休暇・年末年始の期間。毎年の目安(月/日)を1回入れておき、ずれた年だけ日付で上書きする
function BreakSettings({ vendor, onChange }) {
  const off = offOf(vendor);
  const breaks = vendor.breaks || {};
  const years = breaks.years || [];
  const kinds = ["summer", "newyear"].filter((k) => off[k]);
  const setBreaks = (next) => onChange({ breaks: { ...breaks, ...next } });
  const setYearly = (k, field, md) => setBreaks({ [k]: { ...(breaks[k] || DEFAULT_BREAKS[k]), [field]: md } });
  const setYear = (i, fields) => setBreaks({ years: years.map((y, j) => (j === i ? { ...y, ...fields } : y)) });
  return (
    <div className="space-y-2 text-sm">
      {kinds.map((k) => {
        const yearly = breaks[k] || DEFAULT_BREAKS[k];
        return (
          <div key={k} className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 text-xs text-[var(--text-muted)]">{BREAK_LABEL[k]}</span>
            <span className="text-xs text-[var(--text-muted)]">毎年</span>
            <MonthDay value={yearly.from} onChange={(md) => setYearly(k, "from", md)} />
            <span>〜</span>
            <MonthDay value={yearly.to} onChange={(md) => setYearly(k, "to", md)} />
            {!breaks[k] && <span className="text-[11px] text-[var(--text-muted)]">(目安。会社の発表に合わせて直してください)</span>}
          </div>
        );
      })}
      {years.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[var(--text-muted)]">その年だけ違う期間(毎年の目安より優先):</p>
          {years.map((y, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <select className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm bg-[var(--card)]" value={y.kind} onChange={(e) => setYear(i, { kind: e.target.value })}>
                {kinds.map((k) => <option key={k} value={k}>{BREAK_LABEL[k]}</option>)}
              </select>
              <input type="date" className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm bg-[var(--card)]" value={y.from || ""} onChange={(e) => setYear(i, { from: e.target.value })} />
              <span>〜</span>
              <input type="date" className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm bg-[var(--card)]" value={y.to || ""} onChange={(e) => setYear(i, { to: e.target.value })} />
              <button type="button" onClick={() => setBreaks({ years: years.filter((_, j) => j !== i) })} className="text-[var(--text-muted)] p-1" title="この期間を消す">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setBreaks({ years: [...years, { kind: kinds[0], from: "", to: "" }] })}
        className="text-xs px-2 py-1 border border-[var(--border)] rounded-md flex items-center gap-1"
      >
        <Plus size={12} /> 今年の休みがずれるとき(その年だけの期間を追加)
      </button>
    </div>
  );
}
