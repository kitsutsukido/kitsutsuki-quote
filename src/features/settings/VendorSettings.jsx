import { useState } from "react";
import { X, Plus } from "lucide-react";
import { inputCls } from "../../components/common/inputStyles.js";
import { useVendors, KIND_PRINT, KIND_MATERIAL, KIND_ASSEMBLY, KIND_IGNORE, VENDOR_KIND_LABEL, DAYS_LABEL } from "../../lib/vendors.jsx";

// ---------- 印刷会社・資材仕入先マスタ ----------
export function VendorSettings({ lineItems }) {
  return (
    <div className="space-y-4">
      <VendorList kind={KIND_PRINT} lineItems={lineItems} placeholder="例: プリントパック" help="明細の「印刷場所」で候補になります。" />
      <VendorList kind={KIND_MATERIAL} lineItems={lineItems} placeholder="例: シモジマ" help="OPP袋・ダンボールなど資材の「購入場所」で候補になります。" />
      <VendorList kind={KIND_ASSEMBLY} lineItems={lineItems} placeholder="例: 内職市場" help="内職・袋詰め・アッセンブリなどの手作業を頼む先です。印刷物の明細の「印刷場所」で候補になります。" />
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
  const itemKind = kind === KIND_MATERIAL ? "material" : "print";
  const names = new Set(vendors.map((v) => v.name)); // どの種別にも登録済みの会社は出さない
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
      {mine.length === 0 ? (
        <span className="text-xs text-[var(--text-muted)]">まだ登録がありません。</span>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)] text-left text-xs">
                <th className="py-1.5 px-2 font-normal whitespace-nowrap">会社名</th>
                <th className="py-1.5 px-2 font-normal whitespace-nowrap">納期の数え方</th>
                <th className="py-1.5 px-2 font-normal">メモ</th>
                <th className="py-1.5 px-2 font-normal w-16"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v.name} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1.5 px-2 whitespace-nowrap">{v.name}</td>
                  <td className="py-1.5 px-2">
                    <select className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm bg-[var(--card)]" value={v.days} onChange={(e) => patch(v.name, { days: e.target.value })}>
                      <option value="">未設定</option>
                      <option value="calendar">{DAYS_LABEL.calendar}</option>
                      <option value="business">{DAYS_LABEL.business}</option>
                    </select>
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
