"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

interface Props {
  trialEndsAt: string; // ISO string
}

export default function TrialBadge({ trialEndsAt }: Props) {
  const t = useT();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(trialEndsAt);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    setDaysLeft(Math.max(0, diff));
  }, [trialEndsAt]);

  if (daysLeft === null) return null;

  const urgent = daysLeft <= 5;

  return (
    <Link
      href="/ustawienia/plan-i-rozliczenia"
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
        urgent
          ? "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/15 dark:text-red-400"
          : "bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/15 dark:text-amber-400"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${urgent ? "bg-red-500" : "bg-amber-500"} animate-pulse`} />
      {daysLeft === 0 ? t.common.trialExpiresToday : `Trial: ${daysLeft} ${daysLeft === 1 ? t.common.daySg : t.common.dayPl}`}
    </Link>
  );
}
