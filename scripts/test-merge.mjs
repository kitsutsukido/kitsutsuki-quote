import assert from "node:assert/strict";
import { mergeArray, mergeObject, mergeData } from "../src/lib/mergeLib.js";
const id = (o) => o.id;
const I = (n, x = 0) => ({ id: n, v: x });
const ids = (a) => a.map((o) => o.id + ":" + o.v).join(",");
// 1 別々の項目を直す
assert.equal(ids(mergeArray([I("a"), I("b")], [I("a", 1), I("b")], [I("a"), I("b", 2)], id)), "a:1,b:2");
// 2 それぞれ別の項目を追加
assert.equal(ids(mergeArray([I("a")], [I("a"), I("x")], [I("a"), I("y")], id)), "a:0,x:0,y:0");
// 3 自分が削除・相手が別の項目を編集
assert.equal(ids(mergeArray([I("a"), I("b")], [I("b")], [I("a"), I("b", 5)], id)), "b:5");
// 4 自分は削除・相手は同じ項目を編集 → 相手の編集を残す
assert.equal(ids(mergeArray([I("a"), I("b")], [I("b")], [I("a", 9), I("b")], id)), "a:9,b:0");
// 5 同じ項目を同時に編集 → 自分
assert.equal(ids(mergeArray([I("a")], [I("a", 1)], [I("a", 2)], id)), "a:1");
// 6 自分が並べ替え・相手が追加
assert.equal(ids(mergeArray([I("a"), I("b"), I("c")], [I("b"), I("a"), I("c")], [I("a"), I("b"), I("c"), I("d")], id)), "b:0,a:0,c:0,d:0");
// 7 相手が削除・自分は触っていない
assert.equal(ids(mergeArray([I("a"), I("b")], [I("a"), I("b")], [I("b")], id)), "b:0");
// 8 変更なしなら共有データそのまま(並びも)
assert.equal(ids(mergeArray([I("a"), I("b")], [I("a"), I("b")], [I("b"), I("a", 3)], id)), "b:0,a:3");
// 9 オブジェクト
assert.deepEqual(mergeObject({ p: 1 }, { p: 1, q: 2 }, { p: 5 }), { p: 5, q: 2 });
// 10 全体
const base = { projects: [I("p1")], sessions: [], lineItems: [I("l1")], groups: [], profitSettings: { p1: { price: 1 } }, profitPatterns: [] };
const mine = { ...base, lineItems: [I("l1", 1), I("l2")] };
const theirs = { ...base, lineItems: [I("l1"), I("l3")], profitSettings: { p1: { price: 2 } } };
const r = mergeData(base, mine, theirs);
assert.equal(ids(r.lineItems), "l1:1,l2:0,l3:0");
assert.deepEqual(r.profitSettings, { p1: { price: 2 } });
console.log("merge tests ok");
