import { useEffect, useState } from "react";
import { X, Plus, Send, Download, ChevronRight, ChevronDown } from "lucide-react";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { RelatedAppsSettings } from "../relatedApps/RelatedAppsSettings.jsx";

const STORAGE_KEY = "zk-quote:settings";

const defaultSettings = {
  googleClientId: "",
  allowedEmails: [],
  gasUrl: "",
  lastSyncAt: null,
};

// GAS連携ができるまでの暫定保存先としてlocalStorageを使う
function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch (e) {
    return { ...defaultSettings };
  }
}

function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // プライベートモード等でlocalStorageが使えない場合は保存をあきらめる
  }
}

// ---------- 設定・連携画面 ----------
export function Settings() {
  const [settings, setSettings] = useState(() => loadSettings());
  const [emailInput, setEmailInput] = useState("");
  const [showCodeSection, setShowCodeSection] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const addEmail = () => {
    const email = emailInput.trim();
    if (!email || settings.allowedEmails.includes(email)) return;
    setSettings((s) => ({ ...s, allowedEmails: [...s.allowedEmails, email] }));
    setEmailInput("");
  };
  const removeEmail = (email) => {
    setSettings((s) => ({ ...s, allowedEmails: s.allowedEmails.filter((e) => e !== email) }));
  };

  // push/pullの実際のfetch実装は別途対応。ここではUIと保存場所のみ用意する。
  const handlePush = () => {};
  const handlePull = () => {};

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-lg font-medium text-[var(--ink)]">設定・連携</p>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium text-[var(--ink)]">Googleログイン</p>
        <p className="text-xs text-[var(--text-muted)]">将来のログイン機能のための設定です(今回はUIと保存のみ)。</p>
        <Field label="Google クライアント ID">
          <input
            className={inputCls}
            placeholder="xxxxxxxxxx.apps.googleusercontent.com"
            value={settings.googleClientId}
            onChange={(e) => setSettings((s) => ({ ...s, googleClientId: e.target.value }))}
          />
        </Field>
        <Field label="ログインを許可するGoogleアカウント(メールアドレス)">
          <div className="flex flex-wrap gap-2 mb-2">
            {settings.allowedEmails.map((email) => (
              <span key={email} className="bg-[var(--paper)] rounded-md px-2 py-1 text-sm flex items-center gap-1">
                {email}
                <X size={13} className="cursor-pointer" onClick={() => removeEmail(email)} />
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="example@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
            />
            <button onClick={addEmail} className="text-sm px-3 border border-[var(--border)] rounded-md flex items-center gap-1 shrink-0">
              <Plus size={14} /> 追加
            </button>
          </div>
        </Field>
        <div>
          <button className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md">保存</button>
        </div>
      </div>

      <p className="text-sm font-medium text-[var(--ink)] pt-2">Google スプレッドシート連携</p>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium text-[var(--ink)]">Apps Script Web アプリ URL</p>
        <p className="text-xs text-[var(--text-muted)]">
          見積もりアプリ専用のApps Script Web AppのURLを入力してください。設定手順は下の「スプレッドシート側の設定手順とコードを見る」を参照
        </p>
        <Field label="Apps Script Web アプリ URL">
          <input
            className={inputCls}
            placeholder="https://script.google.com/macros/s/xxxxx/exec"
            value={settings.gasUrl}
            onChange={(e) => setSettings((s) => ({ ...s, gasUrl: e.target.value }))}
          />
        </Field>
        <div>
          <button className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md">設定を保存</button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
          <button onClick={handlePush} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]">
            <Send size={14} /> 今すぐスプレッドシートへ送信
          </button>
          <button onClick={handlePull} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md flex items-center gap-1 text-[var(--text)]">
            <Download size={14} /> スプレッドシートから取得
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)]">最終同期日時：{settings.lastSyncAt || "――"}</p>

        <div className="pt-2 border-t border-[var(--border)]">
          <button
            onClick={() => setShowCodeSection((v) => !v)}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1"
          >
            {showCodeSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            スプレッドシート側の設定手順とコードを見る
          </button>
          {showCodeSection && (
            <ol className="list-decimal list-inside text-xs text-[var(--text-muted)] mt-2 space-y-1">
              <li>連携させたいGoogleスプレッドシートを開く</li>
              <li>拡張機能 → Apps Script を開く</li>
              <li>新しいスクリプトファイルを追加する(在庫アプリ用の既存コードは上書きしない)</li>
              <li>リポジトリの <code className="font-mono">gas/Code.gs</code> の内容を貼り付けて保存する</li>
              <li>デプロイ → 新しいデプロイ → 種類「ウェブアプリ」を選ぶ</li>
              <li>アクセスできるユーザーを「全員」にしてデプロイする</li>
              <li>発行された「ウェブアプリのURL」を上の欄に貼り付けて保存する</li>
            </ol>
          )}
        </div>
      </div>

      <RelatedAppsSettings />
    </div>
  );
}
