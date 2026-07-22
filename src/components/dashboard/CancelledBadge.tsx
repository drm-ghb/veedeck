"use client";

import Link from "next/link";

interface Props {
  cancelAt?: string; // ISO — jeśli podane, subskrypcja active ale scheduled to cancel
}

export default function CancelledBadge({ cancelAt }: Props) {
  const label = cancelAt
    ? `Aktywny do ${new Date(cancelAt).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}`
    : "Subskrypcja anulowana";

  return (
    <Link
      href="/ustawienia/plan-i-rozliczenia"
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/15 dark:text-amber-400"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      {label}
    </Link>
  );
}
