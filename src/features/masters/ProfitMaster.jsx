import { useMemo, useState } from "react";
import { FeePatternEditor } from "../profit/FeePatternEditor.jsx";
import { DEFAULT_FEES } from "../../lib/profitFees.js";
import {
  hasMaster,
  usesMaster,
  masterFromLot,
  masterSourceCandidates,
} from "../../lib/profitMaster.js";

// ---------- 収支設定マスタ ----------
// 手数料・分配の項目と販売パターンを全ロットで共用する。販売価格・税率はロットごと(各ロットの収支設定タブ)。
// 1. マスタがまだ無いとき:もとにするロットを選んで作る
// 2. マスタの編集(マスタを使う全ロットに反映)
export function ProfitMaster({ products, projects, settings, patterns, master, setMaster }) {
  const ready = hasMaster(master);
  const lotLabel = (p) => `${products.find((x) => x.id === p.productId)?.name || "(商品なし)"} ${p.round}`;

  const candidates = useMemo(() => masterSourceCandidates(projects, settings, patterns), [projects, settings, patterns]);
  const [sourceId, setSourceId] = useState(candidates[0]?.project.id || "");

  const usingCount = projects.filter((p) => usesMaster(master, settings[p.id])).length;

  const create = () => {
    const m = sourceId ? masterFromLot(sourceId, settings, patterns) : { fees: DEFAULT_FEES(), patterns: [] };
    setMaster(m);
  };

  const card = "bg-[var(--card)] border border-[var(--border)] rounded-lg p-4";
  const btn = "text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md disabled:opacity-40";

  if (!ready) {
    return (
      <div className={`${card} space-y-3`}>
        <p className="text-sm text-[var(--text)]">
          手数料・分配の項目と販売パターンを、全部のロットで共通にします。まず、もとにするロットを選んでマスタを作ってください(作ったあとで直せます)。
          販売価格・税率は今までどおりロットごとです。
        </p>
        {candidates.length ? (
          <label className="block text-sm">
            <span className="block text-xs text-[var(--text-muted)] mb-1">もとにするロット(同じ設定のロットが多い順)</span>
            <select className="w-full border border-[var(--border)] rounded-md px-2 py-1.5 text-sm bg-[var(--card)]" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.project.id} value={c.project.id}>
                  {lotLabel(c.project)}{c.same > 1 ? `(同じ設定のロット ${c.same}件)` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">収支設定のあるロットがないので、初期の項目から作ります。</p>
        )}
        <button onClick={create} className={btn}>この設定でマスタを作る</button>
        <p className="text-xs text-[var(--text-muted)]">作っただけでは、今あるロットの計算は変わりません。マスタを使うには、各ロットの収支設定タブで「マスタの設定に戻す」を押してください(新しいロット・増刷は最初からマスタを使います)。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          ここを直すと、マスタを使っているロット(今 {usingCount}件)すべての利益率・損益分岐点に反映されます(過去のロットも)。販売価格・税率はロットごとの収支設定タブで。
        </p>
        <FeePatternEditor fees={master.fees} patterns={master.patterns} onChange={(fees, pats) => setMaster({ fees, patterns: pats })} />
      </div>

    </div>
  );
}
