import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";
import { loadRelatedApps, saveRelatedApps } from "../../lib/relatedAppsStorage.js";

// ---------- 関連アプリの登録・編集・削除(設定・連携画面のカード) ----------
export function RelatedAppsSettings() {
  const [apps, setApps] = useState(() => loadRelatedApps());
  const [editingId, setEditingId] = useState(null); // null=非表示 / "new"=新規追加 / それ以外=編集中のid
  const [form, setForm] = useState({ name: "", url: "" });

  useEffect(() => {
    saveRelatedApps(apps);
  }, [apps]);

  const openAddForm = () => {
    setEditingId("new");
    setForm({ name: "", url: "" });
  };
  const openEditForm = (app) => {
    setEditingId(app.id);
    setForm({ name: app.name, url: app.url });
  };
  const cancelForm = () => setEditingId(null);

  const submitForm = () => {
    const name = form.name.trim();
    const url = form.url.trim();
    if (!name || !url) return;
    if (editingId === "new") {
      setApps((prev) => [...prev, { id: `app-${Date.now()}`, name, url }]);
    } else {
      setApps((prev) => prev.map((a) => (a.id === editingId ? { ...a, name, url } : a)));
    }
    setEditingId(null);
  };

  const removeApp = (id) => {
    if (!window.confirm("このアプリのリンクを削除しますか？")) return;
    setApps((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--ink)]">関連アプリ</p>
        <button
          onClick={openAddForm}
          className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1"
        >
          <Plus size={14} /> アプリを追加
        </button>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        在庫管理アプリなど、このアプリと合わせて使う他のアプリへのリンクを登録しておくと、ダッシュボードにカードとして表示され、タップで新しいタブで開けます
      </p>

      {editingId && (
        <div className="border border-[var(--border)] rounded-md p-3 space-y-3">
          <Field label="アプリ名">
            <input
              className={inputCls}
              placeholder="例：在庫管理アプリ"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </Field>
          <Field label="URL">
            <input
              className={inputCls}
              placeholder="https://..."
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button onClick={cancelForm} className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md text-[var(--text)]">
              キャンセル
            </button>
            <button onClick={submitForm} className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md">
              {editingId === "new" ? "登録" : "保存"}
            </button>
          </div>
        </div>
      )}

      {apps.length === 0 ? (
        !editingId && <p className="text-xs text-[var(--text-muted)]">登録がありません。「＋アプリを追加」で登録できます(複数追加可)。</p>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <div key={app.id} className="border border-[var(--border)] rounded-md p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink)] truncate">{app.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{app.url}</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => openEditForm(app)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1"
                >
                  <Pencil size={12} /> 編集
                </button>
                <button
                  onClick={() => removeApp(app.id)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] flex items-center gap-1"
                >
                  <Trash2 size={12} /> 削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
