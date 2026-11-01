import { useState } from "react";
import { ChevronRight, ChevronDown, Copy } from "lucide-react";
import { RelatedAppsSettings } from "../relatedApps/RelatedAppsSettings.jsx";
import { SheetUrlsSettings } from "./SheetUrlsSettings.jsx";
import { BackupSettings } from "./BackupSettings.jsx";
import gasCode from "../../../gas/Code.gs?raw";

// ---------- 設定・連携画面 ----------
export function Settings({ products, sync }) {
  const [showCodeSection, setShowCodeSection] = useState(false);
  const [copied, setCopied] = useState(false);

  // Apps Script に貼り付けるコード(gas/Code.gs)をクリップボードにコピーする
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(gasCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      window.alert("コピーできませんでした。下のコード欄を長押し(選択)してコピーしてください。");
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-lg font-medium text-[var(--ink)]">設定・連携</p>

      <BackupSettings
        data={{ members: sync.members, products: sync.products, projects: sync.projects, sessions: sync.sessions, lineItems: sync.lineItems, groups: sync.groups, profitSettings: sync.settings, profitPatterns: sync.patterns }}
        applyData={(d) => {
          if (d.members) sync.setMembers(d.members);
          if (d.products) sync.setProducts(d.products);
          if (d.projects) sync.setProjects(d.projects);
          if (d.sessions) sync.setSessions(d.sessions);
          if (d.lineItems) sync.setLineItems(d.lineItems);
          if (d.groups) sync.setGroups(d.groups);
          if (d.profitSettings) sync.setSettings(d.profitSettings);
          if (d.profitPatterns) sync.setPatterns(d.profitPatterns);
        }}
      />

      <p className="text-sm font-medium text-[var(--ink)] pt-2">Google スプレッドシート連携</p>

      <SheetUrlsSettings products={products} sync={sync} />

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
            <li>下の「コードをコピー」で、Apps Script 用のコードをコピーして貼り付け、保存する(コードの編集は不要)</li>
            <li>左の歯車「プロジェクトの設定」→ 一番下の「スクリプト プロパティ」で、プロパティ <code className="font-mono">SHARED_SECRET</code>、値に合言葉を追加する(アプリの合言葉欄と同じ文字列)</li>
            <li>デプロイ → 新しいデプロイ → 種類「ウェブアプリ」を選ぶ</li>
            <li>アクセスできるユーザーを「全員」にしてデプロイする</li>
            <li>発行された「ウェブアプリのURL」を上の、該当するシリーズの欄に貼り付けて保存する</li>
            <li>この手順を、シリーズの数だけ繰り返す(スプレッドシート・デプロイともにシリーズごとに別々に用意する)</li>
          </ol>
        )}
        {showCodeSection && (
          <div className="mt-3 space-y-2">
            <button onClick={copyCode} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1">
              <Copy size={14} /> {copied ? "コピーしました" : "コードをコピー"}
            </button>
            <textarea readOnly value={gasCode} rows={6} className="w-full text-xs font-mono border border-[var(--border)] rounded-md p-2 bg-[var(--paper)]" />
          </div>
        )}
      </div>

      <RelatedAppsSettings />
    </div>
  );
}
