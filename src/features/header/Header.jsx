import { Menu, Settings } from "lucide-react";
import { APP_NAME } from "../../lib/constants.js";

// ---------- アプリ上部のヘッダーバー ----------
// PC幅ではサイドバーが常時表示のため、ハンバーガーは見た目のみ。スマホ幅ではサイドバーの開閉ボタンになる
// 問題があるときだけ表示する(ふだんは何も出さない)
const SYNC_LABEL = {
  error: ["保存できません(押すと再試行)", "text-[var(--danger)]"],
};

export function Header({ view, setView, onToggleMenu, syncStatus, onRetrySync }) {
  const label = SYNC_LABEL[syncStatus];
  return (
    <header className="zk-header flex items-center gap-3 px-4 py-3">
      <button onClick={onToggleMenu} aria-label="メニュー" className="md:pointer-events-none -m-1 p-1 shrink-0">
        <Menu size={20} />
      </button>
      <span className="font-display text-base font-bold tracking-[0.12em]">{APP_NAME}</span>
      {label && (
        <button
          onClick={syncStatus === "error" ? onRetrySync : undefined}
          className="ml-auto text-xs bg-[var(--card)] text-[var(--danger)] rounded px-2 py-0.5"
        >
          {label[0]}
        </button>
      )}
      <button
        onClick={() => setView("settings")}
        title="設定・連携"
        className={`${label ? "" : "ml-auto"} p-1.5 rounded-md hover:bg-white/15 ${view === "settings" ? "bg-white/20" : "opacity-85"}`}
      >
        <Settings size={18} />
      </button>
    </header>
  );
}
