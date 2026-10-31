import { useEffect, useRef, useState } from "react";
import { Send, Download } from "lucide-react";
import { SHEET_SETTINGS_KEY, getConfig, getMe, kvGet, kvPut, loadGsi, loginWithIdToken, logout } from "../../lib/remote.js";
import { dataForGenre, pullFromSheet, pushToSheet } from "../../lib/sheetSync.js";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import {
  loadSheetUrlsByGenre,
  saveSheetUrlsByGenre,
  loadSecretsByGenre,
  saveSecretsByGenre,
} from "../../lib/storage.js";

// ---------- ログイン(Google)とURL・合言葉の端末間共有 ----------
// auth: "checking" | "local"(サーバー無し=この端末だけ) | "out"(未ログイン) | "in"
function useSharedSheetSettings(urlsByGenre, secretsByGenre, setUrlsByGenre, setSecretsByGenre) {
  const [auth, setAuth] = useState("checking");
  const [clientId, setClientId] = useState("");
  const [user, setUser] = useState(null);
  const [note, setNote] = useState("");
  const loaded = useRef(false); // KVから読み終わるまでは書き込まない(空で上書きしないため)

  const loadFromKv = async (me) => {
    try {
      const remote = await kvGet(SHEET_SETTINGS_KEY);
      if (remote) {
        setUrlsByGenre(remote.urlsByGenre || {});
        setSecretsByGenre(remote.secretsByGenre || {});
        setNote("ログイン中: 設定を共有データから読み込みました。");
      } else {
        // 共有データがまだ無ければ、この端末の設定を最初の共有データにする
        await kvPut(SHEET_SETTINGS_KEY, { urlsByGenre, secretsByGenre });
        setNote("ログイン中: この端末の設定を共有データとして保存しました。");
      }
      loaded.current = true;
      setUser(me);
      setAuth("in");
    } catch (e) {
      if (e.message === "unauthorized") setAuth("out");
      else {
        setNote(`共有データを読み込めませんでした: ${e.message}`);
        setAuth("local");
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await getConfig();
      if (cancelled) return;
      if (!cfg || !cfg.googleClientId) return setAuth("local");
      setClientId(cfg.googleClientId);
      const me = await getMe();
      if (cancelled) return;
      if (me === undefined) return setAuth("local");
      if (me === null) return setAuth("out");
      await loadFromKv(me);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 変更したら少し待って共有データへ保存
  useEffect(() => {
    if (auth !== "in" || !loaded.current) return;
    const t = setTimeout(() => {
      kvPut(SHEET_SETTINGS_KEY, { urlsByGenre, secretsByGenre }).catch((e) => {
        if (e.message === "unauthorized") setAuth("out");
        else setNote(`共有データへの保存に失敗しました: ${e.message}`);
      });
    }, 600);
    return () => clearTimeout(t);
  }, [auth, urlsByGenre, secretsByGenre]);

  const onCredential = async (idToken) => {
    setNote("");
    try {
      const me = await loginWithIdToken(idToken);
      await loadFromKv(me);
    } catch (e) {
      setNote(e.message);
    }
  };

  const doLogout = async () => {
    try {
      await logout();
    } catch (e) {
      /* 失効に失敗してもCookieは期限で切れる */
    }
    loaded.current = false;
    window.location.reload(); // ログイン画面に戻る
  };

  return { auth, clientId, user, note, onCredential, doLogout };
}

function GoogleLoginButton({ clientId, onCredential }) {
  const ref = useRef(null);
  const [err, setErr] = useState("");
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential; // 再描画のたびにボタンを作り直さないため
  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => cbRef.current(r.credential) });
        window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", width: 280, text: "signin_with" });
      })
      .catch((e) => setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  return (
    <div>
      <div ref={ref} />
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

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

  const shared = useSharedSheetSettings(urlsByGenre, secretsByGenre, setUrlsByGenre, setSecretsByGenre);

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
      {shared.auth === "out" && (
        <div className="border border-[var(--border)] rounded-md p-3 space-y-2">
          <p className="text-xs text-[var(--text)]">Googleでログインすると、URLと合言葉が全部の端末で共有されます(毎回入力する必要がなくなります)。</p>
          <GoogleLoginButton clientId={shared.clientId} onCredential={shared.onCredential} />
        </div>
      )}
      {shared.auth === "in" && (
        <p className="text-xs text-[var(--text)]">
          ログイン中: {shared.user?.email}(URLと合言葉は全部の端末で共有されます){" "}
          <button className="underline" onClick={shared.doLogout}>ログアウト</button>
        </p>
      )}
      {shared.auth === "local" && <p className="text-xs text-[var(--text-muted)]">この端末だけに保存されます(共有サーバーに接続できていません)。</p>}
      {shared.note && <p className="text-xs text-[var(--text-muted)]">{shared.note}</p>}
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
