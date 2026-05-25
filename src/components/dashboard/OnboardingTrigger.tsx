"use client";

import { BookOpen } from "@/components/ui/icons";

export default function OnboardingTrigger() {
  function open() {
    window.dispatchEvent(new CustomEvent("open-onboarding"));
  }

  return (
    <button
      onClick={open}
      title="Jak zacząć?"
      className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
    >
      <BookOpen size={13} />
      Jak zacząć?
    </button>
  );
}
