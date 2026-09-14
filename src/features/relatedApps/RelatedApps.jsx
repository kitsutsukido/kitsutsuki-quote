import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { loadRelatedApps } from "../../lib/relatedAppsStorage.js";

// ---------- 関連アプリ(ダッシュボードの下部セクション。表示専用) ----------
// 登録・編集・削除は設定・連携画面(RelatedAppsSettings)で行う
export function RelatedApps() {
  const [apps] = useState(() => loadRelatedApps());

  if (apps.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="text-sm font-medium text-[var(--ink)] mb-3">関連アプリ</p>
      <div className="grid grid-cols-2 gap-3">
        {apps.map((app) => (
          <a
            key={app.id}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition"
          >
            <p className="text-sm font-medium text-[var(--ink)] flex items-center gap-1">
              {app.name}
              <ExternalLink size={12} className="text-[var(--text-muted)] shrink-0" />
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
