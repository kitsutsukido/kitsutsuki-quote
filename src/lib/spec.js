export function specString(item) {
  const parts = [
    item.size,
    `${item.colorFront}/${item.colorBack}`,
    item.paper ? `${item.paper}${item.weight || ""}` : item.weight,
    ...item.processes,
  ].filter(Boolean);
  return parts.join(" ");
}
