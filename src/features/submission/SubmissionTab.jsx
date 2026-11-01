import { SpecText } from "../../components/common/SpecText.jsx";
import { Upload, Undo2 } from "lucide-react";
import { isMaterial } from "../../lib/spec.js";
import { useVendors, DAYS_LABEL } from "../../lib/vendors.jsx";
import { submitDeadline, findVendor, deliveryDateOf } from "../../lib/deadlines.js";
import { inputCls } from "../../components/common/inputStyles.js";

// ---------- 入稿管理タブ ----------
export function SubmissionTab({ project, sessions, lineItems, setLineItems, onUpdateProject }) {
  const confirmedIds = sessions.filter((s) => s.projectId === project.id && s.status === "確定").map((s) => s.id);
  const items = lineItems.filter((it) => confirmedIds.includes(it.sessionId));
  const { vendors } = useVendors();
  // 印刷場所・購入場所に対応するマスタの納期の数え方・メモ
  const vendorNote = (it) => {
    const v = findVendor(vendors, it);
    if (!v || (!v.days && !v.memo)) return null;
    return (
      <span className="block text-xs text-[var(--text-muted)]">
        {v.days && <>納期: {DAYS_LABEL[v.days]}</>}{v.days && v.memo && " / "}{v.memo}
      </span>
    );
  };
  const today = new Date().toISOString().slice(0, 10);

  const notSubmitted = items.filter((it) => !it.actualDate).length;
  const notPurchased = items.filter((it) => it.purchaseStatus !== "済").length;
  const deadlineOf = (it) => submitDeadline(it, project, vendors);
  const overdue = items.filter((it) => {
    const d = deadlineOf(it).date;
    return d && !it.actualDate && d < today;
  }).length;

  const update = (id, fields) => setLineItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...fields } : it)));

  const purchaseSelect = (it) => (
    <select
      className="border border-[var(--border)] rounded-md px-2 py-1 text-sm"
      value={it.purchaseStatus}
      onChange={(e) => update(it.id, { purchaseStatus: e.target.value })}
    >
      <option>未</option><option>済</option><option>ー</option>
    </select>
  );

  const daysInput = (it) => (
    <label className="flex items-center gap-1 text-[var(--text-muted)] text-xs whitespace-nowrap">
      {isMaterial(it) ? "納品日数" : "印刷日数"}
      <input
        type="number"
        min="0"
        className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm w-16 text-[var(--text)]"
        value={it.printDays ?? ""}
        onChange={(e) => update(it.id, { printDays: e.target.value === "" ? "" : Number(e.target.value) })}
      />
      日
    </label>
  );
  const deadlineText = (it) => {
    const dl = deadlineOf(it);
    if (!dl.date) return <span className="text-xs text-[var(--text-muted)]">―</span>;
    const late = !it.actualDate && dl.date < today;
    return (
      <span className={`text-sm font-mono whitespace-nowrap ${late ? "text-[var(--danger)]" : ""}`}>
        {dl.date}
        {dl.calc && <span className="block text-[10px] font-sans text-[var(--text-muted)]">{dl.base}の{it.printDays}日前</span>}
      </span>
    );
  };

  // 納品日: 入稿した日+日数で自動。指定がある場合は手で書き換えられる
  const deliveryControl = (it) => {
    const dv = deliveryDateOf(it, vendors);
    return (
      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] whitespace-nowrap">
        納品{dv.manual ? "(指定)" : dv.date ? "(予定)" : ""}
        <input
          type="date"
          className="border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text)]"
          value={dv.date}
          onChange={(e) => update(it.id, { deliveryDate: e.target.value })}
        />
        {dv.manual && (
          <button onClick={() => update(it.id, { deliveryDate: "" })} className="underline" title="手で入れた日をやめて、入稿日+日数の自動に戻す">
            自動に戻す
          </button>
        )}
      </span>
    );
  };

  const submitControl = (it) => {
    const dl = deadlineOf(it).date;
    const isOverdue = dl && !it.actualDate && dl < today;
    return it.actualDate ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-[var(--success-soft)] text-[var(--success)] rounded-md px-2 py-1 text-xs flex items-center gap-1 whitespace-nowrap">
          入稿済
        </span>
        <input type="date" className="border border-[var(--border)] rounded-md px-2 py-1 text-sm"
          value={it.actualDate} onChange={(e) => update(it.id, { actualDate: e.target.value })} />
        <button onClick={() => update(it.id, { actualDate: "", deliveryDate: "" })}
          className="text-xs text-[var(--danger)] border border-[var(--border)] rounded-md px-2 py-1 flex items-center gap-1 whitespace-nowrap">
          <Undo2 size={12} /> 取り消す
        </button>
        {deliveryControl(it)}
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        {isOverdue && <span className="text-xs text-[var(--danger)]">期限超過（{dl}）</span>}
        <button onClick={() => update(it.id, { actualDate: today })}
          className="text-xs border border-[var(--accent)] text-[var(--accent)] rounded-md px-2 py-1 flex items-center gap-1 whitespace-nowrap">
          <Upload size={12} /> 入稿する
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 flex flex-wrap gap-4 items-end">
        <label className="text-xs text-[var(--text-muted)]">
          資材納品日(内職市場に納める日)
          <input type="date" className={`${inputCls} !w-44`} value={project.materialDue || ""} onChange={(e) => onUpdateProject({ materialDue: e.target.value })} />
        </label>
        <label className="text-xs text-[var(--text-muted)]">
          商品納品日
          <input type="date" className={`${inputCls} !w-44`} value={project.productDue || ""} onChange={(e) => onUpdateProject({ productDue: e.target.value })} />
        </label>
        <p className="text-xs text-[var(--text-muted)] flex-1 min-w-[16rem]">
          各明細の日数を入れると、納品日から逆算した入稿期限が出ます(内職市場の明細は商品納品日、それ以外は資材納品日から。資材納品日が空なら、全部商品納品日から)。数え方は、マスタの会社ごとの「納期の数え方」です(祝日は考えません)。
        </p>
      </div>
      <div className="grid grid-cols-3 sm:flex gap-2 sm:gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 sm:px-4 py-2.5">
          <p className="text-xs text-[var(--text-muted)]">未入稿</p>
          <p className="text-xl font-medium font-mono">{notSubmitted}件</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 sm:px-4 py-2.5">
          <p className="text-xs text-[var(--text-muted)]">未購入</p>
          <p className="text-xl font-medium font-mono">{notPurchased}件</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--danger)] rounded-lg px-3 sm:px-4 py-2.5">
          <p className="text-xs text-[var(--danger)]">期限超過</p>
          <p className="text-xl font-medium font-mono text-[var(--danger)]">{overdue}件</p>
        </div>
      </div>

      {/* スマホ: 1明細1カードで縦に表示 */}
      <div className="md:hidden space-y-3">
        {items.map((it) => (
          <div key={it.id} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm font-medium text-[var(--ink)]">{it.name}</span>
              <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">{it.qty}部</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]"><SpecText item={it} /></p>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-[var(--text-muted)]">{isMaterial(it) ? "購入場所" : "印刷場所"}: <span className="text-[var(--text)]">{it.submitTo || "―"}</span>{vendorNote(it)}</span>
              <label className="flex items-center gap-1.5 text-[var(--text-muted)]">購入 {purchaseSelect(it)}</label>
            </div>
            <div className="flex items-center justify-between gap-2">{daysInput(it)}<span className="text-xs text-[var(--text-muted)] flex items-center gap-1">期限 {deadlineText(it)}</span></div>
            {submitControl(it)}
          </div>
        ))}
      </div>

      {/* PC: 表で表示 */}
      <div className="hidden md:block bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border)] text-left">
              <th className="py-2 px-3 font-normal whitespace-nowrap">印刷・購入場所</th>
              <th className="py-2 px-3 font-normal">内容</th>
              <th className="py-2 px-3 font-normal">仕様</th>
              <th className="py-2 px-3 font-normal text-right whitespace-nowrap">部数</th>
              <th className="py-2 px-3 font-normal whitespace-nowrap">日数</th>
              <th className="py-2 px-3 font-normal whitespace-nowrap">入稿期限</th>
              <th className="py-2 px-3 font-normal">購入</th>
              <th className="py-2 px-3 font-normal whitespace-nowrap">入稿状況</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2 px-3">{it.submitTo || "―"}{vendorNote(it)}</td>
                <td className="py-2 px-3">{it.name}</td>
                <td className="py-2 px-3 text-[var(--text-muted)]"><SpecText item={it} /></td>
                <td className="py-2 px-3 text-right font-mono">{it.qty}</td>
                <td className="py-2 px-3">{daysInput(it)}</td>
                <td className="py-2 px-3">{deadlineText(it)}</td>
                <td className="py-2 px-3">{purchaseSelect(it)}</td>
                <td className="py-2 px-3">{submitControl(it)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
