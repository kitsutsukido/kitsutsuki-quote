// 2人以上が同時に編集しても、どちらの変更も消えないように、項目(id)ごとに変更を合わせる(3者のマージ)。
//   base   : 最後に共有データと同じだった内容
//   mine   : この端末の今の内容(未保存の変更を含む)
//   theirs : いまの共有データ(ほかの人の変更を含む)
// 同じ項目を同時に直したときだけ、この端末(あとから保存するほう)の内容を残す。
// ただし「自分は消した/相手は直した」ときは、相手の直した内容を残す(消えて困るほうを優先)。

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 項目ごとの値を決める。undefined = なし
function pick(b, m, t) {
  const mineChanged = !same(b, m);
  const theirsChanged = !same(b, t);
  if (!mineChanged) return t;
  if (!theirsChanged) return m;
  if (m === undefined) return t; // 自分は削除・相手は編集 → 相手の編集を残す
  return m;
}

// 並び順: 自分が並べ替えていればその順、そうでなければ共有データの順。もう一方にしか無い項目は、直前の項目のあとに入れる
function orderKeys(baseKeys, mineKeys, theirKeys, wanted) {
  const common = baseKeys.filter((k) => mineKeys.includes(k));
  const mineCommon = mineKeys.filter((k) => baseKeys.includes(k));
  const mineReordered = !same(common, mineCommon);
  const primary = mineReordered ? mineKeys : theirKeys;
  const secondary = mineReordered ? theirKeys : mineKeys;
  const out = primary.filter((k) => wanted.has(k));
  secondary.forEach((k, i) => {
    if (!wanted.has(k) || out.includes(k)) return;
    let at = out.length;
    for (let j = i - 1; j >= 0; j--) {
      const idx = out.indexOf(secondary[j]);
      if (idx !== -1) {
        at = idx + 1;
        break;
      }
    }
    out.splice(at, 0, k);
  });
  // どちらの並びにも出てこなかった項目(念のため)
  for (const k of wanted) if (!out.includes(k)) out.push(k);
  return out;
}

export function mergeArray(base, mine, theirs, keyOf) {
  const toMap = (arr) => new Map((arr || []).map((o) => [keyOf(o), o]));
  const b = toMap(base);
  const m = toMap(mine);
  const t = toMap(theirs);
  const keys = new Set([...b.keys(), ...m.keys(), ...t.keys()]);
  const values = new Map();
  const wanted = new Set();
  for (const k of keys) {
    const v = pick(b.get(k), m.get(k), t.get(k));
    if (v !== undefined) {
      values.set(k, v);
      wanted.add(k);
    }
  }
  return orderKeys([...b.keys()], [...m.keys()], [...t.keys()], wanted).map((k) => values.get(k));
}

export function mergeObject(base, mine, theirs) {
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(mine || {}), ...Object.keys(theirs || {})]);
  const out = {};
  for (const k of keys) {
    const v = pick((base || {})[k], (mine || {})[k], (theirs || {})[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const KEY_OF = {
  projects: (o) => o.id,
  sessions: (o) => o.id,
  lineItems: (o) => o.id,
  groups: (o) => o.id,
  profitPatterns: (o) => `${o.projectId}|${o.id}`,
};

export function mergeData(base, mine, theirs) {
  const out = { ...theirs };
  for (const [key, keyOf] of Object.entries(KEY_OF)) {
    if (theirs[key] === undefined && mine[key] === undefined) continue;
    out[key] = mergeArray(base[key], mine[key], theirs[key], keyOf);
  }
  out.profitSettings = mergeObject(base.profitSettings, mine.profitSettings, theirs.profitSettings);
  return out;
}
