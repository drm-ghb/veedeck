"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import {
  Users, PushPin, LocalMall, Package, ChatBubble,
  Engineering, ClipboardList, CalendarDays, NotebookText, CheckSquare, Sparkles,
  X, ChevronLeft, ChevronRight, BookOpen, Check,
} from "@/components/ui/icons";

const storageKey = (userId: string) => `onboarding-modal-v1:${userId}`;
const MODULE_COUNT = 11;
const TOTAL_STEPS = MODULE_COUNT + 1; // 0 = welcome, 1-11 = modules

const CSS = `
@keyframes ob-pop { from { opacity: 0; transform: translateY(14px) scale(.98); } }
@keyframes ob-fade { from { opacity: 0; } }
@keyframes ob-rise { from { opacity: 0; transform: translateY(10px); } }
.ob-dialog { animation: ob-pop .38s cubic-bezier(.2,.7,.25,1) both; }
.ob-fade { animation: ob-fade .3s ease both; }
.ob-rise { animation: ob-rise .4s cubic-bezier(.2,.7,.25,1) both; }

/* ── colour tokens — light / dark ─────────────────────────────── */
.ob-dialog {
  --ob-white:        #ffffff;
  --ob-indigo-50:    #EEF2FF;
  --ob-rail-from:    #F6F7FF;
  --ob-rail-to:      #ECEEFB;
  --ob-tip-bg:       linear-gradient(120deg, #EDE9FE, #F5F3FF);
  --ob-tip-border:   color-mix(in srgb, var(--primary) 16%, transparent);
}
html.dark .ob-dialog {
  --ob-white:        var(--muted);
  --ob-indigo-50:    rgba(79, 70, 229, 0.18);
  --ob-rail-from:    color-mix(in srgb, var(--muted) 70%, var(--background));
  --ob-rail-to:      var(--background);
  --ob-tip-bg:       rgba(79, 70, 229, 0.1);
  --ob-tip-border:   rgba(79, 70, 229, 0.3);
}
/* logo text: black in light, white in dark */
.ob-logo-text { filter: brightness(0); }
html.dark .ob-logo-text { filter: brightness(0) invert(1); }

@media (prefers-reduced-motion: reduce) {
  .ob-dialog, .ob-fade, .ob-rise { animation: none !important; }
}
@media (max-width: 759px) {
  .ob-stage { padding: 10px !important; }
  .ob-dialog { grid-template-columns: 1fr !important; height: 94dvh !important; max-height: 800px !important; max-width: 460px !important; }
  .ob-rail { display: none !important; }
  .ob-head { padding: 16px 18px 0 !important; }
  .ob-body { padding: 6px 20px 10px !important; }
  .ob-footer { padding: 12px 18px 14px !important; }
  .ob-footer-guide { padding: 0 18px 12px !important; margin-top: -6px !important; }
  .ob-m-icon { width: 50px !important; height: 50px !important; }
  .ob-m-title { font-size: 20px !important; }
  .ob-m-desc { font-size: 14.5px !important; margin: 12px 0 18px !important; }
  .ob-welcome { padding: 16px 2px 4px !important; }
  .ob-welcome h2 { font-size: 26px !important; }
  .ob-wmark { width: 68px !important; height: 68px !important; margin-bottom: 18px !important; }
  .ob-skip { display: none !important; }
  .ob-foot-right { width: 100%; justify-content: space-between !important; }
  .ob-btn-primary { flex: 1; justify-content: center !important; }
}
`;

function RichText({ text }: { text: string }) {
  const parts = text.split(/(<b>[\s\S]*?<\/b>)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("<b>") ? (
          <strong key={i} style={{ color: "var(--foreground)", fontWeight: 600 }}>
            {part.slice(3, -4)}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function IconGrid() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>;
}
function IconCalendarChip() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>;
}
function IconClock() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
}
function IconLightbulb() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>;
}
function IconArrowRight() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>;
}

interface ModuleStepData {
  icon: React.ElementType;
  label: string;
  title: string;
  desc: string;
  steps: string[];
  tip?: string;
  soon?: boolean;
}

