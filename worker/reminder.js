import { submitDeadline } from "../src/lib/deadlines.js";
import { isMaterial } from "../src/lib/spec.js";

// ---------- 入稿期限の当日リマインダー(毎朝9時・日本時間) ----------
// 共有データ(zk-quote:data)と会社マスタ(zk-quote:vendors)を読み、今日が入稿期限の明細のうち、
// 入稿がまだ・購入がまだのものを、担当者へのメンションつきでSlackに送る。
// Slackの送信先(Incoming Webhook)は、シークレット SLACK_WEBHOOK_URL に入れる。

const todayJst = (now = new Date()) => new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const mention = (members, id) => {
  const m = (members || []).find((x) => x.id === id);
  if (!m) return "";
  return m.slackUserId ? `<@${m.slackUserId}>` : m.name;
};

// 純粋関数: 今日のリマインダーの文面を作る(送るものが無ければ null)
export function buildReminderText({ data, vendors, today }) {
  const { projects = [], sessions = [], lineItems = [], members = [] } = data || {};
  const lines = [];
  for (const project of projects) {
    if (project.status !== "進行中") continue;
    const confirmed = sessions.find((s) => s.projectId === project.id && s.status === "確定");
    if (!confirmed) continue;
    for (const it of lineItems.filter((x) => x.sessionId === confirmed.id)) {
      if (submitDeadline(it, project, vendors).date !== today) continue;
      const todo = [];
      if (!isMaterial(it) && !it.actualDate) todo.push(`入稿 ${mention(members, it.submitOwner) || "(担当未設定)"}`);
      if (it.purchaseStatus === "未") todo.push(`購入 ${mention(members, it.buyOwner) || "(担当未設定)"}`);
      if (todo.length === 0) continue;
      lines.push({ project, text: `・${it.name}${it.submitTo ? `(${it.submitTo})` : ""}: ${todo.join(" / ")}` });
    }
  }
  if (lines.length === 0) return null;
  const byProject = new Map();
  for (const l of lines) {
    const key = l.project.id;
    if (!byProject.has(key)) byProject.set(key, { project: l.project, rows: [] });
    byProject.get(key).rows.push(l.text);
  }
  const parts = [`:alarm_clock: 今日(${today})が入稿期限の明細です`];
  for (const { project, rows } of byProject.values()) parts.push(`*${project.round}*`, ...rows);
  return parts.join("\n");
}

async function readJson(env, key) {
  const raw = await env.QUOTE_KV.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function runReminder(env, now = new Date()) {
  if (!env.SLACK_WEBHOOK_URL) {
    console.log("[reminder] SLACK_WEBHOOK_URL is not configured; skipped");
    return { sent: false, reason: "no-webhook" };
  }
  const doc = await readJson(env, "zk-quote:data");
  if (!doc || !doc.data) {
    console.log("[reminder] no shared data; skipped");
    return { sent: false, reason: "no-data" };
  }
  const vendorsRaw = await readJson(env, "zk-quote:vendors");
  const vendors = Array.isArray(vendorsRaw) ? vendorsRaw.map((v) => (v && typeof v === "object" ? v : { name: String(v), kind: "print" })) : [];
  const text = buildReminderText({ data: doc.data, vendors, today: todayJst(now) });
  if (!text) {
    console.log("[reminder] nothing due today");
    return { sent: false, reason: "nothing" };
  }
  const res = await fetch(env.SLACK_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
  console.log(`[reminder] slack responded ${res.status}`);
  return { sent: res.ok, status: res.status };
}
