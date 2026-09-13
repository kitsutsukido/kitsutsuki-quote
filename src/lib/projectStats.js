export function projectStats(project, sessions, lineItems) {
  const projectSessions = sessions.filter((s) => s.projectId === project.id);
  const confirmed = projectSessions.find((s) => s.status === "確定");
  if (!confirmed) {
    return { hasConfirmed: false, quoteStage: projectSessions.length ? `仮見積もり中(${projectSessions.length}回)` : "見積もり未作成" };
  }
  const items = lineItems.filter((it) => it.sessionId === confirmed.id);
  const today = new Date().toISOString().slice(0, 10);
  const submitted = items.filter((it) => it.actualDate).length;
  const overdue = items.filter((it) => it.plannedDate && !it.actualDate && it.plannedDate < today).length;
  return { hasConfirmed: true, quoteStage: "確定済み", total: items.length, submitted, overdue };
}
