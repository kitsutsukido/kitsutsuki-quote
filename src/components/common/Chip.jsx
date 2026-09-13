export function Chip({ children, active, onClick, colorClass }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded-md border transition ${
        colorClass ? colorClass : active ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--paper)]"
      }`}
    >
      {children}
    </button>
  );
}
