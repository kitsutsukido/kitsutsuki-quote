export function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-stone-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}
