import { specString, isMaterial } from "../../lib/spec.js";

// 仕様の表示。加工は見落とさないよう、仕様のあとに「・加工名」の行で出す
export function SpecText({ item }) {
  const processes = isMaterial(item) ? [] : item.processes || [];
  return (
    <>
      {specString(item, { withProcesses: false })}
      {processes.map((p, i) => (
        <span key={i} className="block text-[var(--ink)] font-medium">・{p}</span>
      ))}
    </>
  );
}
