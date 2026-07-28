"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const CSS = `
  .vd-body {
    --foreground: #24252B; --primary: #4F46E5; --secondary: #F2F3F7;
    --muted-foreground: #6B6F80; --border: #E5E7EB; --destructive: #DC2626;
    --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
    --font-heading: "Inter", ui-sans-serif, system-ui, sans-serif;
    font-family: var(--font-sans); color: var(--foreground);
    -webkit-font-smoothing: antialiased; line-height: 1.5; min-height: 100vh;
    background: radial-gradient(1100px 480px at 80% -10%, rgba(165,180,252,.32), transparent 60%),
      radial-gradient(800px 380px at 8% 0%, rgba(79,70,229,.12), transparent 65%), #FFFFFF;
    background-attachment: fixed;
  }
  .vd-body h1 { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.028em; margin: 0; }
  .vd-body p { margin: 0; }
  .vd-page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; padding: 28px 32px; }
  .vd-topbar { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; width: 100%; margin: 0 auto; }
  .vd-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .vd-brand img.ico { height: 28px; width: 28px; object-fit: contain; }
  .vd-brand img.word { height: 20px; }
  .vd-back-link {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px;
    color: var(--muted-foreground); font-weight: 500; padding: 8px 12px;
    border-radius: 10px; transition: background 140ms, color 140ms; text-decoration: none;
  }
  .vd-back-link:hover { background: rgba(255,255,255,0.65); color: var(--foreground); }
  .vd-back-link svg { width: 14px; height: 14px; }
  .vd-stage { display: grid; place-items: center; padding: 32px 0; }
  .vd-panel { width: 100%; max-width: 460px; display: flex; flex-direction: column; gap: 22px; }
  .vd-panel-head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .vd-panel-head h1 { font-size: clamp(28px, 4vw, 36px); line-height: 1.08; }
  .vd-panel-head .sub { color: var(--muted-foreground); font-size: 15px; max-width: 380px; }
  .vd-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary); }
  .vd-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); animation: vd-pulse 1.6s ease-in-out infinite; }
  @keyframes vd-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .vd-card { background: #fff; border: 1px solid var(--border); border-radius: 22px; padding: 28px 28px 26px; box-shadow: 0 30px 60px -30px rgba(15,23,42,.18), 0 4px 16px -6px rgba(15,23,42,.06); display: flex; flex-direction: column; gap: 16px; }
  .vd-form-stack { display: flex; flex-direction: column; gap: 14px; }
  .vd-field { display: flex; flex-direction: column; gap: 8px; }
  .vd-label { font-size: 13px; font-weight: 600; color: var(--foreground); }
  .vd-input { height: 48px; width: 100%; border: 1px solid var(--border); background: #fff; border-radius: 12px; padding: 0 14px; font-family: var(--font-sans); font-size: 14.5px; color: var(--foreground); transition: border-color 140ms, box-shadow 140ms; outline: none; box-sizing: border-box; }
  .vd-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79,70,229,.12); }
  .vd-input.has-trailing { padding-right: 44px; }
  .vd-password-wrap { position: relative; }
  .vd-password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: transparent; border: 0; padding: 6px; cursor: pointer; color: #9aa0b0; display: inline-flex; align-items: center; border-radius: 6px; transition: color 120ms; }
  .vd-password-toggle:hover { color: var(--foreground); }
  .vd-password-toggle svg { width: 16px; height: 16px; display: block; }
  .vd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 22px; border-radius: 12px; font-family: var(--font-sans); font-size: 14.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: transform 120ms, background 140ms, box-shadow 140ms; outline: none; box-sizing: border-box; }
  .vd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .vd-btn.w-full { width: 100%; }
  .vd-btn[data-variant="primary"] { background: var(--primary); color: #fff; box-shadow: 0 8px 22px -10px rgba(79,70,229,.55); }
  .vd-btn[data-variant="primary"]:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px -10px rgba(79,70,229,.65); }
  .vd-error-text { font-size: 12.5px; color: var(--destructive); }
  .vd-switch-row { text-align: center; font-size: 14px; color: var(--muted-foreground); }
  .vd-meta-link { font-size: 14px; color: var(--foreground); font-weight: 600; text-decoration: none; }
  .vd-meta-link:hover { color: var(--primary); text-decoration: underline; }
  .vd-footer { text-align: center; padding: 16px 0 8px; color: var(--muted-foreground); font-size: 12.5px; }
  .vd-footer a { color: var(--muted-foreground); }
  @media (max-width: 520px) { .vd-page { padding: 20px 16px; } .vd-card { padding: 22px 20px 20px; border-radius: 18px; } }

  .vd-topbar { position: relative; }
  .vd-role-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1px solid var(--border); background: #fff; font-family: var(--font-sans); font-size: 13.5px; font-weight: 600; color: var(--foreground); cursor: pointer; transition: background 140ms, border-color 140ms; white-space: nowrap; }
  .vd-role-btn:hover { background: var(--secondary); border-color: #cdd0db; }
  .vd-role-btn-chevron { width: 14px; height: 14px; color: var(--muted-foreground); transition: transform 140ms; flex-shrink: 0; }
  .vd-role-btn-chevron.open { transform: rotate(180deg); }
  .vd-role-dropdown { position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%); min-width: 170px; background: #fff; border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 8px 24px -8px rgba(15,23,42,.18); padding: 4px; z-index: 99; }
  .vd-role-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 12px; border-radius: 8px; border: none; background: none; font-family: var(--font-sans); font-size: 13.5px; font-weight: 500; color: var(--foreground); cursor: pointer; text-align: left; text-decoration: none; transition: background 100ms; }
  .vd-role-option:hover { background: var(--secondary); }
  .vd-role-option.active { font-weight: 700; color: var(--primary); }
