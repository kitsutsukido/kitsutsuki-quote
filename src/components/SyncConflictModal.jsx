import { Modal } from "./common/Modal.jsx";
import { summarize } from "../lib/dataSync.js";

const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });
  } catch (e) {
    return iso || "不明";
  }
};

// 別の端末で更新されていて、この端末にも未送信の変更があるとき、どちらを使うか選ぶ
export function SyncConflictModal({ local, remote, onUseLocal, onUseRemote, title = "データが2か所で違っています", description = "別の端末で更新された共有データと、この端末のデータが違います。どちらを使いますか？(選ばなかったほうは上書きされます)" }) {
  const l = summarize(local);
  const r = summarize(remote.data);
  return (
    <Modal>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-4">
        <p className="text-base font-medium text-[var(--ink)]">{title}</p>
        <p className="text-sm text-[var(--text)]">{description}</p>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="border border-[var(--border)] rounded-md p-3 space-y-1">
            <p className="font-medium">この端末のデータ</p>
            <p className="text-[var(--text-muted)]">ロット{l.lots}件・明細{l.items}件</p>
          </div>
          <div className="border border-[var(--border)] rounded-md p-3 space-y-1">
            <p className="font-medium">共有データ</p>
            <p className="text-[var(--text-muted)]">ロット{r.lots}件・明細{r.items}件</p>
            <p className="text-[var(--text-muted)] text-xs">最終更新: {fmt(remote.updatedAt)}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={onUseLocal} className="flex-1 text-sm px-3 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-md">この端末のデータを使う(共有データを上書き)</button>
          <button onClick={onUseRemote} className="flex-1 text-sm px-3 py-2 border border-[var(--border)] rounded-md">共有データを使う(この端末のデータは置き換え)</button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">共有データに置き換える場合も、この端末のデータは控えとして残ります。</p>
      </div>
    </Modal>
  );
}
