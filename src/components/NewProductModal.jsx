import { useState } from "react";
import { Modal } from "./common/Modal.jsx";
import { inputCls } from "./common/inputStyles.js";

const NEW = "__new__";

// 新規商品(名前とシリーズ)を作る。ロットは、作ったあとの商品の画面で登録する。
export function NewProductModal({ genres, onCreate, onClose }) {
  const [name, setName] = useState("");
  const [genre, setGenre] = useState(genres[0] ?? NEW);
  const [newGenre, setNewGenre] = useState("");
  const finalGenre = genre === NEW ? newGenre.trim() : genre;
  const ok = name.trim() && finalGenre;

  return (
    <Modal>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
        <p className="text-base font-medium text-[var(--ink)]">新規商品を作成</p>
        <label className="block text-xs text-[var(--text-muted)]">
          商品名
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ○○からの招待状" autoFocus />
        </label>
        <label className="block text-xs text-[var(--text-muted)]">
          シリーズ
          <select className={inputCls} value={genre} onChange={(e) => setGenre(e.target.value)}>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            <option value={NEW}>新しいシリーズを作る…</option>
          </select>
        </label>
        {genre === NEW && (
          <input className={inputCls} value={newGenre} onChange={(e) => setNewGenre(e.target.value)} placeholder="新しいシリーズ名" />
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md">キャンセル</button>
          <button
            disabled={!ok}
            onClick={() => onCreate({ name: name.trim(), genre: finalGenre })}
            className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md disabled:opacity-40"
          >
            作成
          </button>
        </div>
      </div>
    </Modal>
  );
}
