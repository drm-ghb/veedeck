"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const CSS = `
  .vd-body {
    --background: #FFFFFF;
    --foreground: #24252B;
    --primary: #4F46E5;
    --primary-foreground: #FFFFFF;
    --secondary: #F2F3F7;
    --muted-foreground: #6B6F80;
    --accent: #A5B4FC;
    --border: #E5E7EB;
    --indigo-50: #EEF2FF;
    --destructive: #DC2626;
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
      radial-gradient(700px 380px at 50% 110%, rgba(199, 210, 254, 0.35), transparent 60%),
      #FFFFFF;
    background-attachment: fixed;
  }
  .vd-body h1, .vd-body h2, .vd-body h3 { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.028em; margin: 0; }
  .vd-body p { margin: 0; line-height: 1.55; }
  .vd-body a { color: inherit; text-decoration: none; }
  .vd-body em.accent { font-style: italic; font-family: var(--font-heading); color: var(--primary); font-weight: 500; }

  .vd-page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; padding: 28px 32px; }
  .vd-topbar { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; width: 100%; margin: 0 auto; }
  .vd-brand { display: flex; align-items: center; gap: 10px; }
  .vd-brand img.ico { height: 28px; width: 28px; object-fit: contain; }
  .vd-brand img.word { height: 20px; }

  .vd-stage { display: grid; place-items: center; padding: 32px 0; }
  .vd-panel { width: 100%; max-width: 460px; position: relative; display: flex; flex-direction: column; gap: 22px; }

  .vd-panel-head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .vd-panel-head h1 { font-size: clamp(28px, 4vw, 34px); line-height: 1.1; letter-spacing: -0.028em; }
  .vd-panel-head .sub { color: var(--muted-foreground); font-size: 15px; max-width: 380px; }
  .vd-panel-head .sub b { color: var(--foreground); font-weight: 600; }

  .vd-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary);
  }
  .vd-eyebrow .dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--primary);
    animation: vd-pulse 1.6s ease-in-out infinite;
  }
  @keyframes vd-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

  .vd-card {
    background: #fff; border: 1px solid var(--border); border-radius: 22px;
    padding: 28px 28px 26px;
    box-shadow: 0 30px 60px -30px rgba(15, 23, 42, 0.18), 0 4px 16px -6px rgba(15, 23, 42, 0.06);
    display: flex; flex-direction: column; gap: 16px;
  }
  .vd-card-center {
    text-align: center; align-items: center; gap: 18px; padding: 36px 28px 28px;
  }
  .vd-icon-wrap {
    width: 68px; height: 68px; border-radius: 50%;
    display: grid; place-items: center;
    box-shadow: 0 0 0 8px rgba(165, 180, 252, 0.18);
  }
  .vd-icon-wrap svg { width: 30px; height: 30px; }

  .vd-card-center h2 { font-family: var(--font-heading); font-size: 22px; font-weight: 700; letter-spacing: -0.022em; color: var(--foreground); }
  .vd-body-text { font-size: 14.5px; color: var(--muted-foreground); line-height: 1.6; max-width: 340px; }
  .vd-meta-note { font-size: 13px; color: var(--muted-foreground); background: var(--secondary); padding: 10px 14px; border-radius: 10px; width: 100%; text-align: center; }

  .vd-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    height: 48px; padding: 0 22px; border-radius: 12px;
    font-family: var(--font-sans); font-size: 14.5px; font-weight: 600;
    cursor: pointer; border: 1px solid transparent;
    transition: transform 120ms ease, background 140ms ease, box-shadow 140ms ease, border-color 140ms ease, opacity 140ms ease, color 140ms ease;
    outline: none; text-decoration: none; box-sizing: border-box;
  }
  .vd-btn:focus-visible { box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.25); }
  .vd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .vd-btn.w-full { width: 100%; }
  .vd-btn[data-variant="primary"] { background: var(--primary); color: #fff; box-shadow: 0 8px 22px -10px rgba(79, 70, 229, 0.55); }
  .vd-btn[data-variant="primary"]:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px -10px rgba(79, 70, 229, 0.65); }
  .vd-btn[data-variant="ghost"] { background: transparent; color: var(--muted-foreground); }
  .vd-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--secondary); color: var(--foreground); }
  .vd-btn svg { width: 16px; height: 16px; flex-shrink: 0; }

  .vd-form-stack { display: flex; flex-direction: column; gap: 14px; }
  .vd-field { display: flex; flex-direction: column; gap: 8px; }
  .vd-label {
    font-size: 13px; font-weight: 600; color: var(--foreground); letter-spacing: -0.005em;
    display: flex; align-items: center; gap: 4px;
  }
  .vd-label .opt { color: var(--muted-foreground); font-weight: 400; font-size: 12px; }
  .vd-label .req { color: var(--destructive); }
  .vd-input {
    height: 48px; width: 100%; border: 1px solid var(--border); background: #fff;
    border-radius: 12px; padding: 0 14px;
    font-family: var(--font-sans); font-size: 14.5px; color: var(--foreground);
    transition: border-color 140ms, box-shadow 140ms; outline: none; box-sizing: border-box;
  }
  .vd-input::placeholder { color: #9aa0b0; }
  .vd-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12); }
  .vd-input.has-trailing { padding-right: 44px; }

  .vd-password-wrap { position: relative; }
  .vd-password-toggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: transparent; border: 0; padding: 6px; cursor: pointer;
    color: #9aa0b0; display: inline-flex; align-items: center; justify-content: center;
    border-radius: 6px; transition: color 120ms, background 120ms;
  }
  .vd-password-toggle:hover { color: var(--foreground); background: var(--secondary); }
  .vd-password-toggle svg { width: 16px; height: 16px; display: block; }

  .vd-helper-text { font-size: 12px; color: var(--muted-foreground); }
  .vd-error-text { font-size: 12px; color: var(--destructive); }

  .vd-switch-row { text-align: center; font-size: 14px; color: var(--muted-foreground); }
  .vd-meta-link { font-size: 14px; color: var(--foreground); font-weight: 600; transition: color 140ms; cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; text-decoration: none; }
  .vd-meta-link:hover { color: var(--primary); }

  .vd-footer { text-align: center; padding: 16px 0 8px; color: var(--muted-foreground); font-size: 12.5px; }
  .vd-footer a { color: var(--muted-foreground); }

  .vd-spinner { width: 32px; height: 32px; border: 3px solid var(--secondary); border-top-color: var(--primary); border-radius: 50%; animation: vd-spin 0.75s linear infinite; margin: 0 auto; }
  @keyframes vd-spin { to { transform: rotate(360deg); } }

  @media (max-width: 520px) {
    .vd-page { padding: 20px 16px; }
    .vd-card { padding: 22px 20px 20px; border-radius: 18px; }
    .vd-card-center { padding: 28px 20px 22px; }
    .vd-panel-head h1 { font-size: 26px; }
  }
