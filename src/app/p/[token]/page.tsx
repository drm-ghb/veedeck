"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useT } from "@/lib/i18n";

const CSS = `
  .vd-body {
    --background: #FFFFFF;
    --foreground: #24252B;
    --primary: #4F46E5;
    --secondary: #F2F3F7;
    --muted-foreground: #6B6F80;
    --border: #E5E7EB;
    --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
    --font-heading: "Inter", ui-sans-serif, system-ui, sans-serif;
    font-family: var(--font-sans);
    color: var(--foreground);
    -webkit-font-smoothing: antialiased;
    line-height: 1.5;
    min-height: 100vh;
    background:
      radial-gradient(1100px 480px at 80% -10%, rgba(165, 180, 252, 0.32), transparent 60%),
      radial-gradient(800px 380px at 8% 0%, rgba(79, 70, 229, 0.12), transparent 65%),
      #FFFFFF;
    background-attachment: fixed;
  }
  .vd-body h1, .vd-body h2 { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.028em; margin: 0; }
  .vd-page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; padding: 28px 32px; }
  .vd-topbar { display: flex; align-items: center; max-width: 1200px; width: 100%; margin: 0 auto; }
  .vd-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .vd-brand img.ico { height: 28px; width: 28px; object-fit: contain; }
  .vd-brand img.word { height: 20px; }
  .vd-stage { display: grid; place-items: center; padding: 32px 0; }
  .vd-panel { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 22px; align-items: center; text-align: center; }
  .vd-card {
    background: #fff; border: 1px solid var(--border); border-radius: 22px;
    padding: 40px 32px;
    box-shadow: 0 30px 60px -30px rgba(15, 23, 42, 0.18), 0 4px 16px -6px rgba(15, 23, 42, 0.06);
    display: flex; flex-direction: column; gap: 16px; align-items: center; width: 100%;
  }
  .vd-spinner { width: 40px; height: 40px; border: 3px solid var(--secondary); border-top-color: var(--primary); border-radius: 50%; animation: vd-spin 0.75s linear infinite; }
  @keyframes vd-spin { to { transform: rotate(360deg); } }
  .vd-icon { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; box-shadow: 0 0 0 8px rgba(165, 180, 252, 0.18); }
  .vd-icon svg { width: 28px; height: 28px; }
  .vd-h2 { font-family: var(--font-heading); font-size: 22px; font-weight: 700; letter-spacing: -0.022em; color: var(--foreground); margin: 0; }
  .vd-body-text { font-size: 14.5px; color: var(--muted-foreground); line-height: 1.6; max-width: 320px; margin: 0; }
  .vd-meta-note { font-size: 13px; color: var(--muted-foreground); background: var(--secondary); padding: 10px 16px; border-radius: 10px; }
  .vd-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    height: 46px; padding: 0 22px; border-radius: 12px;
    font-family: var(--font-sans); font-size: 14.5px; font-weight: 600;
    cursor: pointer; border: 1px solid var(--border); background: #fff;
    color: var(--foreground); text-decoration: none;
    transition: background 140ms;
  }
  .vd-btn:hover { background: var(--secondary); }
  .vd-footer { text-align: center; padding: 16px 0 8px; color: var(--muted-foreground); font-size: 12.5px; }
  .vd-footer a { color: var(--muted-foreground); }
  @media (max-width: 520px) {
    .vd-page { padding: 20px 16px; }
    .vd-card { padding: 28px 20px; border-radius: 18px; }
  }
`;

type Status = "loading" | "error" | "expired" | "revoked";

export default function AccessTokenPage() {
  const t = useT();
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    (async () => {
      const raw = decodeURIComponent(token);
      const result = await signIn("credentials", {
        accessToken: raw,
        redirect: false,
      });

      if (result?.error) {
        // Try to get specific reason from verify endpoint
        try {
          const res = await fetch(
            `/api/access/verify?token=${encodeURIComponent(raw)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.reason === "expired") { setStatus("expired"); return; }
            if (data.reason === "revoked") { setStatus("revoked"); return; }
          }
        } catch {}
        setStatus("error");
        return;
      }

      // Success — redirect based on role
      const session = await getSession();
      const role = (session?.user as any)?.role ?? "designer";
      if (role === "contractor") {
        router.replace("/wykonawca");
      } else {
        const listId = searchParams.get("listId");
        const moodboardProjectId = searchParams.get("moodboardProjectId");
        router.replace(
          listId ? `/client?listId=${listId}`
          : moodboardProjectId ? `/client/${moodboardProjectId}/moodboard`
          : "/client"
        );
      }
    })();
  }, [token, router]);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="vd-body">
        <div className="vd-page">
          <header className="vd-topbar">
            <a className="vd-brand" href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ico" src="/vee-icon.png" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="word" src="/vee_black.png" alt="veedeck" />
            </a>
          </header>

          <main className="vd-stage">
            <div className="vd-panel">

              {status === "loading" && (
                <div className="vd-card">
                  <div className="vd-spinner" />
                  <p className="vd-h2" style={{ fontSize: 18 }}>{t.token.opening}</p>
                  <p className="vd-body-text">{t.token.verifying}</p>
                </div>
              )}

              {status === "expired" && (
                <div className="vd-card">
                  <div className="vd-icon" style={{ background: "#fef9c3", color: "#ca8a04" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <p className="vd-h2">{t.token.expired}</p>
                  <p className="vd-body-text">{t.token.expiredDesc}</p>
                  <p className="vd-meta-note">{t.token.expiredNote}</p>
                </div>
              )}

              {status === "revoked" && (
                <div className="vd-card">
                  <div className="vd-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <p className="vd-h2">{t.token.revoked}</p>
                  <p className="vd-body-text">{t.token.revokedDesc}</p>
                </div>
              )}

              {status === "error" && (
                <div className="vd-card">
                  <div className="vd-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <p className="vd-h2">{t.token.invalid}</p>
                  <p className="vd-body-text">{t.token.invalidDesc}</p>
                  <a href="/login" className="vd-btn">{t.token.loginDifferently}</a>
                </div>
              )}

            </div>
          </main>

          <footer className="vd-footer">
            © 2026 veedeck ·{" "}
            <a href="https://veedeck.com/polityka-prywatnosci.html">{t.auth.privacyPolicy}</a>
          </footer>
        </div>
      </div>
    </>
  );
}
