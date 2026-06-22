"use client";

import { BookOpen } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

export default function OnboardingTrigger() {
  const t = useT();
  function open() {
    window.dispatchEvent(new CustomEvent("open-onboarding"));
  }

  return (
    <button
      onClick={open}
      title={t.common.howToStart}
      className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
    >
      <BookOpen size={13} />
      {t.common.howToStart}
    </button>
  );
}
