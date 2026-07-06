"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n";

import {
  Users, PushPin, LocalMall, ChatBubble, Package,
  CalendarDays, NotebookText, CheckSquare,
  X, ChevronLeft, ChevronRight, BookOpen, Check,
} from "@/components/ui/icons";

interface Step {
  icon: React.ElementType;
  title: string;
  desc: string;
  steps: string[];
  tip?: string;
}

const STORAGE_KEY = "onboarding-modal-v1";

export default function OnboardingModal({ show }: { show: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const STEPS: Step[] = [
  {
    icon: Users,
    title: t.onboarding.clientsTitle,
    desc: t.onboarding.clientsDesc,
    steps: [
      t.onboarding.clientsStep1,
      t.onboarding.clientsStep2,
      t.onboarding.clientsStep3,
    ],
  },
  {
    icon: PushPin,
    title: t.onboarding.projectFlowTitle,
    desc: t.onboarding.projectFlowDesc,
    steps: [
      t.onboarding.projectFlowStep1,
      t.onboarding.projectFlowStep2,
      t.onboarding.projectFlowStep3,
    ],
    tip: t.onboarding.projectFlowTip,
  },
  {
    icon: LocalMall,
    title: t.onboarding.listyTitle,
    desc: t.onboarding.listyDesc,
    steps: [
      t.onboarding.listyStep1,
      t.onboarding.listyStep2,
      t.onboarding.listyStep3,
    ],
    tip: t.onboarding.listyTip,
  },
  {
    icon: ChatBubble,
    title: t.onboarding.dyskusjeTitle,
    desc: t.onboarding.dyskusjeDesc,
    steps: [
      t.onboarding.dyskusjeStep1,
      t.onboarding.dyskusjeStep2,
      t.onboarding.dyskusjeStep3,
    ],
  },
  {
    icon: Package,
    title: t.onboarding.produktyTitle,
    desc: t.onboarding.produktyDesc,
    steps: [
      t.onboarding.produktyStep1,
      t.onboarding.produktyStep2,
      t.onboarding.produktyStep3,
    ],
  },
  {
    icon: CalendarDays,
    title: t.onboarding.kalendarTitle,
    desc: t.onboarding.kalendarDesc,
    steps: [
      t.onboarding.kalendarStep1,
      t.onboarding.kalendarStep2,
      t.onboarding.kalendarStep3,
    ],
  },
  {
    icon: NotebookText,
    title: t.onboarding.notatnikTitle,
    desc: t.onboarding.notatnikDesc,
    steps: [
      t.onboarding.notatnikStep1,
      t.onboarding.notatnikStep2,
      t.onboarding.notatnikStep3,
    ],
  },
  {
    icon: CheckSquare,
    title: t.onboarding.zadaniaTitle,
    desc: t.onboarding.zadaniaDesc,
    steps: [
      t.onboarding.zadaniaStep1,
      t.onboarding.zadaniaStep2,
      t.onboarding.zadaniaStep3,
    ],
  },
  ];

  // Auto-show: only on /panel-glowny, only if not dismissed before
  useEffect(() => {
    if (!show) return;
    if (pathname !== "/panel-glowny") return;
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true") return;
    setVisible(true);
  }, [show, pathname]);

  useEffect(() => {
    function handleOpen() {
      setStep(0);
      setVisible(true);
    }
    window.addEventListener("open-onboarding", handleOpen);
    return () => window.removeEventListener("open-onboarding", handleOpen);
  }, []);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
    fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mergeViewPreferences: { onboardingSeen: true } }),
    }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.onboarding.howToStart}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{t.onboarding.step} {step + 1} {t.onboarding.stepOf} {STEPS.length}</p>
          </div>
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-5 py-3 border-b border-border">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`transition-all rounded-full ${
                i === step
                  ? "w-5 h-2 bg-primary"
                  : i < step
                  ? "w-2 h-2 bg-primary/40"
                  : "w-2 h-2 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Icon + title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Icon size={24} />
            </div>
            <h2 className="text-lg font-semibold text-foreground leading-snug">{current.title}</h2>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{current.desc}</p>

          {/* Steps */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.onboarding.howToDo}</p>
            <ul className="space-y-2">
              {current.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Tip */}
          {current.tip && (
            <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/15 rounded-xl px-3.5 py-3">
              <span className="text-sm leading-none mt-0.5">💡</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{current.tip}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={dismiss}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
            >
              {t.onboarding.skip}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={isFirst}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft size={15} />
                {t.onboarding.back}
              </button>
              {isLast ? (
                <button
                  onClick={dismiss}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Check size={15} />
                  {t.onboarding.done}
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {t.onboarding.next}
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-center">
            <Link
              href="/ustawienia/instrukcja"
              onClick={dismiss}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <BookOpen size={13} />
              {t.onboarding.fullGuide}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
