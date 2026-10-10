import { useEffect, useState } from "react";
import { Send, Download } from "lucide-react";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import {
  loadSheetUrlsByGenre,
  saveSheetUrlsByGenre,
  loadSecretsByGenre,
  saveSecretsByGenre,
} from "../../lib/storage.js";

// ---------- シリーズ(genre)ごとのApps Script Web アプリ URL ----------
export function SheetUrlsSettings({ products }) {
  const genres = [];
  for (const p of products) {
    if (!genres.includes(p.genre)) genres.push(p.genre);
  }

  const [urlsByGenre, setUrlsByGenre] = useState(() => loadSheetUrlsByGenre({}));

  useEffect(() => {
    saveSheetUrlsByGenre(urlsByGenre);
  }, [urlsByGenre]);

  const [secretsByGenre, setSecretsByGenre] = useState(() => loadSecretsByGenre({}));

  useEffect(() => {
    saveSecretsByGenre(secretsByGenre);
  }, [secretsByGenre]);

  const setSecret = (genre, secret) => setSecretsByGenre((prev) => ({ ...prev, [genre]: secret }));

  const setUrl = (genre, url) => setUrlsByGenre((prev) => ({ ...prev, [genre]: url }));

  // 実際のfetch実装は別途対応。ここではシリーズごとのURL管理とUIのみ用意する。
  const handlePush = (genre) => {};
  const handlePull = (genre) => {};

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--ink)]">Apps Script Web アプリ URL(シリーズごと)</p>
      <p className="text-xs text-[var(--text-muted)]">
        シリーズ(ジャンル)ごとに別々のGoogleスプレッドシートで管理する運用のため、シリーズごとにApps
        ScriptのウェブアプリURLを登録してください。新しいシリーズの商品を登録すると、ここにも自動で欄が増えます。設定手順は下の「スプレッドシート側の設定手順とコードを見る」を参照
      </p>

      {genres.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">商品がまだ登録されていません。</p>
      ) : (
        <div className="space-y-3">
          {genres.map((genre) => (
            <div key={genre} className="border border-[var(--border)] rounded-md p-3 space-y-2">
              <Field label={genre}>
                <input
                  className={inputCls}
                  placeholder="https://script.google.com/macros/s/xxxxx/exec"
                  value={urlsByGenre[genre] || ""}
                  onChange={(e) => setUrl(genre, e.target.value)}
                />
              </Field>
              <Field label="合言葉(Apps Script側のSHARED_SECRETと同じ文字列)">
                <input
                  type="password"
                  autoComplete="off"
                  className={inputCls}
                  placeholder="未設定の場合は認証なし"
                  value={secretsByGenre[genre] || ""}
                  onChange={(e) => setSecret(genre, e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePush(genre)}
                  className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]"
                >
                  <Send size={13} /> このシリーズを送信
                </button>
                <button
                  onClick={() => handlePull(genre)}
                  className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]"
                >
                  <Download size={13} /> このシリーズを取得
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