export default function OnboardingModal({ show, userId }: { show: boolean; userId: string }) {
  const t = useT();
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const stepperRef = useRef<HTMLDivElement>(null);
  const navBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const MODULE_STEPS: ModuleStepData[] = [
    { icon: Users,        label: t.onboarding.clientsLabel,    title: t.onboarding.clientsTitle,    desc: t.onboarding.clientsDesc,    steps: [t.onboarding.clientsStep1, t.onboarding.clientsStep2, t.onboarding.clientsStep3] },
    { icon: PushPin,      label: t.onboarding.projectFlowLabel,title: t.onboarding.projectFlowTitle,desc: t.onboarding.projectFlowDesc,steps: [t.onboarding.projectFlowStep1, t.onboarding.projectFlowStep2, t.onboarding.projectFlowStep3], tip: t.onboarding.projectFlowTip },
    { icon: LocalMall,    label: t.onboarding.listyLabel,      title: t.onboarding.listyTitle,      desc: t.onboarding.listyDesc,      steps: [t.onboarding.listyStep1, t.onboarding.listyStep2, t.onboarding.listyStep3, t.onboarding.listyStep4], tip: t.onboarding.listyTip },
    { icon: Package,      label: t.onboarding.produktyLabel,   title: t.onboarding.produktyTitle,   desc: t.onboarding.produktyDesc,   steps: [t.onboarding.produktyStep1, t.onboarding.produktyStep2, t.onboarding.produktyStep3] },
    { icon: ChatBubble,   label: t.onboarding.dyskusjeLabel,   title: t.onboarding.dyskusjeTitle,   desc: t.onboarding.dyskusjeDesc,   steps: [t.onboarding.dyskusjeStep1, t.onboarding.dyskusjeStep2, t.onboarding.dyskusjeStep3], tip: t.onboarding.dyskusjeTip },
    { icon: Engineering,  label: t.onboarding.wykonawcyLabel,  title: t.onboarding.wykonawcyTitle,  desc: t.onboarding.wykonawcyDesc,  steps: [t.onboarding.wykonawcyStep1, t.onboarding.wykonawcyStep2, t.onboarding.wykonawcyStep3], tip: t.onboarding.wykonawcyTip },
    { icon: ClipboardList,label: t.onboarding.ankietyLabel,    title: t.onboarding.ankietyTitle,    desc: t.onboarding.ankietyDesc,    steps: [t.onboarding.ankietyStep1, t.onboarding.ankietyStep2, t.onboarding.ankietyStep3, t.onboarding.ankietyStep4] },
    { icon: CalendarDays, label: t.onboarding.kalendarLabel,   title: t.onboarding.kalendarTitle,   desc: t.onboarding.kalendarDesc,   steps: [t.onboarding.kalendarStep1, t.onboarding.kalendarStep2, t.onboarding.kalendarStep3] },
    { icon: NotebookText, label: t.onboarding.notatnikLabel,   title: t.onboarding.notatnikTitle,   desc: t.onboarding.notatnikDesc,   steps: [t.onboarding.notatnikStep1, t.onboarding.notatnikStep2, t.onboarding.notatnikStep3] },
    { icon: CheckSquare,  label: t.onboarding.zadaniaLabel,    title: t.onboarding.zadaniaTitle,    desc: t.onboarding.zadaniaDesc,    steps: [t.onboarding.zadaniaStep1, t.onboarding.zadaniaStep2, t.onboarding.zadaniaStep3], tip: t.onboarding.zadaniaTip },
    { icon: Sparkles,     label: t.onboarding.veezardLabel,    title: t.onboarding.veezardTitle,    desc: t.onboarding.veezardDesc,    steps: [t.onboarding.veezardStep1, t.onboarding.veezardStep2, t.onboarding.veezardStep3], tip: t.onboarding.veezardTip, soon: true },
  ];

  // Auto-show: only on /panel-glowny, only if not dismissed
  useEffect(() => {
    if (!show) return;
    if (pathname !== "/panel-glowny") return;
    if (typeof window !== "undefined" && localStorage.getItem(storageKey(userId)) === "true") return;
    setVisible(true);
  }, [show, pathname, userId]);

  // Listen for manual open event (from "Jak zacząć" trigger)
  useEffect(() => {
    function handleOpen() { setStep(0); setVisible(true); }
    window.addEventListener("open-onboarding", handleOpen);
    return () => window.removeEventListener("open-onboarding", handleOpen);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
      if (e.key === "ArrowLeft") setStep(s => Math.max(s - 1, 0));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible]);

  // Stepper auto-scroll to active item
  useEffect(() => {
    if (!stepperRef.current || step === 0) return;
    const active = navBtnRefs.current[Math.min(step - 1, MODULE_COUNT - 1)];
    if (active) stepperRef.current.scrollTop = active.offsetTop - 132;
  }, [step]);

  if (!visible) return null;

  const isFirst = step === 0;
  const isLast = step === TOTAL_STEPS - 1;
  const currentModule = step > 0 ? MODULE_STEPS[step - 1] : null;

  function dismiss() {
    setVisible(false);
    localStorage.setItem(storageKey(userId), "true");
    fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mergeViewPreferences: { onboardingSeen: true } }),
    }).catch(() => {});
  }

  const primaryBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7,
    font: "inherit", fontSize: 14, fontWeight: 600,
    padding: "10px 18px", borderRadius: 11, cursor: "pointer",
    border: "none", color: "#fff",
    background: "linear-gradient(140deg, #4F46E5, #6B63F0)",
    boxShadow: "0 6px 16px -6px rgba(79,70,229,0.6)",
    transition: "filter .15s, transform .15s",
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Overlay */}
      <div
        className="ob-stage fixed inset-0 z-50 flex items-center justify-center"
        style={{ padding: 32, background: "rgba(24,27,50,0.34)", backdropFilter: "blur(4px)" }}
        role="dialog"
        aria-modal="true"
        aria-label={t.onboarding.howToStart}
      >
        {/* Dialog */}
        <div
          className="ob-dialog w-full bg-background border border-border overflow-hidden"
          style={{
            maxWidth: 960,
            height: 712,
            borderRadius: 20,
            boxShadow: "0 40px 90px -30px rgba(30,27,75,0.55), 0 12px 34px -18px rgba(79,70,229,0.35)",
            display: "grid",
            gridTemplateColumns: "296px 1fr",
          }}
        >

          {/* ── LEFT RAIL ── */}
          <aside
            className="ob-rail relative flex-col border-r border-border overflow-hidden"
            style={{
              display: "flex",
              background: "linear-gradient(180deg, var(--ob-rail-from) 0%, var(--ob-rail-to) 100%)",
              padding: "26px 22px 22px",
            }}
          >
            {/* decorative glow */}
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                right: -120, top: -120, width: 300, height: 300, borderRadius: "50%",
                background: "radial-gradient(closest-side, rgba(107,99,240,0.18), transparent 70%)",
              }}
            />
            {/* brand */}
            <div className="flex items-center" style={{ gap: 9, marginBottom: 22 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vee-icon.png" alt="" style={{ height: 26, width: 26 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vee_black.png" alt="veedeck" className="ob-logo-text" style={{ height: 18, width: "auto" }} />
            </div>
            {/* kicker */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 4 }}>
              {t.onboarding.howToStart}
            </div>
            {/* progress label */}
            <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", fontWeight: 500, marginBottom: 18 }}>
              {step === 0
                ? t.onboarding.welcomeBoard
                : `${t.onboarding.step} ${step} ${t.onboarding.stepOf} ${MODULE_COUNT}`}
            </div>

            {/* Stepper */}
            <div ref={stepperRef} className="flex-1 overflow-y-auto" style={{ paddingRight: 4 }}>
              <div>
                {MODULE_STEPS.map((mod, i) => {
                  const modStep = i + 1;
                  const isActive = step === modStep;
                  const isDone = step > modStep;
                  const Icon = mod.icon;
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                      <button
                        ref={el => { navBtnRefs.current[i] = el; }}
                        onClick={() => setStep(modStep)}
                        className="flex items-center w-full text-left border-0 cursor-pointer font-[inherit] rounded-[11px] transition-colors"
                        style={{
                          gap: 11,
                          padding: "5px 6px",
                          background: "transparent",
                          color: isActive || isDone ? "var(--foreground)" : "var(--muted-foreground)",
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,70,229,0.06)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                      >
                        <span
                          className="flex-shrink-0 grid place-items-center"
                          style={{
                            width: 30, height: 30, borderRadius: 9,
                                            background: isActive
                              ? "linear-gradient(140deg, #4F46E5, #6B63F0)"
                              : isDone ? "var(--ob-indigo-50)" : "var(--ob-white)",
                            border: isActive || isDone ? "none" : "1px solid var(--border)",
                            color: isActive ? "#fff" : isDone ? "var(--primary)" : "var(--muted-foreground)",
                            boxShadow: isActive ? "0 6px 16px -6px rgba(79,70,229,0.7)" : "none",
                            transform: isActive ? "scale(1.03)" : "none",
                            transition: "all .18s",
                          }}
                        >
                          <Icon size={17} />
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500, letterSpacing: "-0.01em" }}>
                          {mod.label}
                        </span>
                        {mod.soon && (
                          <span style={{
                            marginLeft: "auto", fontSize: 9, fontWeight: 700, letterSpacing: ".06em",
                            textTransform: "uppercase", color: "var(--primary)",
                            background: "var(--indigo-50)", borderRadius: 999, padding: "2px 7px",
                          }}>
                            {t.onboarding.soon}
                          </span>
                        )}
                      </button>
                      {i < MODULE_STEPS.length - 1 && (
                        <div
                          aria-hidden="true"
                          style={{
                            marginLeft: 20,
                            width: 2,
                            height: 6,
                            borderRadius: 1,
                            background: isDone
                              ? "linear-gradient(180deg, #4F46E5, #6B63F0)"
                              : "rgba(79,70,229,0.14)",
                            transition: "background .3s",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ── RIGHT PANEL ── */}
          <section className="relative flex flex-col min-w-0 min-h-0 overflow-hidden">

            {/* Panel head */}
            <div className="ob-head flex items-center justify-between" style={{ padding: "22px 24px 0" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: ".01em" }}>
                {step === 0 ? (
                  t.onboarding.welcomeBoard
                ) : (
                  <span>
                    {t.onboarding.step}{" "}
                    <b style={{ color: "var(--primary)" }}>{step}</b>
                    {" "}{t.onboarding.stepOf}{" "}{MODULE_COUNT}
                  </span>
                )}
              </div>
              <button
                onClick={dismiss}
                aria-label="Zamknij"
                className="grid place-items-center"
                style={{
                  width: 34, height: 34, borderRadius: 10, border: "none", cursor: "pointer",
                  background: "transparent", color: "var(--muted-foreground)",
                  transition: "background .15s, color .15s",
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "var(--muted)"; b.style.color = "var(--foreground)";
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "transparent"; b.style.color = "var(--muted-foreground)";
                }}
              >
                <X size={19} />
              </button>
            </div>

            {/* Body */}
            <div
              key={step}
              className="ob-body ob-fade flex-1 overflow-y-auto"
              style={{ padding: "8px 34px 12px", scrollbarGutter: "stable" }}
            >

              {/* ── WELCOME ── */}
              {step === 0 && (
                <div className="ob-welcome flex flex-col items-center text-center" style={{ paddingTop: 30, paddingBottom: 10 }}>
                  <div
                    className="ob-wmark ob-rise"
                    style={{
                      width: 78, height: 78, borderRadius: 20, overflow: "hidden",
                      boxShadow: "0 18px 40px -14px rgba(79,70,229,0.65)",
                      marginBottom: 22,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/vee-icon.png" alt="veedeck" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <h2 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
                    {t.onboarding.welcomeTitle}{" "}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/vee_black.png" alt="veedeck" className="ob-logo-text" style={{ height: "1em", width: "auto", verticalAlign: "-0.16em" }} />
                  </h2>
                  <p style={{ fontSize: 15.5, color: "var(--muted-foreground)", lineHeight: 1.62, maxWidth: 430, margin: "16px auto 26px" }}>
                    <RichText text={t.onboarding.welcomeDesc} />
                  </p>
                  <div className="flex flex-wrap justify-center" style={{ gap: 10 }}>
                    {([
                      { icon: <IconGrid />, text: t.onboarding.chip1 },
                      { icon: <IconCalendarChip />, text: t.onboarding.chip2 },
                      { icon: <IconClock />, text: t.onboarding.chip3 },
                    ] as { icon: React.ReactNode; text: string }[]).map(({ icon, text }, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center"
                        style={{
                          gap: 8, background: "var(--ob-white)", border: "1px solid var(--border)",
                          borderRadius: 999, padding: "9px 15px",
                          fontSize: 13, fontWeight: 600, color: "var(--foreground)",
                        }}
                      >
                        <span style={{ color: "var(--primary)", flexShrink: 0, display: "flex" }}>{icon}</span>
                        {text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── MODULE SCREEN ── */}
              {step > 0 && currentModule && (
                <div>
                  {/* hero */}
                  <div className="flex items-center" style={{ gap: 16, margin: "14px 0 6px" }}>
                    <div
                      className="ob-m-icon flex-shrink-0 grid place-items-center"
                      style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: "linear-gradient(140deg, #4F46E5, #6B63F0)",
                        color: "#fff",
                        boxShadow: "0 12px 26px -10px rgba(79,70,229,0.6)",
                      }}
                    >
                      <currentModule.icon size={27} />
                    </div>
                    <div className="min-w-0">
                      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 3 }}>
                        {t.onboarding.step} {step} · {currentModule.label}
                      </div>
                      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                        <h2 className="ob-m-title" style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.15, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
                          {currentModule.title}
                        </h2>
                        {currentModule.soon && (
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase",
                            color: "var(--primary)", background: "var(--indigo-50)",
                            borderRadius: 999, padding: "3px 10px",
                          }}>
                            {t.onboarding.soon}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* desc */}
                  <p className="ob-m-desc" style={{ fontSize: 15, color: "var(--muted-foreground)", lineHeight: 1.62, margin: "16px 0 22px" }}>
                    {currentModule.desc}
                  </p>

                  {/* steps label */}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>
                    {t.onboarding.howToDo}
                  </div>

                  {/* step cards */}
                  <div style={{ display: "grid", gap: 10 }}>
                    {currentModule.steps.map((s, i) => (
                      <div
                        key={i}
                        className="ob-rise"
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 13,
                          background: "var(--ob-white)", border: "1px solid var(--border)",
                          borderRadius: 13, padding: "13px 15px",
                          animationDelay: `${0.05 + i * 0.06}s`,
                          transition: "border-color .18s, box-shadow .18s, transform .18s",
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.borderColor = "color-mix(in srgb, var(--primary) 32%, var(--border))";
                          el.style.boxShadow = "0 10px 22px -16px rgba(79,70,229,0.4)";
                          el.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.borderColor = "var(--border)";
                          el.style.boxShadow = "none";
                          el.style.transform = "none";
                        }}
                      >
                        <span
                          className="flex-shrink-0 grid place-items-center"
                          style={{
                            width: 26, height: 26, borderRadius: 8,
                            background: "var(--ob-indigo-50)", color: "var(--primary)",
                            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                            fontWeight: 700, fontSize: 13, marginTop: 1,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>

                  {/* tip */}
                  {currentModule.tip && (
                    <div
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 11,
                        marginTop: 16,
                        background: "var(--ob-tip-bg)",
                        border: "1px solid var(--ob-tip-border)",
                        borderRadius: 13, padding: "13px 15px",
                      }}
                    >
                      <span style={{ color: "var(--primary)" }}>
                        <IconLightbulb />
                      </span>
                      <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", lineHeight: 1.55 }}>
                        <RichText text={currentModule.tip} />
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="ob-footer flex items-center justify-between"
              style={{ gap: 12, padding: "16px 24px 22px", borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={dismiss}
                className="ob-skip"
                style={{
                  background: "none", border: "none", cursor: "pointer", font: "inherit",
                  fontSize: 13.5, color: "var(--muted-foreground)", fontWeight: 500,
                  padding: "8px 6px", transition: "color .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)"; }}
              >
                {t.onboarding.skip}
              </button>

              <div className="ob-foot-right flex items-center" style={{ gap: 10 }}>
                {/* Back */}
                <button
                  onClick={() => setStep(s => s - 1)}
                  disabled={isFirst}
                  className="inline-flex items-center"
                  style={{
                    gap: 7, font: "inherit", fontSize: 14, fontWeight: 600,
                    padding: "10px 18px", borderRadius: 11,
                    border: "1px solid var(--border)", background: "var(--ob-white)", color: "var(--foreground)",
                    cursor: isFirst ? "default" : "pointer",
                    opacity: isFirst ? 0.35 : 1,
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => { if (!isFirst) (e.currentTarget as HTMLButtonElement).style.background = "var(--muted)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ob-white)"; }}
                >
                  <ChevronLeft size={17} />
                  {t.onboarding.back}
                </button>

                {/* Next / Start / Begin */}
                {isLast ? (
                  <button
                    onClick={dismiss}
                    className="ob-btn-primary inline-flex items-center"
                    style={primaryBtn}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.filter = "brightness(1.05)"; b.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.filter = "none"; b.style.transform = "none"; }}
                  >
                    <Check size={17} />
                    {t.onboarding.begin}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    className="ob-btn-primary inline-flex items-center"
                    style={primaryBtn}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.filter = "brightness(1.05)"; b.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.filter = "none"; b.style.transform = "none"; }}
                  >
                    {isFirst ? t.onboarding.start : t.onboarding.next}
                    {isFirst ? <IconArrowRight /> : <ChevronRight size={17} />}
                  </button>
                )}
              </div>
            </div>

            {/* Footer guide link */}
            <div className="ob-footer-guide flex justify-center" style={{ padding: "0 24px 16px", marginTop: -8 }}>
              <Link
                href="/ustawienia/instrukcja"
                onClick={dismiss}
                className="inline-flex items-center"
                style={{
                  gap: 6, fontSize: 12.5, color: "var(--muted-foreground)",
                  textDecoration: "none", transition: "color .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted-foreground)"; }}
              >
                <BookOpen size={14} />
                {t.onboarding.fullGuide}
              </Link>
            </div>

          </section>
        </div>
      </div>
    </>
  );
}