`;

function RoleSwitcher({ current }: { current: "projektant" | "klient" | "wykonawca" }) {
  const [open, setOpen] = useState(false);
  const labels = { projektant: "Projektant", klient: "Klient", wykonawca: "Wykonawca" };
  const links = { projektant: "/login", klient: "/login/klient", wykonawca: "/login/wykonawca" };
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13.5, color: "var(--muted-foreground)", fontWeight: 500, whiteSpace: "nowrap" }}>Zaloguj się jako:</span>
      <button type="button" className="vd-role-btn" onClick={() => setOpen((o) => !o)}>
        {labels[current]}
        <svg className={`vd-role-btn-chevron${open ? " open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div className="vd-role-dropdown">
            {(["projektant", "klient", "wykonawca"] as const).map((role) => (
              <a key={role} href={links[role]} className={`vd-role-option${current === role ? " active" : ""}`} onClick={() => setOpen(false)}>
                {current === role && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {current !== role && <span style={{ width: 14, display: "inline-block" }} />}
                {labels[role]}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function LoginWykonawcaPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!login.trim() || !password) return;
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: login.trim(),
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Nieprawidłowy login lub hasło.");
      setLoading(false);
      return;
    }
    const session = await getSession();
    const role = (session?.user as any)?.role;
    if (role === "contractor") {
      router.push("/wykonawca");
    } else {
      router.push("/panel-glowny");
    }
    router.refresh();
  }

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
            <a className="vd-back-link" href="https://veedeck.com">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Wróć na stronę</span>
            </a>
          </header>

          <main className="vd-stage">
            <div className="vd-panel">
              <div className="vd-panel-head">
                <div className="vd-eyebrow"><span className="dot" />Panel wykonawcy</div>
                <h1>Witaj ponownie.<br />Zaloguj się.</h1>
                <p className="sub">Zaloguj się do panelu wykonawcy veedeck.</p>
              </div>

              <RoleSwitcher current="wykonawca" />

              <div className="vd-card">
                <form className="vd-form-stack" onSubmit={handleSubmit} autoComplete="on">
                  <div className="vd-field">
                    <label className="vd-label" htmlFor="login">Login</label>
                    <input
                      className="vd-input"
                      id="login"
                      type="text"
                      required
                      autoComplete="username"
                      autoFocus
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                    />
                  </div>
                  <div className="vd-field">
                    <label className="vd-label" htmlFor="password">Hasło</label>
                    <div className="vd-password-wrap">
                      <input
                        className="vd-input has-trailing"
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="vd-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Pokaż / ukryj hasło"
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {error && <p className="vd-error-text">{error}</p>}
                  <button
                    type="submit"
                    className="vd-btn w-full"
                    data-variant="primary"
                    disabled={loading}
                    style={{ marginTop: 6 }}
                  >
                    {loading ? "Logowanie…" : "Zaloguj się"}
                  </button>
                </form>
              </div>

              <p className="vd-switch-row">
                Jesteś projektantem?{" "}
                <a href="/login" className="vd-meta-link">Zaloguj się tutaj →</a>
              </p>
            </div>
          </main>

          <footer className="vd-footer">
            © 2026 veedeck ·{" "}
            <a href="https://veedeck.com/polityka-prywatnosci.html">Polityka prywatności</a>
          </footer>
        </div>
      </div>
    </>
  );
}
