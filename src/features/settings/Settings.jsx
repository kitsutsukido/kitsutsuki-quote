import { useEffect, useState } from "react";
import { X, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { RelatedAppsSettings } from "../relatedApps/RelatedAppsSettings.jsx";
import { SheetUrlsSettings } from "./SheetUrlsSettings.jsx";

const STORAGE_KEY = "zk-quote:settings";

const defaultSettings = {
  googleClientId: "",
  allowedEmails: [],
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
export function Settings({ products }) {
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

      <SheetUrlsSettings products={products} />

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <button
          onClick={() => setShowCodeSection((v) => !v)}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1"
        >
          {showCodeSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          スプレッドシート側の設定手順とコードを見る
        </button>
        {showCodeSection && (
          <ol className="list-decimal list-inside text-xs text-[var(--text-muted)] mt-2 space-y-1">
            <li>シリーズ(ジャンル)ごとに、連携させたいGoogleスプレッドシートを開く</li>
            <li>拡張機能 → Apps Script を開く</li>
            <li>新しいスクリプトファイルを追加する(在庫アプリ用の既存コードは上書きしない)</li>
            <li>リポジトリの <code className="font-mono">gas/Code.gs</code> の内容を貼り付けて保存する</li>
            <li>デプロイ → 新しいデプロイ → 種類「ウェブアプリ」を選ぶ</li>
            <li>アクセスできるユーザーを「全員」にしてデプロイする</li>
            <li>発行された「ウェブアプリのURL」を上の、該当するシリーズの欄に貼り付けて保存する</li>
            <li>この手順を、シリーズの数だけ繰り返す(スプレッドシート・デプロイともにシリーズごとに別々に用意する)</li>
          </ol>
        )}
      </div>

      <RelatedAppsSettings />
    </div>
  );
}
