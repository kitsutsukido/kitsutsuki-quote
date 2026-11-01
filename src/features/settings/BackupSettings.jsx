import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

// 見積もりのデータを、ファイルに書き出す(控え)・読み込む(控えから戻す)。
// 合言葉・スプレッドシートURLは含めない。
const APP_ID = "kitsutsuki-quote-backup";
const DATA_KEYS = ["projects", "sessions", "lineItems", "groups", "profitSettings", "profitPatterns"];

// data: 今のデータ({projects, ...})、applyData(d): データを置き換える
export function BackupSettings({ data: current, applyData }) {
  const fileRef = useRef(null);
  const [message, setMessage] = useState("");

  const exportData = () => {
    const data = {};
    for (const k of DATA_KEYS) if (current?.[k] !== undefined) data[k] = current[k];
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
      if (!window.confirm(`バックアップ(書き出し日時: ${when} UTC)を読み込みます。\n今のデータは上書きされます(共有データも同じ内容になります)。よろしいですか？`)) return;
      const next = {};
      for (const k of keys) next[k] = payload.data[k];
      applyData(next);
      setMessage("読み込みました。共有データにも保存されます。");
    } catch (err) {
      setMessage("ファイルを読み込めませんでした。");
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--ink)]">データの控え(書き出し・読み込み)</p>
      <p className="text-xs text-[var(--text-muted)]">
        見積もりのデータは共有データに保存され、パソコンでもスマホでも同じ内容です。ここでは、控えとしてファイルに書き出したり、
        書き出したファイルから戻したりできます(読み込むと、今のデータが置き換わります。合言葉・スプレッドシートURLは含みません)。
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
