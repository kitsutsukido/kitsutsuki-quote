import assert from "node:assert/strict";
import { buildReminderText } from "../worker/reminder.js";
const data = {
  members: [{ id: "m1", name: "A", slackUserId: "U111" }, { id: "m2", name: "B", slackUserId: "" }],
  projects: [{ id: "p1", round: "2026年5月ロット", status: "進行中", productDue: "2026-11-20" }, { id: "p2", round: "完了ロット", status: "完了", productDue: "2026-11-20" }],
  sessions: [{ id: "s1", projectId: "p1", status: "確定" }, { id: "s2", projectId: "p2", status: "確定" }],
  lineItems: [
    { id: "i1", sessionId: "s1", name: "封筒", submitTo: "PP", printDays: 3, purchaseStatus: "未", submitOwner: "m1", buyOwner: "m2" },
    { id: "i2", sessionId: "s1", name: "OPP", kind: "material", submitTo: "SM", printDays: 3, purchaseStatus: "未", buyOwner: "m1" },
    { id: "i3", sessionId: "s1", name: "済み", submitTo: "PP", printDays: 3, purchaseStatus: "済", actualDate: "2026-11-10", submitOwner: "m1" },
    { id: "i4", sessionId: "s1", name: "別日", submitTo: "PP", printDays: 4, purchaseStatus: "未", submitOwner: "m1" },
    { id: "i5", sessionId: "s2", name: "完了ロット", printDays: 3, purchaseStatus: "未", submitOwner: "m1" },
  ],
};
const t = buildReminderText({ data, vendors: [], today: "2026-11-17" });
console.log(t);
assert.match(t, /封筒\(PP\): 入稿 <@U111> \/ 購入 B/);
assert.match(t, /OPP\(SM\): 購入 <@U111>/);
assert.ok(!t.includes("済み") && !t.includes("別日") && !t.includes("完了ロット(") );
assert.equal(buildReminderText({ data, vendors: [], today: "2026-01-01" }), null);
console.log("reminder tests ok");
