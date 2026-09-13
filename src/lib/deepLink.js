// ---------- ディープリンク(?productId=...)の解決 ----------
// 該当するproductIdの案件が見つかれば、その案件の画面を直接開くための
// 初期表示状態(selectedId/view)を返す。見つからなければnullを返す。
export function resolveProductDeepLink(products, projects, search) {
  const params = new URLSearchParams(search);
  const productId = params.get("productId");
  if (!productId) return null;

  const product = products.find((p) => p.id === productId);
  if (!product) return null;

  const productProjects = projects.filter((p) => p.productId === productId);
  if (productProjects.length === 0) return null;

  // 進行中の案件があればそれを優先し、なければ先頭の案件を開く
  const target = productProjects.find((p) => p.status === "進行中") || productProjects[0];
  return { selectedId: target.id, view: "project" };
}
