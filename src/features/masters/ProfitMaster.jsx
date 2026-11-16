import { useMemo, useState } from "react";
import { FeePatternEditor } from "../profit/FeePatternEditor.jsx";
import { DEFAULT_FEES } from "../../lib/profitFees.js";
import { sortLots } from "../../lib/lotOrder.js";
import { downloadBackup } from "../../lib/backup.js";
import {
  hasMaster,
  usesMaster,
  masterFromLot,
  masterSourceCandidates,
  diffWithMaster,
  toMasterSettings,
} from "../../lib/profitMaster.js";

// ---------- 収支設定マスタ ----------
// 手数料・分配の項目と販売パターンを全ロットで共用する。販売価格・税率はロットごと(各ロットの収支設定タブ)。
// 1. マスタがまだ無いとき:もとにするロットを選んで作る
// 2. マスタの編集(マスタを使う全ロットに反映)
// 3. マスタを使っていないロットの一覧(マスタとの違い)→ 選んだロットをまとめてマスタに合わせる(前に控えを自動で書き出す)
export function ProfitMaster({ products, projects, settings, setSettings, patterns, setPatterns, master, setMaster, backupData }) {
  const ready = hasMaster(master);
  const lotLabel = (p) => `${products.find((x) => x.id === p.productId)?.name || "(商品なし)"} ${p.round}`;

  const candidates = useMemo(() => masterSourceCandidates(projects, settings, patterns), [projects, settings, patterns]);
  const [sourceId, setSourceId] = useState(candidates[0]?.project.id || "");

  const others = useMemo(
    () =>
      ready
        ? sortLots(projects)
            .filter((p) => !usesMaster(master, settings[p.id]))
            .map((p) => ({ project: p, diffs: diffWithMaster(p.id, settings, patterns, master), detached: settings[p.id]?.useMaster === false }))
        : [],
    [ready, projects, settings, patterns, master]
  );
  const usingCount = projects.filter((p) => usesMaster(master, settings[p.id])).length;
  // 最初は、「このロットだけ変える」にしたロット以外を選んでおく
  const [picked, setPicked] = useState(null);
  const pickedSet = picked ?? new Set(others.filter((o) => !o.detached).map((o) => o.project.id));
  const toggle = (id) => {
    const next = new Set(pickedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const create = () => {
    const m = sourceId ? masterFromLot(sourceId, settings, patterns) : { fees: DEFAULT_FEES(), patterns: [] };
    setMaster(m);
    setPicked(null);
  };

  const alignPicked = () => {
    const ids = [...pickedSet].filter((id) => others.some((o) => o.project.id === id));
    if (!ids.length) return;
    if (!window.confirm(`${ids.length}件のロットを、マスタの手数料・分配と販売パターンに合わせます。\nそのロットの今の項目と販売パターンは消えます(販売価格はそのまま)。\n念のため、合わせる前のデータの控え(JSON)を自動でダウンロードします。よろしいですか？`)) return;
    downloadBackup(backupData, "-before-profit-master");
    const idSet = new Set(ids);
    setSettings((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = toMasterSettings(prev[id]);
      return next;
    });
    setPatterns((prev) => prev.filter((p) => !idSet.has(p.projectId)));
    setPicked(null);
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
        <p className="text-xs text-[var(--text-muted)]">作っただけでは、どのロットの計算も変わりません。次の画面で、マスタに合わせるロットを確認してから合わせます。</p>
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

      <div className={card}>
        <p className="text-sm font-medium text-[var(--ink)] mb-1">マスタを使っていないロット({others.length}件)</p>
        {others.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">全部のロットがマスタを使っています。</p>
        ) : (
          <>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              選んだロットをマスタに合わせます(そのロットの項目と販売パターンは消え、マスタを使うようになります)。「このロットだけ変える」にしたロットは最初は選んでいません。
            </p>
            <div className="flex gap-3 text-xs mb-2">
              <button className="text-[var(--accent)]" onClick={() => setPicked(new Set(others.map((o) => o.project.id)))}>全部選ぶ</button>
              <button className="text-[var(--accent)]" onClick={() => setPicked(new Set())}>全部外す</button>
            </div>
            <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-md mb-3">
              {others.map(({ project, diffs, detached }) => (
                <li key={project.id} className="p-2">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={pickedSet.has(project.id)} onChange={() => toggle(project.id)} />
                    <span className="min-w-0">
                      <span className="font-medium">{lotLabel(project)}</span>
                      {detached && <span className="ml-2 text-xs text-[var(--warn)]">このロットだけ変える</span>}
                      {diffs.length === 0 ? (
                        <span className="block text-xs text-[var(--success)]">マスタと同じ(合わせても計算は変わりません)</span>
                      ) : (
                        <ul className="text-xs text-[var(--text-muted)] list-disc list-inside">
                          {diffs.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button onClick={alignPicked} disabled={pickedSet.size === 0} className={btn}>
              選んだロット({[...pickedSet].filter((id) => others.some((o) => o.project.id === id)).length}件)をマスタに合わせる
            </button>
          </>
        )}
      </div>
    </div>
  );
}
