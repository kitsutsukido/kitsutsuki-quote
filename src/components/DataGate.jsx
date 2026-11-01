import { useEffect, useState } from "react";
import { bootstrapData, resolveChoice } from "../lib/dataSync.js";
import { SyncConflictModal } from "./SyncConflictModal.jsx";

// 見積もりデータを共有データから読み込んでから、アプリを表示する
export function DataGate({ children }) {
  const [boot, setBoot] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setBoot(null);
    setErr("");
    setBoot(await bootstrapData());
  };
  useEffect(() => {
    load();
  }, []);

  const choose = async (useLocal) => {
    try {
      setBoot(await resolveChoice(boot.choice, useLocal));
    } catch (e) {
      setErr(e.message === "conflict" ? "別の端末が先に保存しました。再読み込みしてください。" : e.message);
    }
  };

  const center = (body) => <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--paper)] text-sm text-[var(--text-muted)]">{body}</div>;
  if (!boot) return center("読み込み中…");
  if (boot.mode === "error") {
    return center(
      <div className="text-center space-y-3">
        <p className="text-[var(--danger)]">データを読み込めませんでした。{boot.message}</p>
        <button onClick={load} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md">再試行</button>
      </div>
    );
  }
  if (boot.choice) {
    return (
      <div className="min-h-screen bg-[var(--paper)]">
        <SyncConflictModal
          title="この端末に、以前のデータが残っています"
          description="見積もりのデータは、これから共有データ1か所に保存します。この端末に残っているデータと共有データが違うので、どちらを使うか選んでください。"
          local={boot.choice.local}
          remote={boot.choice.remote}
          onUseLocal={() => choose(true)}
          onUseRemote={() => choose(false)}
        />
        {err && <p className="fixed bottom-4 left-4 text-sm text-[var(--danger)]">{err}</p>}
      </div>
    );
  }
  return children(boot);
}