`;

function validatePassword(pwd: string) {
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export default function ClientInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success">("loading");
  const [designerName, setDesignerName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/client-invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setStatus("invalid"); return; }
        setDesignerName(data.designerName);
        setInviteEmail(data.email);
        setEmail(data.email);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit() {
    setError("");
    if (!fullName.trim()) { setError("Podaj imię i nazwisko"); return; }
    if (!email.trim()) { setError("Podaj adres e-mail"); return; }
    if (!validatePassword(password)) {
      setError("Hasło musi mieć min. 8 znaków, zawierać małą i dużą literę oraz cyfrę");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/client-invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, email, password }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error || "Wystąpił błąd"); return; }
    setStatus("success");
    setTimeout(() => router.push("/login"), 3000);
  }

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="vd-body">
        <div className="vd-page">
          {/* Topbar */}
          <header className="vd-topbar">
            <a className="vd-brand" href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ico" src="/veedeck_ikona_vsg.svg" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="word" src="/vee_black.png" alt="veedeck" />
            </a>
          </header>

          <main className="vd-stage">
            <div className="vd-panel">

              {/* Loading */}
              {status === "loading" && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div className="vd-spinner" />
                </div>
              )}

              {/* Invalid */}
              {status === "invalid" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow">Zaproszenie</div>
                    <h1>Link nieważny</h1>
                    <p className="sub">Ten link wygasł lub jest nieprawidłowy. Skontaktuj się z projektantem, aby wysłał nowe zaproszenie.</p>
                  </div>
                  <div className="vd-card vd-card-center">
                    <div className="vd-icon-wrap" style={{ background: "#fef2f2", color: "#dc2626" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </div>
                    <h2>Zaproszenie nieważne</h2>
                    <p className="vd-body-text">Ten link wygasł lub jest nieprawidłowy.</p>
                  </div>
                </>
              )}

              {/* Success */}
              {status === "success" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Konto założone</div>
                    <h1>Gotowe!<br /><em className="accent">Możesz się logować.</em></h1>
                  </div>
                  <div className="vd-card vd-card-center">
                    <div className="vd-icon-wrap" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <h2>Konto utworzone!</h2>
                    <p className="vd-body-text">Za chwilę zostaniesz przekierowany do strony logowania.</p>
                  </div>
                </>
              )}

              {/* Form */}
              {status === "valid" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Zaproszenie od projektanta</div>
                    <h1>
                      Witaj!<br />
                      <em className="accent">Załóż konto.</em>
                    </h1>
                    <p className="sub">
                      <b>{designerName}</b> zaprasza Cię do panelu klienta w veedeck.
                      {inviteEmail && <><br /><span style={{ fontSize: 13 }}>{inviteEmail}</span></>}
                    </p>
                  </div>

                  <div className="vd-card">
                    <div className="vd-form-stack">
                      <div className="vd-field">
                        <label className="vd-label" htmlFor="fullName">
                          Imię i nazwisko <span className="req">*</span>
                        </label>
                        <input
                          className="vd-input"
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="np. Anna Kowalska"
                          autoFocus
                        />
                      </div>

                      <div className="vd-field">
                        <label className="vd-label" htmlFor="phone">
                          Numer telefonu <span className="opt">(opcjonalne)</span>
                        </label>
                        <input
                          className="vd-input"
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+48 123 456 789"
                        />
                      </div>

                      <div className="vd-field">
                        <label className="vd-label" htmlFor="email">
                          E-mail <span className="req">*</span>
                        </label>
                        <input
                          className="vd-input"
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>

                      <div className="vd-field">
                        <label className="vd-label" htmlFor="password">
                          Hasło <span className="req">*</span>
                        </label>
                        <div className="vd-password-wrap">
                          <input
                            className="vd-input has-trailing"
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                          />
                          <button
                            type="button"
                            className="vd-password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Pokaż / ukryj hasło"
                          >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                        <p className="vd-helper-text">Min. 8 znaków, mała litera, wielka litera i cyfra.</p>
                        {password && !validatePassword(password) && (
                          <p className="vd-error-text">Hasło nie spełnia wymagań bezpieczeństwa.</p>
                        )}
                      </div>

                      {error && <p className="vd-error-text" style={{ fontSize: 13.5 }}>{error}</p>}

                      <button
                        type="button"
                        className="vd-btn w-full"
                        data-variant="primary"
                        onClick={handleSubmit}
                        disabled={saving}
                        style={{ marginTop: 4 }}
                      >
                        {saving ? "Tworzenie konta..." : "Utwórz konto"}
                      </button>
                    </div>
                  </div>

                  <p className="vd-switch-row">
                    Masz już konto?{" "}
                    <a href="/login" className="vd-meta-link">Zaloguj się →</a>
                  </p>
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
