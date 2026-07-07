"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const CSS = `
  :root {
    --background: #FFFFFF;
    --foreground: #24252B;
    --primary: #4F46E5;
    --primary-foreground: #FFFFFF;
    --primary-600: #4338CA;
    --secondary: #F2F3F7;
    --muted-foreground: #6B6F80;
    --accent: #A5B4FC;
    --border: #E5E7EB;
    --indigo-50: #EEF2FF;
    --destructive: #DC2626;
    --success: #059669;
    --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
    --font-heading: "Inter", ui-sans-serif, system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  .rh-body {
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
  .rh-body h1, .rh-body h2, .rh-body h3 { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.028em; margin: 0; }
  .rh-body p { margin: 0; line-height: 1.55; }
  .rh-body a { color: inherit; text-decoration: none; }
  .rh-body em.accent { font-style: italic; font-family: var(--font-heading); color: var(--primary); font-weight: 500; }

  .rh-page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; padding: 28px 32px; }
  .rh-topbar { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; width: 100%; margin: 0 auto; }
  .rh-brand { display: flex; align-items: center; gap: 10px; }
  .rh-brand img.ico { height: 28px; width: 28px; object-fit: contain; }
  .rh-brand img.word { height: 20px; }
  .rh-back-link {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13.5px; color: var(--muted-foreground); font-weight: 500;
    padding: 8px 12px; border-radius: 10px;
    transition: background 140ms, color 140ms;
  }
  .rh-back-link:hover { background: rgba(255,255,255,0.65); color: var(--foreground); }
  .rh-back-link svg { width: 14px; height: 14px; }

  .rh-stage { display: grid; place-items: center; padding: 32px 0; }
  .rh-panel { width: 100%; max-width: 460px; position: relative; }

  .rh-panel-head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .rh-panel-head h1 { font-size: clamp(30px, 4vw, 38px); line-height: 1.05; letter-spacing: -0.028em; }
  .rh-panel-head .sub { color: var(--muted-foreground); font-size: 15px; max-width: 380px; }
  .rh-panel-head .sub b { color: var(--foreground); font-weight: 600; }

  .rh-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary);
  }
  .rh-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); animation: rh-pulse 1.6s ease-in-out infinite; }
  @keyframes rh-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

  .rh-card {
    background: #fff; border: 1px solid var(--border); border-radius: 22px;
    padding: 28px 28px 26px;
    box-shadow: 0 30px 60px -30px rgba(15, 23, 42, 0.18), 0 4px 16px -6px rgba(15, 23, 42, 0.06);
    display: flex; flex-direction: column; gap: 16px;
  }
  .rh-card-success { text-align: center; align-items: center; gap: 18px; padding: 36px 28px 28px; }
  .rh-card-success .success-icon {
    width: 68px; height: 68px; border-radius: 50%;
    background: var(--indigo-50); color: var(--primary);
    display: grid; place-items: center;
    box-shadow: 0 0 0 8px rgba(165, 180, 252, 0.18);
  }
  .rh-card-success .success-icon.warn { background: #FEF2F2; color: var(--destructive); box-shadow: 0 0 0 8px rgba(220, 38, 38, 0.10); }
  .rh-card-success .success-icon svg { width: 30px; height: 30px; }
  .rh-card-success h2 { font-size: 24px; line-height: 1.15; letter-spacing: -0.022em; }
  .rh-body-text { font-size: 14.5px; color: var(--muted-foreground); line-height: 1.6; max-width: 340px; }
  .rh-body-text b { color: var(--foreground); font-weight: 600; }
  .rh-actions { width: 100%; display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }

  .rh-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    height: 48px; padding: 0 22px; border-radius: 12px;
    font-family: var(--font-sans); font-size: 14.5px; font-weight: 600;
    cursor: pointer; border: 1px solid transparent;
    transition: transform 120ms ease, background 140ms ease, box-shadow 140ms ease, border-color 140ms ease, opacity 140ms ease, color 140ms ease;
    outline: none; text-decoration: none;
  }
  .rh-btn:focus-visible { box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.25); }
  .rh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .rh-btn.w-full { width: 100%; }
  .rh-btn[data-variant="primary"] { background: var(--primary); color: #fff; box-shadow: 0 8px 22px -10px rgba(79, 70, 229, 0.55); }
  .rh-btn[data-variant="primary"]:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px -10px rgba(79, 70, 229, 0.65); }
  .rh-btn[data-variant="outline"] { background: #fff; color: var(--foreground); border-color: var(--border); }
  .rh-btn[data-variant="outline"]:hover:not(:disabled) { background: var(--secondary); border-color: #cdd0db; }
  .rh-btn[data-variant="ghost"] { background: transparent; color: var(--muted-foreground); }
  .rh-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--secondary); color: var(--foreground); }
  .rh-btn svg { width: 16px; height: 16px; flex-shrink: 0; }

  .rh-form-stack { display: flex; flex-direction: column; gap: 14px; }
  .rh-field { display: flex; flex-direction: column; gap: 8px; }
  .rh-label { font-size: 13px; font-weight: 600; color: var(--foreground); letter-spacing: -0.005em; }
  .rh-input {
    height: 48px; width: 100%; border: 1px solid var(--border); background: #fff;
    border-radius: 12px; padding: 0 14px;
    font-family: var(--font-sans); font-size: 14.5px; color: var(--foreground);
    transition: border-color 140ms, box-shadow 140ms; outline: none;
  }
  .rh-input::placeholder { color: #9aa0b0; }
  .rh-input:focus-visible { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12); }
  .rh-input.has-trailing { padding-right: 44px; }
  .rh-input.invalid { border-color: var(--destructive); }
  .rh-input.invalid:focus-visible { box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.12); }

  .rh-password-wrap { position: relative; }
  .rh-password-toggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: transparent; border: 0; padding: 6px; cursor: pointer;
    color: #9aa0b0; display: inline-flex; align-items: center; justify-content: center;
    border-radius: 6px; transition: color 120ms, background 120ms;
  }
  .rh-password-toggle:hover { color: var(--foreground); background: var(--secondary); }
  .rh-password-toggle svg { width: 16px; height: 16px; display: block; }

  .rh-error-text { font-size: 12px; color: var(--destructive); }
  .rh-switch-row { text-align: center; font-size: 14px; color: var(--muted-foreground); }
  .rh-meta-link { font-size: 13.5px; color: var(--muted-foreground); font-weight: 500; transition: color 140ms; cursor: pointer; }
  .rh-meta-link:hover { color: var(--primary); text-decoration: underline; }
  .rh-meta-link.strong { color: var(--foreground); font-weight: 600; }
  .rh-meta-link.strong:hover { color: var(--primary); }

  .rh-reqs { display: flex; flex-direction: column; gap: 6px; padding: 2px 0 0; }
  .rh-req { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted-foreground); transition: color 140ms; }
  .rh-req .tick {
    width: 16px; height: 16px; border-radius: 50%;
    border: 1.5px solid #cdd0db; flex-shrink: 0;
    display: grid; place-items: center; transition: all 140ms;
  }
  .rh-req .tick svg { width: 10px; height: 10px; opacity: 0; transition: opacity 140ms; stroke: #fff; }
  .rh-req.ok { color: var(--success); }
  .rh-req.ok .tick { background: var(--success); border-color: var(--success); }
  .rh-req.ok .tick svg { opacity: 1; }

  .rh-footer { text-align: center; padding: 16px 0 8px; color: var(--muted-foreground); font-size: 12.5px; }
  .rh-footer a { color: var(--muted-foreground); text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 140ms; }
  .rh-footer a:hover { text-decoration-color: var(--muted-foreground); }

  @media (max-width: 520px) {
    .rh-page { padding: 20px 16px; }
    .rh-card { padding: 22px 20px 20px; border-radius: 18px; }
    .rh-card-success { padding: 28px 20px 22px; }
    .rh-panel-head h1 { font-size: 28px; }
    .rh-back-link { padding: 6px 10px; }
    .rh-back-link span { display: none; }
  }
`;

type View = "reset" | "done" | "invalid";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
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

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function PasswordField({ id, label, value, onChange, isInvalid }: {
  id: string; label: string; value: string; onChange: (v: string) => void; isInvalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="rh-field">
      <label className="rh-label" htmlFor={id}>{label}</label>
      <div className="rh-password-wrap">
        <input
          className={`rh-input has-trailing${isInvalid ? " invalid" : ""}`}
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
        />
        <button type="button" className="rh-password-toggle" onClick={() => setShow(!show)} aria-label="Pokaż / ukryj hasło">
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

export default function ResetHaslaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [view, setView] = useState<View>("reset");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    const prevTheme = document.documentElement.dataset.theme;
    const hadDark = document.documentElement.classList.contains("dark");
    document.documentElement.dataset.theme = "violet";
    document.documentElement.classList.remove("dark");
    return () => {
      if (prevTheme) document.documentElement.dataset.theme = prevTheme;
      if (hadDark) document.documentElement.classList.add("dark");
    };
  }, []);

  // Validate token on mount — will be wired to API later
  useEffect(() => {
    if (!token) setView("invalid");
  }, [token]);

  function checks(pw: string) {
    return {
      len: pw.length >= 8,
      lower: /[a-z]/.test(pw),
      upper: /[A-Z]/.test(pw),
      digit: /[0-9]/.test(pw),
    };
  }

  const c = checks(password);
  const allOk = c.len && c.lower && c.upper && c.digit;
  const match = confirm.length > 0 && confirm === password;
  const showMismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = allOk && match && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-hasla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        router.push("/login?reset=true");
        return;
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === "invalid") {
          setView("invalid");
        } else {
          setView("invalid");
        }
      }
    } catch {
      setView("invalid");
    }
    setLoading(false);
  }

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="rh-body">
        <div className="rh-page">

          <header className="rh-topbar">
            <Link className="rh-brand" href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ico" src="/vee-icon.png" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="word" src="/vee_black.png" alt="veedeck" />
            </Link>
            <Link className="rh-back-link" href="/login">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Wróć do logowania</span>
            </Link>
          </header>

          <main className="rh-stage">
            <div className="rh-panel">

              {/* ── RESET FORM ── */}
              {view === "reset" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  <div className="rh-panel-head">
                    <div className="rh-eyebrow"><span className="dot" />Reset hasła</div>
                    <h1>Ustaw nowe hasło.<br /><em className="accent">Ostatni krok.</em></h1>
                    <p className="sub">
                      Wpisz nowe hasło do konta{" "}
                      {emailParam && <b>{emailParam}</b>}.
                      Po zapisaniu zalogujesz się od nowa.
                    </p>
                  </div>

                  <div className="rh-card">
                    <form className="rh-form-stack" onSubmit={handleSubmit} autoComplete="off">
                      <div className="rh-field">
                        <label className="rh-label" htmlFor="new-password">Nowe hasło</label>
                        <div className="rh-password-wrap">
                          <input
                            className="rh-input has-trailing"
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="rh-reqs">
                          {(["len", "lower", "upper", "digit"] as const).map((key) => (
                            <div key={key} className={`rh-req${c[key] ? " ok" : ""}`}>
                              <span className="tick">
                                <CheckIcon />
                              </span>
                              {key === "len" && "Min. 8 znaków"}
                              {key === "lower" && "Mała litera"}
                              {key === "upper" && "Wielka litera"}
                              {key === "digit" && "Cyfra"}
                            </div>
                          ))}
                        </div>
                      </div>

                      <PasswordField
                        id="confirm-password"
                        label="Powtórz hasło"
                        value={confirm}
                        onChange={setConfirm}
                        isInvalid={showMismatch}
                      />
                      {showMismatch && <p className="rh-error-text">Hasła nie są identyczne.</p>}

                      <button
                        type="submit"
                        className="rh-btn w-full"
                        data-variant="primary"
                        disabled={!canSubmit}
                        style={{ marginTop: 4 }}
                      >
                        <span>{loading ? "Zapisujemy..." : "Zapisz nowe hasło"}</span>
                        {!loading && <ArrowRight />}
                      </button>
                    </form>
                  </div>

                  <p className="rh-switch-row">
                    Przypomniałeś sobie hasło?{" "}
                    <Link className="rh-meta-link strong" href="/login">Wróć do logowania →</Link>
                  </p>
                </div>
              )}

              {/* ── DONE ── */}
              {view === "done" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  <div className="rh-panel-head">
                    <div className="rh-eyebrow"><span className="dot" />Gotowe</div>
                    <h1>Hasło zmienione.<br /><em className="accent">Możesz się zalogować.</em></h1>
                  </div>

                  <div className="rh-card rh-card-success">
                    <div className="success-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <h2>Twoje nowe hasło jest aktywne</h2>
                    <p className="rh-body-text">
                      Zaktualizowaliśmy hasło do Twojego konta. Ze względów bezpieczeństwa wylogowaliśmy Cię na wszystkich urządzeniach — zaloguj się nowym hasłem.
                    </p>
                    <div className="rh-actions">
                      <Link className="rh-btn w-full" data-variant="primary" href="/login">
                        <span>Przejdź do logowania</span>
                        <ArrowRight />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* ── INVALID / EXPIRED ── */}
              {view === "invalid" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  <div className="rh-panel-head">
                    <div className="rh-eyebrow"><span className="dot" />Link nieaktywny</div>
                    <h1>Link wygasł.<br /><em className="accent">Wyślij nowy.</em></h1>
                  </div>

                  <div className="rh-card rh-card-success">
                    <div className="success-icon warn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" />
                      </svg>
                    </div>
                    <h2>Ten link do resetu jest nieważny</h2>
                    <p className="rh-body-text">
                      Link mógł wygasnąć (ważny 60&nbsp;minut) lub został już użyty. Poproś o nowy — zajmie to chwilę.
                    </p>
                    <div className="rh-actions">
                      <Link className="rh-btn w-full" data-variant="primary" href="/login#forgot">
                        <span>Wyślij nowy link</span>
                        <ArrowRight />
                      </Link>
                      <Link className="rh-btn w-full" data-variant="ghost" href="/login">
                        Wróć do logowania
                      </Link>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>

          <footer className="rh-footer">
            © 2026 veedeck ·{" "}
            <a href="https://veedeck.com/polityka-prywatnosci.html">Polityka prywatności</a> ·{" "}
            <a href="https://veedeck.com/kontakt.html">Pomoc</a>
          </footer>

        </div>
      </div>
    </>
  );
}
