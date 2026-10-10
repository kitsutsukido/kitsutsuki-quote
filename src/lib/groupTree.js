// 梱包グループは parentId でつながる任意の深さの木構造。
// ここに木を扱う共通関数をまとめる(管理画面・明細フォーム・見積もり画面で共用)。

// 親が見つからない(孤立した)グループは最上位として扱う
export function buildGroupTree(groups) {
  const ids = new Set(groups.map((g) => g.id));
  const byParent = new Map();
  for (const g of groups) {
    const key = g.parentId && ids.has(g.parentId) ? g.parentId : null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(g);
  }
  const build = (parentId, depth) =>
    (byParent.get(parentId) || []).map((g) => ({ group: g, depth, children: build(g.id, depth + 1) }));
  return build(null, 0);
}

// 深さ優先の並びで [{ group, depth }] に平坦化する
export function flattenGroupTree(groups) {
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      out.push({ group: n.group, depth: n.depth });
      walk(n.children);
    }
  };
  walk(buildGroupTree(groups));
  return out;
}

// 自分自身を含む、配下すべてのグループid
export function selfAndDescendantIds(groups, id) {
  const result = [id];
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    for (const g of groups) {
      if (g.parentId === cur && !result.includes(g.id)) {
        result.push(g.id);
        queue.push(g.id);
      }
    }
  }
  return result;
}

// 「OPP › 招待状」のような階層パス表示
export function groupPathLabel(groups, id) {
  const names = [];
  const seen = new Set();
  let cur = groups.find((g) => g.id === id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.name);
    cur = cur.parentId ? groups.find((g) => g.id === cur.parentId) : null;
  }
  return names.join(" › ");
}

// 親として選べるグループ(自分自身と、自分の配下は循環になるので除く)
export function selectableParents(groups, selfId) {
  const excluded = selfId ? new Set(selfAndDescendantIds(groups, selfId)) : new Set();
  return flattenGroupTree(groups)
    .filter(({ group }) => !excluded.has(group.id))
    .map(({ group }) => ({ id: group.id, label: groupPathLabel(groups, group.id) }));
}
