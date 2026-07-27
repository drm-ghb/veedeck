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
  .vd-page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; padding: 28px 32px; }
  .vd-topbar { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; width: 100%; margin: 0 auto; }
  .vd-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .vd-brand img.ico { height: 28px; width: 28px; object-fit: contain; }
  .vd-brand img.word { height: 20px; }
  .vd-back-link {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px;
    color: var(--muted-foreground); font-weight: 500; padding: 8px 12px;
    border-radius: 10px; transition: background 140ms, color 140ms; cursor: pointer;
    background: none; border: none; font-family: inherit; text-decoration: none;
  }
  .vd-back-link:hover { background: rgba(255,255,255,0.65); color: var(--foreground); }
  .vd-back-link svg { width: 14px; height: 14px; }
  .vd-stage { display: grid; place-items: center; padding: 32px 0; }
  .vd-panel { width: 100%; max-width: 460px; display: flex; flex-direction: column; gap: 22px; }
  .vd-panel-head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .vd-panel-head h1 { font-size: clamp(28px, 4vw, 36px); line-height: 1.08; }
  .vd-panel-head .sub { color: var(--muted-foreground); font-size: 15px; max-width: 380px; margin: 0; }
  .vd-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary); }
  .vd-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); animation: vd-pulse 1.6s ease-in-out infinite; }
  @keyframes vd-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .vd-card { background: #fff; border: 1px solid var(--border); border-radius: 22px; padding: 28px 28px 26px; box-shadow: 0 30px 60px -30px rgba(15,23,42,.18), 0 4px 16px -6px rgba(15,23,42,.06); display: flex; flex-direction: column; gap: 16px; }
  .vd-card-success { text-align: center; align-items: center; gap: 18px; padding: 36px 28px 28px; }
  .vd-success-icon { width: 68px; height: 68px; border-radius: 50%; background: #EEF2FF; color: var(--primary); display: grid; place-items: center; box-shadow: 0 0 0 8px rgba(165,180,252,.18); }
  .vd-success-icon svg { width: 30px; height: 30px; }
  .vd-h2 { font-family: var(--font-heading); font-size: 22px; font-weight: 700; letter-spacing: -0.022em; color: var(--foreground); margin: 0; }
  .vd-body-text { font-size: 14.5px; color: var(--muted-foreground); line-height: 1.6; max-width: 340px; margin: 0; }
  .vd-meta-note { font-size: 13px; color: var(--muted-foreground); background: var(--secondary); padding: 10px 14px; border-radius: 10px; text-align: center; }
  .vd-form-stack { display: flex; flex-direction: column; gap: 14px; }
  .vd-field { display: flex; flex-direction: column; gap: 8px; }
  .vd-label { font-size: 13px; font-weight: 600; color: var(--foreground); }
  .vd-input { height: 48px; width: 100%; border: 1px solid var(--border); background: #fff; border-radius: 12px; padding: 0 14px; font-family: var(--font-sans); font-size: 14.5px; color: var(--foreground); transition: border-color 140ms, box-shadow 140ms; outline: none; box-sizing: border-box; }
  .vd-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79,70,229,.12); }
  .vd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 22px; border-radius: 12px; font-family: var(--font-sans); font-size: 14.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: transform 120ms, background 140ms, box-shadow 140ms; outline: none; box-sizing: border-box; }
  .vd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .vd-btn.w-full { width: 100%; }
  .vd-btn[data-variant="primary"] { background: var(--primary); color: #fff; box-shadow: 0 8px 22px -10px rgba(79,70,229,.55); }
  .vd-btn[data-variant="primary"]:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px -10px rgba(79,70,229,.65); }
  .vd-btn[data-variant="ghost"] { background: transparent; color: var(--muted-foreground); border-color: transparent; }
  .vd-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--secondary); color: var(--foreground); }
  .vd-divider-or { position: relative; display: flex; align-items: center; margin: 4px 0; }
  .vd-divider-or::before, .vd-divider-or::after { content: ""; flex: 1; height: 1px; background: var(--border); }
  .vd-divider-or span { padding: 0 12px; font-size: 12px; color: var(--muted-foreground); font-weight: 500; }
  .vd-error-text { font-size: 12.5px; color: var(--destructive); }
  .vd-switch-row { text-align: center; font-size: 14px; color: var(--muted-foreground); }
  .vd-meta-link { font-size: 14px; color: var(--foreground); font-weight: 600; cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; text-decoration: none; }
  .vd-meta-link:hover { color: var(--primary); text-decoration: underline; }
  .vd-footer { text-align: center; padding: 16px 0 8px; color: var(--muted-foreground); font-size: 12.5px; }
  .vd-footer a { color: var(--muted-foreground); }
  .vd-password-wrap { position: relative; }
  .vd-password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: transparent; border: 0; padding: 6px; cursor: pointer; color: #9aa0b0; display: inline-flex; align-items: center; border-radius: 6px; transition: color 120ms; }
  .vd-password-toggle:hover { color: var(--foreground); }
  .vd-password-toggle svg { width: 16px; height: 16px; display: block; }
  .vd-input.has-trailing { padding-right: 44px; }
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

