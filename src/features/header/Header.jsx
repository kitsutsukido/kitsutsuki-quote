import { Menu } from "lucide-react";
import { APP_NAME } from "../../lib/constants.js";

// ---------- アプリ上部のヘッダーバー ----------
// サイドバーが常時表示のため、ハンバーガーメニューは見た目のみで開閉動作は持たない
export function Header() {
  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-[var(--card)] text-[var(--ink)] border-b border-[var(--border)]">
      <Menu size={20} />
      <span className="text-base font-semibold">{APP_NAME}</span>
    </header>
  );
}
