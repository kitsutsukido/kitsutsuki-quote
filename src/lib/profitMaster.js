// 収支設定のマスタ(手数料・分配の項目と販売パターンを、全ロットで共用する)
//   profitMaster = { fees: [{ id, name, kind, value }], patterns: [{ id, name, use, overrides }] }(まだ作っていなければ null)
//   ロットの収支設定 settings[projectId].useMaster === true のロットは、マスタの fees・パターンで計算する。
//   useMaster が無い・false のロットは、今までどおりロットの fees と販売パターンを使う(「このロットだけ変える」)。
//   販売価格・税率はロットごと(settings[projectId].price / taxRate)。
import { feesOf, materializePattern, patternFee } from "./profitFees.js";
import { sortLots } from "./lotOrder.js";

export const hasMaster = (m) => !!m && Array.isArray(m.fees) && Array.isArray(m.patterns);
export const usesMaster = (master, s) => hasMaster(master) && s?.useMaster === true;

const clone = (x) => JSON.parse(JSON.stringify(x));

// ロットで実際に使う設定 { s, fees, patterns, fromMaster }
export function resolveLotProfit(projectId, settings, patterns, master) {
  const s = settings[projectId] || { price: 0, taxRate: 10 };
  if (usesMaster(master, s)) {
    return { s, fees: master.fees, patterns: master.patterns.map((p) => ({ ...p, projectId })), fromMaster: true };
  }
  const own = patterns.filter((p) => p.projectId === projectId);
  return { s, fees: feesOf(s, own), patterns: own, fromMaster: false };
}

// マスタを使うロットの収支設定(販売価格・税率だけ残し、ロットの項目は外す)
export function toMasterSettings(s) {
  const { fees: _f, facilityRate: _a, localSalesRate: _b, royaltyRate: _c, useMaster: _u, ...rest } = s || { price: 0, taxRate: 10 }; // eslint-disable-line no-unused-vars
  return { price: 0, taxRate: 10, ...rest, useMaster: true };
}

// ロットの設定からマスタを作る(パターンは新しい形式にし、projectId を外す)
export function masterFromLot(projectId, settings, patterns) {
  const own = patterns.filter((p) => p.projectId === projectId);
  const fees = clone(feesOf(settings[projectId], own));
  return {
    fees,
    patterns: own.map((p) => {
      const { projectId: _pid, ...rest } = clone(p.use ? p : materializePattern(p, fees)); // eslint-disable-line no-unused-vars
      return rest;
    }),
  };
}

// マスタからロットへコピー(「このロットだけ変える」)
export function lotFromMaster(master, projectId) {
  return { fees: clone(master.fees), patterns: clone(master.patterns).map((p) => ({ ...p, projectId })) };
}

// 比べるための形(id ではなく名前で比べる。並び順は計算に関係しないので見ない)
const BASE = "項目の値";
const unit = (kind) => (kind === "yen" ? "円/部" : "%");
function shape(fees, patterns) {
  const feeMap = new Map(fees.map((f) => [f.name, { kind: f.kind, value: Number(f.value) || 0 }]));
  const patMap = new Map(
    patterns.map((p) => [
      p.name,
      new Map(
        fees.map((f) => {
          const { on, override } = patternFee(p, f);
          // 使わない=null、項目の値のまま="項目の値"、パターンで上書き=その値(項目の値の違いは、項目のほうで出す)
          if (!on) return [f.name, null];
          return [f.name, override !== null && override !== (Number(f.value) || 0) ? override : BASE];
        })
      ),
    ])
  );
  return { feeMap, patMap };
}

export const lotHasOwnSettings = (projectId, settings, patterns) =>
  Array.isArray(settings[projectId]?.fees) || patterns.some((p) => p.projectId === projectId);

// ロットとマスタの違い(文の一覧。空ならマスタと同じ)
export function diffWithMaster(projectId, settings, patterns, master) {
  if (!lotHasOwnSettings(projectId, settings, patterns)) return ["手数料・分配と販売パターンが未設定"];
  const own = patterns.filter((p) => p.projectId === projectId);
  const a = shape(feesOf(settings[projectId], own), own);
  const b = shape(master.fees, master.patterns);
  const out = [];
  for (const [name, f] of a.feeMap) {
    const m = b.feeMap.get(name);
    if (!m) out.push(`項目「${name}」はマスタに無い`);
    else if (m.kind !== f.kind || m.value !== f.value) out.push(`${name}: ${f.value}${unit(f.kind)} → マスタ ${m.value}${unit(m.kind)}`);
  }
  for (const name of b.feeMap.keys()) if (!a.feeMap.has(name)) out.push(`項目「${name}」が無い`);
  for (const [name, uses] of a.patMap) {
    const m = b.patMap.get(name);
    if (!m) {
      out.push(`販売パターン「${name}」はマスタに無い`);
      continue;
    }
    const diffs = [];
    for (const feeName of new Set([...uses.keys(), ...m.keys()])) {
      const x = uses.get(feeName) ?? null;
      const y = m.get(feeName) ?? null;
      if (x === y) continue;
      if (x === null) diffs.push(`${feeName}を使っていない`);
      else if (y === null) diffs.push(`${feeName}を使っている`);
      else diffs.push(`${feeName} ${x} → マスタ ${y}`);
    }
    if (diffs.length) out.push(`販売パターン「${name}」: ${diffs.join("、")}`);
  }
  for (const name of b.patMap.keys()) if (!a.patMap.has(name)) out.push(`販売パターン「${name}」が無い`);
  return out;
}

const sigOf = (projectId, settings, patterns) => {
  const own = patterns.filter((p) => p.projectId === projectId);
  const { feeMap, patMap } = shape(feesOf(settings[projectId], own), own);
  const sortObj = (m) => [...m.entries()].sort(([x], [y]) => (x < y ? -1 : 1));
  return JSON.stringify([sortObj(feeMap), sortObj(patMap).map(([n, u]) => [n, sortObj(u)])]);
};

// マスタのもとにするロットの候補。同じ設定のロットがいちばん多いもの(同数なら新しいロット)を先頭に
export function masterSourceCandidates(projects, settings, patterns) {
  const lots = sortLots(projects).filter((p) => lotHasOwnSettings(p.id, settings, patterns) && !usesMasterFlag(settings[p.id]));
  const count = new Map();
  const sig = new Map(lots.map((p) => [p.id, sigOf(p.id, settings, patterns)]));
  for (const s of sig.values()) count.set(s, (count.get(s) || 0) + 1);
  return lots
    .map((p, i) => ({ project: p, same: count.get(sig.get(p.id)), order: i }))
    .sort((x, y) => y.same - x.same || y.order - x.order);
}
const usesMasterFlag = (s) => s?.useMaster === true;
