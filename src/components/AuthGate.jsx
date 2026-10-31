import { useEffect, useRef, useState } from "react";
import { getConfig, getMe, loadGsi, loginWithIdToken } from "../lib/remote.js";

// アプリを開いた時点でGoogleログインを求める。
// サーバー(Worker)に繋がらない環境(npm run dev など)・クライアントID未設定のときは、ログインなしでそのまま開く。
export function AuthGate({ children }) {
  const [state, setState] = useState("checking"); // checking | open | out | in
  const [clientId, setClientId] = useState("");
  const [err, setErr] = useState("");
  const btnRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await getConfig();
      if (cancelled) return;
      if (!cfg || !cfg.googleClientId) return setState("open");
      setClientId(cfg.googleClientId);
      const me = await getMe();
      if (cancelled) return;
      if (me === undefined) return setState("open"); // 通信できないときは締め出さない
      setState(me ? "in" : "out");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== "out") return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !btnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (r) => {
            setErr("");
            try {
              await loginWithIdToken(r.credential);
              setState("in");
            } catch (e) {
              setErr(e.message);
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large", width: 280, text: "signin_with" });
      })
      .catch((e) => setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [state, clientId]);

  if (state === "open" || state === "in") return children;
  if (state === "checking") return null;
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--paper)]">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 space-y-4 text-center max-w-sm w-full">
        <p className="font-display text-lg font-semibold text-[var(--ink)]">謎文具キツツキ堂見積台帳</p>
        <p className="text-xs text-[var(--text-muted)]">Googleアカウントでログインしてください。</p>
        <div className="flex justify-center">
          <div ref={btnRef} />
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </div>
  );
}
