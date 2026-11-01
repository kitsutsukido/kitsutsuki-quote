import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

// 見積もりのデータ(このブラウザの中にだけある)を、ファイルに書き出す・読み込む。
// パソコンとスマホの間でデータを移すための暫定機能(スプレッドシート同期ができるまで)。
// 合言葉・スプレッドシートURLは端末ごとの設定なので含めない。
const APP_ID = "kitsutsuki-quote-backup";
const DATA_KEYS = ["projects", "sessions", "lineItems", "groups", "profitSettings", "profitPatterns"];

export function BackupSettings() {
  const fileRef = useRef(null);
  const [message, setMessage] = useState("");

  const exportData = () => {
    const data = {};
    for (const k of DATA_KEYS) {
      try {
        const raw = window.localStorage.getItem(`zk-quote:${k}`);
        if (raw) data[k] = JSON.parse(raw);
      } catch (e) {
        // 読めないキーは飛ばす
      }
    }
    if (Object.keys(data).length === 0) {
      setMessage("書き出せるデータがまだありません(まだ何も編集していない状態です)。");
      return;
    }
    const payload = { app: APP_ID, version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kitsutsuki-quote-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage("書き出しました。ダウンロードされたファイルを、読み込みたい端末に送ってください。");
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.app !== APP_ID || typeof payload.data !== "object" || payload.data === null) {
        setMessage("このアプリのバックアップファイルではありません。");
        return;
      }
      const keys = DATA_KEYS.filter((k) => payload.data[k] !== undefined);
      if (keys.length === 0) {
        setMessage("ファイルの中に読み込めるデータがありません。");
        return;
      }
      const when = payload.exportedAt ? payload.exportedAt.slice(0, 16).replace("T", " ") : "不明";
      if (!window.confirm(`バックアップ(書き出し日時: ${when} UTC)を読み込みます。\nこの端末の今のデータは上書きされ、元に戻せません。よろしいですか？`)) return;
      for (const k of keys) {
        window.localStorage.setItem(`zk-quote:${k}`, JSON.stringify(payload.data[k]));
      }
      // 読み込んだデータは共有データにも反映させる(次の同期で送る印)
      try {
        const meta = JSON.parse(window.localStorage.getItem("zk-quote:syncMeta") || "{}");
        window.localStorage.setItem("zk-quote:syncMeta", JSON.stringify({ ...meta, dirty: true }));
      } catch (e2) {
        /* 印を付けられなくても読み込みは続ける */
      }
      window.location.reload();
    } catch (err) {
      setMessage("ファイルを読み込めませんでした。");
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--ink)]">データのバックアップ・端末間の移行</p>
      <p className="text-xs text-[var(--text-muted)]">
        見積もりのデータは、いまこのブラウザの中にだけ保存されています。パソコンとスマホでは別のデータです。
        書き出したファイルを別の端末で読み込むと、そのデータに置き換わります(合言葉・スプレッドシートURLは含みません)。
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportData} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1">
          <Download size={14} /> データを書き出す
        </button>
        <button onClick={() => fileRef.current?.click()} className="text-sm px-3 py-1.5 border border-[var(--border)] text-[var(--text)] rounded-md flex items-center gap-1">
          <Upload size={14} /> データを読み込む
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
      </div>
      {message && <p className="text-xs text-[var(--text)]">{message}</p>}
    </div>
  );
}
