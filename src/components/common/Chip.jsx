export function Chip({ children, active, onClick, colorClass }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded-md border transition ${
        colorClass ? colorClass : active ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-stone-300 text-stone-600 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}