type View = "link" | "password" | "sent";

function RoleSwitcher({ current }: { current: "projektant" | "klient" | "wykonawca" }) {
  const [open, setOpen] = useState(false);
  const labels = { projektant: "Projektant", klient: "Klient", wykonawca: "Wykonawca" };
  const links = { projektant: "/login", klient: "/login/klient", wykonawca: "/login/wykonawca" };
  return (
    <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
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

export default function LoginKlientPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState("");

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/access/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Wystąpił błąd. Spróbuj ponownie.");
        setLoading(false);
        return;
      }
      setSentEmail(email.trim());
      setView("sent");
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.");
    }
    setLoading(false);
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Nieprawidłowy e-mail lub hasło.");
      setLoading(false);
      return;
    }
    const session = await getSession();
    const role = (session?.user as any)?.role;
    router.push(role === "contractor" ? "/wykonawca" : "/client");
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
            <RoleSwitcher current="klient" />
            <a className="vd-back-link" href="https://veedeck.com">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Wróć na stronę</span>
            </a>
          </header>

          <main className="vd-stage">
            <div className="vd-panel">

              {/* ── LINK REQUEST ── */}
              {view === "link" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Panel klienta</div>
                    <h1>Zaloguj się<br />do swojego panelu.</h1>
                    <p className="sub">Podaj adres e-mail — wyślemy Ci link dostępowy.</p>
                  </div>

                  <div className="vd-card">
                    <form className="vd-form-stack" onSubmit={handleRequestLink} autoComplete="on">
                      <div className="vd-field">
                        <label className="vd-label" htmlFor="email">Adres e-mail</label>
                        <input
                          className="vd-input"
                          id="email"
                          type="email"
                          required
                          autoComplete="email"
                          autoFocus
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      {error && <p className="vd-error-text">{error}</p>}
                      <button
                        type="submit"
                        className="vd-btn w-full"
                        data-variant="primary"
                        disabled={loading}
                        style={{ marginTop: 4 }}
                      >
                        {loading ? "Wysyłamy link…" : "Wyślij link dostępowy"}
                      </button>
                    </form>

                    <div className="vd-divider-or"><span>lub</span></div>

                    <button
                      type="button"
                      className="vd-btn w-full"
                      data-variant="ghost"
                      onClick={() => { setError(""); setView("password"); }}
                    >
                      Zaloguj się hasłem
                    </button>
                  </div>

                  <p className="vd-switch-row">
                    Jesteś projektantem?{" "}
                    <a href="/login" className="vd-meta-link">Zaloguj się tutaj →</a>
                  </p>
                </>
              )}

              {/* ── PASSWORD LOGIN ── */}
              {view === "password" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Logowanie hasłem</div>
                    <h1>Wpisz hasło<br />do swojego panelu.</h1>
                  </div>

                  <div className="vd-card">
                    <form className="vd-form-stack" onSubmit={handlePasswordLogin} autoComplete="on">
                      <div className="vd-field">
                        <label className="vd-label" htmlFor="email-pwd">Adres e-mail</label>
                        <input
                          className="vd-input"
                          id="email-pwd"
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
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
                        style={{ marginTop: 4 }}
                      >
                        {loading ? "Logowanie…" : "Zaloguj się"}
                      </button>
                    </form>

                    <div className="vd-divider-or"><span>lub</span></div>

                    <button
                      type="button"
                      className="vd-btn w-full"
                      data-variant="ghost"
                      onClick={() => { setError(""); setView("link"); }}
                    >
                      Wyślij mi link dostępowy
                    </button>
                  </div>
                </>
              )}

              {/* ── SENT ── */}
              {view === "sent" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Link w drodze</div>
                    <h1>Sprawdź skrzynkę.<br />Link już jedzie.</h1>
                  </div>

                  <div className="vd-card vd-card-success">
                    <div className="vd-success-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <p className="vd-h2">Wysłaliśmy link</p>
                    <p className="vd-body-text">
                      Jeśli konto z adresem <strong style={{ color: "#24252B" }}>{sentEmail}</strong> istnieje,
                      wysłaliśmy link dostępowy. Kliknij go, aby zalogować się bez hasła.
                    </p>
                    <p className="vd-meta-note">Nie widzisz wiadomości? Sprawdź folder Spam lub Oferty.</p>
                    <button
                      type="button"
                      className="vd-btn w-full"
                      data-variant="ghost"
                      onClick={() => { setView("link"); setEmail(""); }}
                    >
                      Spróbuj z innym e-mailem
                    </button>
                  </div>
                </>
              )}

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
