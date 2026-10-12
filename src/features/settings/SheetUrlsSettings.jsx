import { useEffect, useState } from "react";
import { Send, Download } from "lucide-react";
import { dataForGenre, pullFromSheet, pushToSheet } from "../../lib/sheetSync.js";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import {
  loadSheetUrlsByGenre,
  saveSheetUrlsByGenre,
  loadSecretsByGenre,
  saveSecretsByGenre,
} from "../../lib/storage.js";

// ---------- シリーズ(genre)ごとのApps Script Web アプリ URL ----------
export function SheetUrlsSettings({ products, sync }) {
  const [status, setStatus] = useState({}); // シリーズごとの結果メッセージ { [genre]: { busy, text } }
  const setMsg = (genre, busy, text) => setStatus((s) => ({ ...s, [genre]: { busy, text } }));
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

  const handlePush = async (genre) => {
    const url = (urlsByGenre[genre] || "").trim();
    if (!url) return setMsg(genre, false, "URLを入れてください。");
    const data = dataForGenre(genre, { products, ...sync });
    if (data.projects.length === 0) return setMsg(genre, false, "送信できるデータがありません。");
    if (!window.confirm(`「${genre}」のデータ(ロット${data.projects.length}件・明細${data.lineItems.length}件)を、スプレッドシートに送信します。\nスプレッドシート側の内容は上書きされます。よろしいですか？`)) return;
    setMsg(genre, true, "送信中…");
    try {
      await pushToSheet(url, secretsByGenre[genre], data);
      setMsg(genre, false, `送信しました(ロット${data.projects.length}件・明細${data.lineItems.length}件)。`);
    } catch (e) {
      setMsg(genre, false, `失敗しました: ${e.message}`);
    }
  };

  const handlePull = async (genre) => {
    const url = (urlsByGenre[genre] || "").trim();
    if (!url) return setMsg(genre, false, "URLを入れてください。");
    setMsg(genre, true, "取得中…");
    try {
      const pulled = await pullFromSheet(url, secretsByGenre[genre]);
      if (pulled.projects.length === 0) {
        return setMsg(genre, false, "スプレッドシートにデータがありません(この端末のデータは変えていません)。");
      }
      if (!window.confirm(`スプレッドシートの「${genre}」のデータ(ロット${pulled.projects.length}件・明細${pulled.lineItems.length}件)を取得します。\nこの端末の「${genre}」のデータは置き換わり、元に戻せません。よろしいですか？`)) {
        return setMsg(genre, false, "");
      }
      const mine = dataForGenre(genre, { products, ...sync });
      const out = (all, mineList, key = "id") => all.filter((x) => !mineList.some((m) => m[key] === x[key]));
      sync.setProjects((prev) => [...out(prev, mine.projects), ...pulled.projects]);
      sync.setSessions((prev) => [...out(prev, mine.sessions), ...pulled.sessions]);
      sync.setLineItems((prev) => [...out(prev, mine.lineItems), ...pulled.lineItems]);
      sync.setGroups((prev) => [...out(prev, mine.groups), ...pulled.groups]);
      sync.setSettings((prev) => {
        const next = { ...prev };
        Object.keys(mine.profitSettings).forEach((id) => delete next[id]);
        return { ...next, ...pulled.profitSettings };
      });
      sync.setPatterns((prev) => [...prev.filter((p) => !mine.profitPatterns.some((m) => m.id === p.id && m.projectId === p.projectId)), ...pulled.profitPatterns]);
      setMsg(genre, false, `取得しました(ロット${pulled.projects.length}件・明細${pulled.lineItems.length}件)。`);
    } catch (e) {
      setMsg(genre, false, `失敗しました: ${e.message}`);
    }
  };

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
                  disabled={status[genre]?.busy}
                  className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]"
                >
                  <Send size={13} /> このシリーズを送信
                </button>
                <button
                  onClick={() => handlePull(genre)}
                  disabled={status[genre]?.busy}
                  className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]"
                >
                  <Download size={13} /> このシリーズを取得
                </button>
              </div>
              {status[genre]?.text && <p className="text-xs text-[var(--text)]">{status[genre].text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
