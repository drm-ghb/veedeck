"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type View = "login" | "register" | "forgot" | "forgotSent" | "registered";

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
  .vd-back-link {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13.5px; color: var(--muted-foreground); font-weight: 500;
    padding: 8px 12px; border-radius: 10px;
    transition: background 140ms, color 140ms; cursor: pointer;
  }
  .vd-back-link:hover { background: rgba(255,255,255,0.65); color: var(--foreground); }
  .vd-back-link svg { width: 14px; height: 14px; }

  .vd-stage { display: grid; place-items: center; padding: 32px 0; }
  .vd-panel { width: 100%; max-width: 460px; position: relative; display: flex; flex-direction: column; gap: 22px; }

  .vd-panel-head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .vd-panel-head h1 { font-size: clamp(30px, 4vw, 38px); line-height: 1.05; letter-spacing: -0.028em; }
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
  .vd-card-success {
    text-align: center; align-items: center; gap: 18px; padding: 36px 28px 28px;
  }
  .vd-success-icon {
    width: 68px; height: 68px; border-radius: 50%;
    background: var(--indigo-50); color: var(--primary);
    display: grid; place-items: center;
    box-shadow: 0 0 0 8px rgba(165, 180, 252, 0.18);
  }
  .vd-success-icon svg { width: 30px; height: 30px; }
  .vd-card-success h2 { font-size: 24px; line-height: 1.15; letter-spacing: -0.022em; }
  .vd-body-text { font-size: 14.5px; color: var(--muted-foreground); line-height: 1.6; max-width: 340px; }
  .vd-body-text b { color: var(--foreground); font-weight: 600; }
  .vd-meta-note { font-size: 13px; color: var(--muted-foreground); background: var(--secondary); padding: 10px 14px; border-radius: 10px; width: 100%; text-align: center; }
  .vd-actions { width: 100%; display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }

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
  .vd-btn[data-variant="outline"] { background: #fff; color: var(--foreground); border-color: var(--border); }
  .vd-btn[data-variant="outline"]:hover:not(:disabled) { background: var(--secondary); border-color: #cdd0db; }
  .vd-btn[data-variant="ghost"] { background: transparent; color: var(--muted-foreground); }
  .vd-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--secondary); color: var(--foreground); }
  .vd-btn svg { width: 16px; height: 16px; flex-shrink: 0; }

  .vd-form-stack { display: flex; flex-direction: column; gap: 14px; }
  .vd-field { display: flex; flex-direction: column; gap: 8px; }
  .vd-label {
    font-size: 13px; font-weight: 600; color: var(--foreground); letter-spacing: -0.005em;
    display: flex; align-items: center; justify-content: space-between;
  }
  .vd-label .opt { color: var(--muted-foreground); font-weight: 400; }
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

  .vd-divider-or { position: relative; display: flex; align-items: center; margin: 4px 0; }
  .vd-divider-or::before, .vd-divider-or::after { content: ""; flex: 1; height: 1px; background: var(--border); }
  .vd-divider-or span { padding: 0 12px; font-size: 12px; color: var(--muted-foreground); font-weight: 500; }

  .vd-helper-text { font-size: 12px; color: var(--muted-foreground); }
  .vd-error-text { font-size: 12px; color: var(--destructive); }

  .vd-privacy { display: flex; align-items: flex-start; gap: 10px; padding-top: 4px; }
  .vd-privacy input[type="checkbox"] { margin: 3px 0 0; height: 16px; width: 16px; border-radius: 4px; accent-color: var(--primary); flex-shrink: 0; cursor: pointer; }
  .vd-remember { display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; font-size: 13.5px; color: var(--muted-foreground); margin-top: 2px; }
  .vd-remember input[type="checkbox"] { width: 16px; height: 16px; margin: 0; border-radius: 4px; accent-color: var(--primary); flex-shrink: 0; cursor: pointer; }
  .vd-privacy label { font-size: 12.5px; color: var(--muted-foreground); line-height: 1.55; cursor: pointer; }
  .vd-privacy label a { color: var(--foreground); text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 140ms; }
  .vd-privacy label a:hover { text-decoration-color: var(--foreground); }

  .vd-meta-link { font-size: 13.5px; color: var(--muted-foreground); font-weight: 500; transition: color 140ms; cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; }
  .vd-meta-link:hover { color: var(--primary); text-decoration: underline; }
  .vd-meta-link.strong { color: var(--foreground); font-weight: 600; }
  .vd-meta-link.strong:hover { color: var(--primary); }

  .vd-switch-row { text-align: center; font-size: 14px; color: var(--muted-foreground); }

  .vd-footer { text-align: center; padding: 16px 0 8px; color: var(--muted-foreground); font-size: 12.5px; }
  .vd-footer a { color: var(--muted-foreground); text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 140ms; }
  .vd-footer a:hover { text-decoration-color: var(--muted-foreground); }

  .vd-reg-lock { position: relative; }
  .vd-card.reg-disabled { filter: blur(2.5px) grayscale(0.85); opacity: 0.5; pointer-events: none; user-select: none; }
  .vd-reg-overlay { position: absolute; inset: 0; z-index: 3; display: flex; align-items: flex-start; justify-content: center; padding: 40px 24px; border-radius: 18px; background: rgba(255,255,255,0.55); backdrop-filter: blur(3px); }
  .vd-reg-overlay-inner { max-width: 340px; text-align: center; background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 26px 24px; box-shadow: 0 24px 60px -28px rgba(36,37,43,0.4), 0 4px 14px -8px rgba(36,37,43,0.18); }
  .vd-lock-ic { width: 46px; height: 46px; margin: 0 auto 14px; display: grid; place-items: center; border-radius: 13px; background: var(--indigo-50); color: var(--primary); }
  .vd-lock-ic svg { width: 24px; height: 24px; }
  .vd-reg-overlay-inner h3 { font-family: "Inter", sans-serif; font-weight: 700; font-size: 18px; letter-spacing: -0.02em; color: var(--foreground); margin: 0 0 8px; }
  .vd-reg-overlay-inner p { font-size: 14px; color: var(--muted-foreground); line-height: 1.5; margin: 0 0 16px; }
  .vd-reg-mail { display: inline-flex; align-items: center; gap: 8px; background: var(--primary); color: #fff; font-family: "Inter", sans-serif; font-weight: 600; font-size: 14.5px; padding: 10px 18px; border-radius: 11px; text-decoration: none; transition: background .15s, transform .15s; }
  .vd-reg-mail:hover { background: #4338CA; transform: translateY(-1px); }
  .vd-reg-mail svg { width: 17px; height: 17px; }

  @media (max-width: 520px) {
    .vd-page { padding: 20px 16px; }
    .vd-card { padding: 22px 20px 20px; border-radius: 18px; }
    .vd-card-success { padding: 28px 20px 22px; }
    .vd-panel-head h1 { font-size: 28px; }
    .vd-back-link { padding: 6px 10px; }
    .vd-back-link span { display: none; }
  }
`;

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 16, height: 16 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function PasswordInput({ id, value, onChange, placeholder, autoComplete }: {
  id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="vd-password-wrap">
      <input
        className={`vd-input has-trailing`}
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        autoComplete={autoComplete}
        required
      />
      <button type="button" className="vd-password-toggle" onClick={() => setShow(!show)} aria-label="Pokaż / ukryj hasło">
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailSent, setForgotEmailSent] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activatedParam = searchParams.get("activated");
  const resetParam = searchParams.get("reset");

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

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "register") setView("register");
    else if (hash === "forgot") setView("forgot");
  }, []);

  function switchView(v: View) {
    setView(v);
    setEmail("");
    setPassword("");
    setFullName("");
    setCompanyName("");
    setPrivacyAccepted(false);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validatePassword(pwd: string) {
    return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      // Check if account is pending activation
      try {
        const check = await fetch(`/api/auth/check-activation?email=${encodeURIComponent(email)}`);
        const data = await check.json();
        if (data.status === "pending") {
          toast.error("Konto nie zostało aktywowane — sprawdź skrzynkę pocztową i kliknij link aktywacyjny.");
          setLoading(false);
          return;
        }
      } catch {}
      toast.error("Nieprawidłowy e-mail lub hasło.");
      setLoading(false);
      return;
    }
    const session = await getSession();
    if ((session?.user as any)?.isAdmin) {
      toast.error("Konta administracyjne logują się przez /admin");
      setLoading(false);
      return;
    }
    if ((session?.user as any)?.role === "client") {
      router.push("/client");
    } else {
      router.push("/panel-glowny");
    }
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePassword(password)) {
      toast.error("Hasło nie spełnia wymagań bezpieczeństwa.");
      return;
    }
    if (!privacyAccepted) {
      toast.error("Akceptacja polityki prywatności jest wymagana.");
      return;
    }
    setLoading(true);
    const locale = document.cookie.match(/veedeck-lang=([^;]+)/)?.[1] ?? "pl";
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: fullName.trim(), name: companyName.trim() || null, email, password, locale }),
    });
    if (!res.ok) {
      let data: { error?: string } = {};
      try { data = await res.json(); } catch {}
      toast.error(data.error || "Błąd rejestracji.");
      setLoading(false);
      return;
    }
    setRegisteredEmail(email);
    setView("registered");
    setLoading(false);
  }

  async function handleResend() {
    if (resendLoading || resendDone) return;
    setResendLoading(true);
    const locale = document.cookie.match(/veedeck-lang=([^;]+)/)?.[1] ?? "pl";
    await fetch("/api/auth/resend-activation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registeredEmail, locale }),
    });
    setResendLoading(false);
    setResendDone(true);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const locale = document.cookie.match(/veedeck-lang=([^;]+)/)?.[1] ?? "pl";
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), locale }),
      });
    } catch {}
    setForgotEmailSent(forgotEmail);
    setView("forgotSent");
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

      <div className="vd-body">
        <div className="vd-page">
          {/* Topbar */}
          <header className="vd-topbar">
            <a className="vd-brand" href="https://veedeck.com">
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

          {/* Main stage */}
          <main className="vd-stage">
            <div className="vd-panel">

              {/* ── LOGIN ── */}
              {view === "login" && (
                <>
                  {resetParam === "true" && (
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#15803d" }}>Hasło zmienione</p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#166534" }}>Zaloguj się nowym hasłem.</p>
                      </div>
                    </div>
                  )}
                  {activatedParam === "true" && (
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#15803d" }}>Konto aktywowane pomyślnie</p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#166534" }}>Możesz się teraz zalogować.</p>
                      </div>
                    </div>
                  )}
                  {activatedParam === "expired" && (
                    <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#92400e" }}>Link aktywacyjny wygasł</p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#78350f" }}>Zarejestruj się ponownie, aby otrzymać nowy link.</p>
                      </div>
                    </div>
                  )}
                  {activatedParam === "invalid" && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#991b1b" }}>Nieprawidłowy link aktywacyjny</p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#7f1d1d" }}>Link jest nieprawidłowy lub konto zostało już aktywowane.</p>
                      </div>
                    </div>
                  )}
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Konto veedeck</div>
                    <h1>Witaj ponownie.<br /><em className="accent">Zaloguj się.</em></h1>
                    <p className="sub">Wszystko, co zostawiłaś wczoraj wieczorem — czeka tam, gdzie było.</p>
                  </div>

                  <div className="vd-card">
                    <button type="button" className="vd-btn w-full" data-variant="outline" onClick={() => signIn("google", { callbackUrl: "/panel-glowny" })}>
                      <GoogleIcon />
                      Kontynuuj z Google
                    </button>

                    <div className="vd-divider-or"><span>lub e-mailem</span></div>

                    <form className="vd-form-stack" onSubmit={handleLogin} autoComplete="on">
                      <div className="vd-field">
                        <label className="vd-label" htmlFor="login-email">E-mail lub login</label>
                        <input className="vd-input" id="login-email" type="text" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="vd-field">
                        <div className="vd-label">
                          <label htmlFor="login-password">Hasło</label>
                          <button type="button" className="vd-meta-link" onClick={() => switchView("forgot")}>Zapomniałem hasła</button>
                        </div>
                        <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
                      </div>
                      <button type="submit" className="vd-btn w-full" data-variant="primary" disabled={loading} style={{ marginTop: 6 }}>
                        <span>{loading ? "Logowanie..." : "Zaloguj się"}</span>
                        {!loading && <ArrowRight />}
                      </button>
                    </form>
                  </div>

                  <p className="vd-switch-row">
                    Nie masz jeszcze konta?{" "}
                    <button className="vd-meta-link strong" onClick={() => switchView("register")}>Załóż za darmo →</button>
                  </p>
                </>
              )}

              {/* ── REGISTER ── */}
              {view === "register" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Załóż konto</div>
                    <h1>Zacznij za darmo.<br /><em className="accent">30 dni bez karty.</em></h1>
                    <p className="sub">Bez limitu klientów i projektów. Anuluj w każdej chwili.</p>
                  </div>

                  <div className="vd-reg-lock">
                    <div className="vd-card">
                      <button type="button" className="vd-btn w-full" data-variant="outline" disabled>
                        <GoogleIcon />
                        Załóż konto przez Google
                      </button>

                      <div className="vd-divider-or"><span>lub e-mailem</span></div>

                      <form className="vd-form-stack" onSubmit={handleRegister} autoComplete="on">
                        <div className="vd-field">
                          <label className="vd-label" htmlFor="reg-fullname">Imię i nazwisko</label>
                          <input className="vd-input" id="reg-fullname" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                        </div>
                        <div className="vd-field">
                          <label className="vd-label" htmlFor="reg-company">Nazwa firmy <span className="opt">(opcjonalne)</span></label>
                          <input className="vd-input" id="reg-company" type="text"  value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                        </div>
                        <div className="vd-field">
                          <label className="vd-label" htmlFor="reg-email">E-mail</label>
                          <input className="vd-input" id="reg-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="vd-field">
                          <label className="vd-label" htmlFor="reg-password">Hasło</label>
                          <PasswordInput id="reg-password" value={password} onChange={setPassword} autoComplete="new-password" />
                          <p className="vd-helper-text">Min. 8 znaków, mała litera, wielka litera i cyfra.</p>
                          {password && !validatePassword(password) && (
                            <p className="vd-error-text">Hasło nie spełnia wymagań bezpieczeństwa.</p>
                          )}
                        </div>
                        <div className="vd-privacy">
                          <input type="checkbox" id="privacy" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} />
                          <label htmlFor="privacy">
                            Potwierdzam, że zapoznałam się z{" "}
                            <a href="https://veedeck.com/polityka-prywatnosci.html">Polityką prywatności</a> i{" "}
                            <a href="#">Regulaminem</a>.
                          </label>
                        </div>
                        <button type="submit" className="vd-btn w-full" data-variant="primary" disabled={loading || !privacyAccepted} style={{ marginTop: 4 }}>
                          <span>{loading ? "Wysyłamy link..." : "Załóż konto"}</span>
                          {!loading && <ArrowRight />}
                        </button>
                      </form>
                    </div>
                  </div>

                  <p className="vd-switch-row">
                    Masz już konto?{" "}
                    <button className="vd-meta-link strong" onClick={() => switchView("login")}>Zaloguj się →</button>
                  </p>
                </>
              )}

              {/* ── REGISTERED SUCCESS ── */}
              {view === "registered" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Prawie gotowe</div>
                    <h1>Sprawdź skrzynkę.<br /><em className="accent">Wysłaliśmy link.</em></h1>
                  </div>

                  <div className="vd-card vd-card-success">
                    <div className="vd-success-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <h2>Wysłaliśmy link aktywacyjny</h2>
                    <p className="vd-body-text">
                      Na adres <b>{registeredEmail || "Twój e-mail"}</b> poszedł link, który aktywuje Twoje konto.
                    </p>
                    <div className="vd-meta-note">Nie widzisz wiadomości? Sprawdź folder <b>Spam</b> lub <b>Oferty</b>.</div>
                    <div className="vd-actions">
                      <button
                        className="vd-btn w-full"
                        data-variant="outline"
                        onClick={handleResend}
                        disabled={resendLoading || resendDone}
                      >
                        {resendDone ? "Link wysłany ponownie ✓" : resendLoading ? "Wysyłamy..." : "Wyślij link ponownie"}
                      </button>
                      <button className="vd-btn w-full" data-variant="ghost" onClick={() => switchView("login")}>Wróć do logowania</button>
                    </div>
                  </div>

                  <p className="vd-switch-row">
                    Wpisałeś zły e-mail?{" "}
                    <button className="vd-meta-link strong" onClick={() => switchView("register")}>Załóż konto ponownie →</button>
                  </p>
                </>
              )}

              {/* ── FORGOT ── */}
              {view === "forgot" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Reset hasła</div>
                    <h1>Zapomniałaś hasła?<br /><em className="accent">Pomożemy.</em></h1>
                    <p className="sub">Podaj e-mail przypisany do konta — wyślemy link do ustawienia nowego hasła.</p>
                  </div>

                  <div className="vd-card">
                    <form className="vd-form-stack" onSubmit={handleForgot} autoComplete="on">
                      <div className="vd-field">
                        <label className="vd-label" htmlFor="forgot-email">E-mail</label>
                        <input className="vd-input" id="forgot-email" type="email" required autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                      </div>
                      <button type="submit" className="vd-btn w-full" data-variant="primary" disabled={loading} style={{ marginTop: 4 }}>
                        <span>{loading ? "Wysyłamy link..." : "Wyślij link do resetu"}</span>
                        {!loading && <ArrowRight />}
                      </button>
                    </form>
                  </div>

                  <p className="vd-switch-row">
                    Pamiętasz hasło?{" "}
                    <button className="vd-meta-link strong" onClick={() => switchView("login")}>Wróć do logowania →</button>
                  </p>
                </>
              )}

              {/* ── FORGOT SENT ── */}
              {view === "forgotSent" && (
                <>
                  <div className="vd-panel-head">
                    <div className="vd-eyebrow"><span className="dot" />Link w drodze</div>
                    <h1>Sprawdź skrzynkę.<br /><em className="accent">Reset hasła czeka.</em></h1>
                  </div>

                  <div className="vd-card vd-card-success">
                    <div className="vd-success-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <h2>Wysłaliśmy link do resetu</h2>
                    <p className="vd-body-text">
                      Jeśli konto z e-mailem <b>{forgotEmailSent || "Twój e-mail"}</b> istnieje, wysłaliśmy link do ustawienia nowego hasła. Sprawdź też folder Spam.
                    </p>
                    <div className="vd-meta-note">Link jest ważny przez <b>60 minut</b>.</div>
                    <div className="vd-actions">
                      <button className="vd-btn w-full" data-variant="primary" onClick={() => switchView("login")}>
                        <span>Wróć do logowania</span>
                        <ArrowRight />
                      </button>
                      <button type="button" className="vd-btn w-full" data-variant="ghost" onClick={() => { setForgotEmail(""); switchView("forgot"); }}>
                        Spróbuj z innym e-mailem
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </main>

          {/* Footer */}
          <footer className="vd-footer">
            © 2026 veedeck ·{" "}
            <a href="https://veedeck.com/polityka-prywatnosci.html">Polityka prywatności</a> ·{" "}
            <a href="https://veedeck.com/kontakt.html">Pomoc</a>
          </footer>
        </div>
      </div>
    </>
  );
}
