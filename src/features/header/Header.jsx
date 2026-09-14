import { Menu, Settings } from "lucide-react";
import { APP_NAME } from "../../lib/constants.js";

// ---------- アプリ上部のヘッダーバー ----------
// サイドバーが常時表示のため、ハンバーガーメニューは見た目のみで開閉動作は持たない
export function Header({ view, setView }) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-[var(--card)] text-[var(--ink)] border-b border-[var(--border)]">
      <Menu size={20} />
      <button onClick={() => setView("dashboard")} className="font-display text-base font-semibold hover:text-[var(--accent)]">
        {APP_NAME}
      </button>
      <button
        onClick={() => setView("settings")}
        title="設定・連携"
        className={`ml-auto p-1.5 rounded-md hover:bg-[var(--paper)] ${view === "settings" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
      >
        <Settings size={18} />
      </button>
    </header>
  );
}
