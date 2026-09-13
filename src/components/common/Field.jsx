export function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-[var(--text-muted)] block mb-1">{label}</label>
      {children}
    </div>
  );
}
