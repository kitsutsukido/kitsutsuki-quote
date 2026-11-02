import { useState } from "react";
import { SpecText } from "../../components/common/SpecText.jsx";
import { CircleCheck, Undo2 } from "lucide-react";
import { isMaterial, isAssembly, specString } from "../../lib/spec.js";
import { useVendors, DAYS_LABEL } from "../../lib/vendors.jsx";
import { submitDeadline, findVendor, deliveryDateOf, localToday } from "../../lib/deadlines.js";
import { inputCls } from "../../components/common/inputStyles.js";

// ---------- 入稿管理タブ ----------
export function SubmissionTab({ project, sessions, lineItems, setLineItems, members = [], onUpdateProject }) {
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
  const today = localToday();

  const notSubmitted = items.filter((it) => !it.actualDate).length;
  const notPurchased = items.filter((it) => it.purchaseStatus !== "済").length;
  const deadlineOf = (it) => submitDeadline(it, project, vendors);
  const overdue = items.filter((it) => {
    const d = deadlineOf(it).date;
    return d && !it.actualDate && d < today;
  }).length;

  // 「入稿した」を押したとき、購入が未(または未設定)なら済みにする(「ー」=購入なし はそのまま)。取り消しても購入は戻さない。
  const update = (id, fields) => setLineItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...fields } : it)));

  // 担当の一括設定。選んだ担当を、このロットの確定見積もりの明細すべてに入れる
  // (入稿担当は印刷の無い資材には入れない)。空のままの欄は変えない。
  // 一部だけ違う担当にしたいときは、反映したあとで各明細の欄を直す。
  const [bulkSubmit, setBulkSubmit] = useState("");
  const [bulkBuy, setBulkBuy] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");
  const nameOf = (id) => members.find((m) => m.id === id)?.name || "";
  const applyBulkOwners = () => {
    if (!bulkSubmit && !bulkBuy) return setBulkMsg("担当を選んでください。");
    const submitTargets = bulkSubmit ? items.filter((it) => !isMaterial(it)) : [];
    const buyTargets = bulkBuy ? items : [];
    const changeSubmit = submitTargets.filter((it) => it.submitOwner !== bulkSubmit);
    const changeBuy = buyTargets.filter((it) => it.buyOwner !== bulkBuy);
    if (changeSubmit.length === 0 && changeBuy.length === 0) return setBulkMsg("変更はありませんでした(すでに同じ担当です)。");
    const overwrite =
      changeSubmit.filter((it) => it.submitOwner && members.some((m) => m.id === it.submitOwner)).length +
      changeBuy.filter((it) => it.buyOwner && members.some((m) => m.id === it.buyOwner)).length;
    const lines = [];
    if (bulkSubmit) lines.push(`入稿担当: ${nameOf(bulkSubmit)}(${changeSubmit.length}件)`);
    if (bulkBuy) lines.push(`購入担当: ${nameOf(bulkBuy)}(${changeBuy.length}件)`);
    if (overwrite > 0) lines.push(`※すでに別の担当が入っている欄も${overwrite}件、上書きされます。`);
    if (!window.confirm(`このロットの明細に、次の担当を入れます。\n${lines.join("\n")}\nよろしいですか？`)) return;
    const sIds = new Set(changeSubmit.map((it) => it.id));
    const bIds = new Set(changeBuy.map((it) => it.id));
    setLineItems((prev) =>
      prev.map((it) => {
        if (!sIds.has(it.id) && !bIds.has(it.id)) return it;
        const next = { ...it };
        if (sIds.has(it.id)) next.submitOwner = bulkSubmit;
        if (bIds.has(it.id)) next.buyOwner = bulkBuy;
        return next;
      })
    );
    setBulkMsg(`反映しました(${lines.filter((l) => !l.startsWith("※")).join("、")})。一部だけ違う担当は、下の各明細で直せます。`);
  };
  const bulkSelect = (value, onChange) => (
    <select
      className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm text-[var(--text)] bg-[var(--card)]"
      value={value}
      onChange={(e) => { onChange(e.target.value); setBulkMsg(""); }}
    >
      <option value="">変えない</option>
      {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );

  // ---- まとめた行(同じ会社・同じ仕様の明細)も1件の明細と同じ部品で扱う ----
  // まとめた行は { ...先頭の明細, __ids, __items, __mixed } 。値がばらばらな項目は __mixed に入る。
  // 欄を変えると、まとめた明細すべてに同じ値が入る。
  const MIXED = "__mixed";
  const idsOf = (it) => it.__ids || [it.id];
  const listOf = (it) => it.__items || [it];
  const isMixed = (it, f) => !!it.__mixed?.has(f);
  const apply = (it, fields, onlyIds) => {
    const ids = onlyIds || idsOf(it);
    setLineItems((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, ...(typeof fields === "function" ? fields(x) : fields) } : x)));
  };
  const mixedOption = (it, f) => (isMixed(it, f) ? <option value={MIXED} disabled>ばらばら</option> : null);
  // 「入稿した」:入稿日を今日に。購入が未(または未設定)なら済みに(「ー」=購入なし はそのまま)。取り消しても購入は戻さない。
  const markSubmitted = (x) => ({ actualDate: today, ...(x.purchaseStatus === "ー" || x.purchaseStatus === "済" ? {} : { purchaseStatus: "済" }) });

  const purchaseSelect = (it) => (
    <select
      className="border border-[var(--border)] rounded-md px-2 py-1 text-sm"
      value={isMixed(it, "purchaseStatus") ? MIXED : it.purchaseStatus}
      onChange={(e) => apply(it, { purchaseStatus: e.target.value })}
    >
      {mixedOption(it, "purchaseStatus")}
      <option>未</option><option>済</option><option>ー</option>
    </select>
  );

  // 担当者(メンバーマスタから選ぶ)。印刷が無い資材は入稿担当なし
  const ownerSelect = (it, field, label) => (
    <label className="flex items-center gap-1 text-xs text-[var(--text-muted)] whitespace-nowrap">
      {label}
      <select
        className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm text-[var(--text)] bg-[var(--card)] max-w-[7.5rem]"
        value={isMixed(it, field) ? MIXED : members.some((m) => m.id === it[field]) ? it[field] : ""}
        onChange={(e) => apply(it, { [field]: e.target.value })}
      >
        {mixedOption(it, field)}
        <option value="">未設定</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </label>
  );
  const owners = (it) => (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {!isMaterial(it) && ownerSelect(it, "submitOwner", "入稿担当")}
      {ownerSelect(it, "buyOwner", "購入担当")}
    </div>
  );

  // stacked=true: 表(パソコン)用。「納品日数」と入力欄を2行に分けて、列の幅を狭くする
  const daysInput = (it, stacked = false) => (
    <label className={`flex ${stacked ? "flex-col items-start gap-0.5" : "items-center gap-1"} text-[var(--text-muted)] text-xs whitespace-nowrap`}>
      {isMaterial(it) ? "納品日数" : isAssembly(it) ? "作業日数" : "印刷日数"}
      <span className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        className="border border-[var(--border)] rounded-md px-1.5 py-1 text-sm w-16 text-[var(--text)]"
        value={isMixed(it, "printDays") ? "" : it.printDays ?? ""}
        placeholder={isMixed(it, "printDays") ? "ばらばら" : ""}
        onChange={(e) => apply(it, { printDays: e.target.value === "" ? "" : Number(e.target.value) })}
      />
      日
      </span>
    </label>
  );
  const deadlineText = (it) => {
    if (isMixed(it, "printDays")) return <span className="text-xs text-[var(--text-muted)]">ばらばら</span>;
    const dl = deadlineOf(it);
    if (!dl.date) return <span className="text-xs text-[var(--text-muted)]">―</span>;
    const late = listOf(it).some((x) => !x.actualDate) && dl.date < today;
    return (
      <span className={`text-sm font-mono whitespace-nowrap ${late ? "text-[var(--danger)]" : ""}`}>
        {dl.date}
        {dl.calc && <span className="block text-[10px] font-sans text-[var(--text-muted)]">{dl.base}の{it.printDays}日前</span>}
      </span>
    );
  };

  // 納品日: 入稿した日+日数で自動。指定がある場合は手で書き換えられる
  const deliveryControl = (it) => {
    const dvs = listOf(it).map((x) => deliveryDateOf(x, vendors));
    const same = dvs.every((d) => d.date === dvs[0].date);
    const dv = same ? dvs[0] : { date: "", manual: dvs.some((d) => d.manual) };
    const anyManual = dvs.some((d) => d.manual);
    return (
      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] whitespace-nowrap">
        納品{!same ? "(ばらばら)" : dv.manual ? "(指定)" : dv.date ? "(予定)" : ""}
        <input
          type="date"
          className="border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text)]"
          value={dv.date}
          onChange={(e) => apply(it, { deliveryDate: e.target.value })}
        />
        {anyManual && (
          <button onClick={() => apply(it, { deliveryDate: "" })} className="underline" title="手で入れた日をやめて、入稿日+日数の自動に戻す">
            自動に戻す
          </button>
        )}
      </span>
    );
  };

  const submitControl = (it) => {
    const list = listOf(it);
    const done = list.filter((x) => x.actualDate);
    const dl = isMixed(it, "printDays") ? "" : deadlineOf(it).date;
    const isOverdue = dl && done.length < list.length && dl < today;
    if (done.length === list.length && !isMixed(it, "actualDate")) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-[var(--success-soft)] text-[var(--success)] rounded-md px-2 py-1 text-xs flex items-center gap-1 whitespace-nowrap">
            入稿済
          </span>
          <input type="date" className="border border-[var(--border)] rounded-md px-2 py-1 text-sm"
            value={it.actualDate} onChange={(e) => apply(it, { actualDate: e.target.value })} />
          <button onClick={() => apply(it, { actualDate: "", deliveryDate: "" })}
            className="text-xs text-[var(--danger)] border border-[var(--border)] rounded-md px-2 py-1 flex items-center gap-1 whitespace-nowrap">
            <Undo2 size={12} /> 取り消す
          </button>
          {deliveryControl(it)}
        </div>
      );
    }
    const rest = list.filter((x) => !x.actualDate).map((x) => x.id);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {isOverdue && <span className="text-xs text-[var(--danger)]">期限超過（{dl}）</span>}
        {done.length > 0 && (
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            {done.length === list.length ? "入稿済(日付がばらばら)" : `一部入稿済(${done.length}/${list.length}件)`}
          </span>
        )}
        {rest.length > 0 && (
          <button onClick={() => apply(it, markSubmitted, rest)}
            className="text-xs border border-[var(--accent)] text-[var(--accent)] rounded-md px-2 py-1 flex items-center gap-1 whitespace-nowrap">
            <CircleCheck size={12} /> {done.length > 0 ? "残りも入稿した" : "入稿した"}
          </button>
        )}
      </div>
    );
  };

  // ---- 印刷会社(印刷・購入場所・依頼先)ごとに分け、その中で同じ仕様の明細を1行にまとめる ----
  const MERGE_FIELDS = ["submitOwner", "buyOwner", "purchaseStatus", "printDays", "actualDate", "deliveryDate"];
  // 見た目が同じなら同じとみなす:全角・半角(かっこ・英数字・スペース)をそろえ、空白の連続を1つにする
  const norm = (v) => String(v || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  const sections = [];
  for (const it of items) {
    const vendor = norm(it.submitTo);
    let sec = sections.find((x) => x.vendor === vendor);
    if (!sec) sections.push((sec = { vendor, groups: [] }));
    const key = `${vendor}|${it.kind || "print"}|${norm(specString(it))}`;
    let g = sec.groups.find((x) => x.key === key);
    if (!g) sec.groups.push((g = { key, items: [] }));
    g.items.push(it);
  }
  sections.sort((a, b) => (a.vendor === "") - (b.vendor === "")); // 場所が未設定の明細は最後
  for (const sec of sections) {
    for (const g of sec.groups) {
      if (g.items.length === 1) {
        g.row = g.items[0];
        continue;
      }
      const mixed = new Set(MERGE_FIELDS.filter((f) => new Set(g.items.map((x) => x[f] ?? "")).size > 1));
      g.row = { ...g.items[0], __ids: g.items.map((x) => x.id), __items: g.items, __mixed: mixed };
    }
  }
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (key) => setOpenGroups((o) => ({ ...o, [key]: !o[key] }));
  // 同じ名前が並ぶとき(OPPなど)は「OPP ×4」のようにまとめる
  const groupNames = (g) => {
    const count = new Map();
    for (const x of g.items) count.set(x.name, (count.get(x.name) || 0) + 1);
    return [...count].map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join("・");
  };
  const groupQty = (g) => [...new Set(g.items.map((x) => x.qty))].join("・");
  const sectionHead = (sec) => {
    const first = sec.groups[0].items[0];
    const all = sec.groups.flatMap((g) => g.items);
    const left = all.filter((x) => !x.actualDate).length;
    return (
      <>
        <span className="font-medium text-[var(--ink)]">{sec.vendor || "(場所が未設定)"}</span>
        <span className="text-xs text-[var(--text-muted)] ml-2">{all.length}件{left > 0 ? `・未入稿${left}件` : "・すべて入稿済"}</span>
        {vendorNote(first)}
      </>
    );
  };
  const toggleButton = (g) =>
    g.items.length > 1 && (
      <button onClick={() => toggleGroup(g.key)} className="block text-xs text-[var(--accent)] underline mt-0.5 whitespace-nowrap">
        {openGroups[g.key] ? "まとめて表示に戻す" : `個別に表示(${g.items.length}件)`}
      </button>
    );

  const mobileCard = (it, { names, qty, toggle, child = false } = {}) => (
    <div key={it.__ids ? it.__ids.join(",") : it.id} className={`border border-[var(--border)] rounded-lg p-3 space-y-2 ${child ? "ml-4 bg-[var(--paper)]" : "bg-[var(--card)]"}`}>
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-sm font-medium text-[var(--ink)]">{names ?? it.name}</span>
        <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">{qty ?? it.qty}部</span>
      </div>
      {toggle}
      <p className="text-xs text-[var(--text-muted)]"><SpecText item={it} /></p>
      <label className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">購入 {purchaseSelect(it)}</label>
      {owners(it)}
      <div className="flex items-center justify-between gap-2">{daysInput(it)}<span className="text-xs text-[var(--text-muted)] flex items-center gap-1">期限 {deadlineText(it)}</span></div>
      {submitControl(it)}
    </div>
  );

  const tableRow = (it, { names, qty, toggle, child = false } = {}) => (
    <tr key={it.__ids ? it.__ids.join(",") : it.id} className={`border-b border-[var(--border)] last:border-0 ${child ? "bg-[var(--paper)]" : ""}`}>
      <td className={`py-2 px-2 ${child ? "pl-6" : ""}`}>
        {child && <span className="text-[var(--text-muted)]">└ </span>}
        {names ?? it.name}
        {toggle}
      </td>
      <td className="py-2 px-2 text-[var(--text-muted)]"><SpecText item={it} /></td>
      <td className="py-2 px-2 text-right font-mono">{qty ?? it.qty}</td>
      <td className="py-2 px-2">{owners(it)}</td>
      <td className="py-2 px-2">{daysInput(it, true)}</td>
      <td className="py-2 px-2">{deadlineText(it)}</td>
      <td className="py-2 px-2">{purchaseSelect(it)}</td>
      <td className="py-2 px-2">{submitControl(it)}</td>
    </tr>
  );

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
          各明細の日数を入れると、納品日から逆算した入稿・購入期限が出ます(内職市場の明細は商品納品日、それ以外は資材納品日から。資材納品日が空なら、全部商品納品日から)。数え方は、マスタの会社ごとの「納期の数え方」です(祝日は考えません)。
        </p>
      </div>
      {items.length > 0 && members.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 space-y-2">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-[var(--ink)]">担当をまとめて設定</span>
            <label className="flex items-center gap-1 text-xs text-[var(--text-muted)] whitespace-nowrap">入稿担当 {bulkSelect(bulkSubmit, setBulkSubmit)}</label>
            <label className="flex items-center gap-1 text-xs text-[var(--text-muted)] whitespace-nowrap">購入担当 {bulkSelect(bulkBuy, setBulkBuy)}</label>
            <button onClick={applyBulkOwners} className="text-xs border border-[var(--accent)] text-[var(--accent)] rounded-md px-3 py-1 whitespace-nowrap">
              全部の明細に反映
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            このロットの明細すべてに入ります(入稿担当は資材以外)。一部だけ違う担当にしたいときは、反映したあとで下の各明細の欄を直してください。
          </p>
          {bulkMsg && <p className="text-xs text-[var(--text)]">{bulkMsg}</p>}
        </div>
      )}
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

      {/* スマホ: 会社ごとに、同じ仕様は1枚のカードにまとめて縦に表示 */}
      <div className="md:hidden space-y-4">
        {sections.map((sec) => (
          <div key={sec.vendor || "(none)"} className="space-y-2">
            <div className="px-1">{sectionHead(sec)}</div>
            {sec.groups.map((g) =>
              g.items.length === 1 ? (
                mobileCard(g.row)
              ) : (
                <div key={g.key} className="space-y-2">
                  {mobileCard(g.row, { names: groupNames(g), qty: groupQty(g), toggle: toggleButton(g) })}
                  {openGroups[g.key] && g.items.map((x) => mobileCard(x, { child: true }))}
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* PC: 会社ごとの見出しの下に、同じ仕様は1行にまとめて表で表示 */}
      <div className="hidden md:block bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border)] text-left">
              <th className="py-2 px-2 font-normal min-w-[9rem]">内容</th>
              <th className="py-2 px-2 font-normal min-w-[9rem]">仕様</th>
              <th className="py-2 px-2 font-normal text-right whitespace-nowrap">部数</th>
              <th className="py-2 px-2 font-normal whitespace-nowrap">担当</th>
              <th className="py-2 px-2 font-normal whitespace-nowrap">日数</th>
              <th className="py-2 px-2 font-normal">入稿・<br />購入期限</th>
              <th className="py-2 px-2 font-normal">購入</th>
              <th className="py-2 px-2 font-normal whitespace-nowrap">入稿状況</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec) => [
              <tr key={`h-${sec.vendor}`} className="bg-[var(--paper)] border-b border-[var(--border)]">
                <td colSpan={8} className="py-1.5 px-2">{sectionHead(sec)}</td>
              </tr>,
              ...sec.groups.flatMap((g) =>
                g.items.length === 1
                  ? [tableRow(g.row)]
                  : [
                      tableRow(g.row, { names: groupNames(g), qty: groupQty(g), toggle: toggleButton(g) }),
                      ...(openGroups[g.key] ? g.items.map((x) => tableRow(x, { child: true })) : []),
                    ]
              ),
            ])}
          </tbody>
        </table>
      </div>
    </div>
  );
}
