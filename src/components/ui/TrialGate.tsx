"use client";

import { useIsTrialExpired } from "@/lib/trial-context";

/**
 * Wraps any button/trigger. When trial is expired:
 * - outer span receives hover events and shows tooltip
 * - inner span blocks pointer events + dims the child
 */
export default function TrialGate({ children, className }: { children: React.ReactNode; className?: string }) {
  const expired = useIsTrialExpired();
  if (!expired) return <>{children}</>;

  return (
    <span
      className={`inline-flex cursor-not-allowed${className ? ` ${className}` : ""}`}
      title="Dostępne w płatnym planie"
    >
      <span className="pointer-events-none opacity-40 inline-flex select-none">
        {children}
      </span>
    </span>
  );
}
