// ---------- モーダル(画面の上に重ねて表示。中身が長ければ内部でスクロール) ----------
export function Modal({ children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
        <div className="w-full max-w-2xl shadow-xl rounded-lg">{children}</div>
      </div>
    </div>
  );
}
