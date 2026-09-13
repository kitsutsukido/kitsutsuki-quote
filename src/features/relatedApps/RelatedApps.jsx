import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Field } from "../../components/common/Field.jsx";
import { inputCls } from "../../components/common/inputStyles.js";

const STORAGE_KEY = "zk-quote:relatedApps";

// GAS連携ができるまでの暫定保存先としてlocalStorageを使う
function loadRelatedApps() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveRelatedApps(apps) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch (e) {
    // プライベートモード等でlocalStorageが使えない場合は保存をあきらめる
  }
}

// ---------- 関連アプリ(ダッシュボードの下部セクション) ----------
export function RelatedApps() {
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
    <div className="mt-8">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-[var(--ink)]">関連アプリ</p>
        <button
          onClick={openAddForm}
          className="text-sm px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-md flex items-center gap-1"
        >
          <Plus size={14} /> アプリを追加
        </button>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        在庫管理アプリなど、このアプリと合わせて使う他のアプリへのリンクを登録しておくと、ダッシュボードにカードとして表示され、タップで新しいタブで開けます
      </p>

      {editingId && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3 max-w-sm mb-3">
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
        !editingId && <p className="text-xs text-[var(--text-muted)]">まだ登録されている関連アプリはありません。</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {apps.map((app) => (
            <div key={app.id} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition">
              <a href={app.url} target="_blank" rel="noopener noreferrer" className="block">
                <p className="text-sm font-medium text-[var(--ink)] flex items-center gap-1">
                  {app.name}
                  <ExternalLink size={12} className="text-[var(--text-muted)] shrink-0" />
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{app.url}</p>
              </a>
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[var(--border)]">
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
