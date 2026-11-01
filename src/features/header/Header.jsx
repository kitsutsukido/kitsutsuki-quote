import { Menu, Settings } from "lucide-react";
import { APP_NAME } from "../../lib/constants.js";

// ---------- アプリ上部のヘッダーバー ----------
// PC幅ではサイドバーが常時表示のため、ハンバーガーは見た目のみ。スマホ幅ではサイドバーの開閉ボタンになる
const SYNC_LABEL = {
  checking: ["確認中…", ""],
  synced: ["保存済み", ""],
  dirty: ["保存待ち…", "text-[var(--accent)]"],
  saving: ["保存中…", ""],
  error: ["保存できません(押すと再試行)", "text-[var(--danger)]"],
};

// 最後に保存した時刻(日本時間 HH:MM)。今日でなければ月日もつける
const savedTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const jst = (x, o) => x.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false, ...o });
  const hm = jst(d, { hour: "2-digit", minute: "2-digit" });
  const sameDay = jst(d, { dateStyle: "short" }) === jst(new Date(), { dateStyle: "short" });
  return sameDay ? hm : `${jst(d, { month: "numeric", day: "numeric" })} ${hm}`;
};

export function Header({ view, setView, onToggleMenu, syncStatus, syncedAt, onRetrySync }) {
  const label = SYNC_LABEL[syncStatus];
  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-[var(--card)] text-[var(--ink)] border-b border-[var(--border)]">
      <button onClick={onToggleMenu} aria-label="メニュー" className="md:pointer-events-none -m-1 p-1 shrink-0">
        <Menu size={20} />
      </button>
      <span className="font-display text-base font-semibold">{APP_NAME}</span>
      {label && (
        <button
          onClick={syncStatus === "error" ? onRetrySync : undefined}
          className={`ml-auto text-xs ${label[1] || "text-[var(--text-muted)]"}`}
        >
          {label[0]}{syncStatus === "synced" && syncedAt ? ` ${savedTime(syncedAt)}` : ""}
        </button>
      )}
      <button
        onClick={() => setView("settings")}
        title="設定・連携"
        className={`${label ? "" : "ml-auto"} p-1.5 rounded-md hover:bg-[var(--paper)] ${view === "settings" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
      >
        <Settings size={18} />
      </button>
    </header>
  );
}
