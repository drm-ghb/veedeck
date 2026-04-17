"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface LogoBrandProps {
  navMode: string;
}

export function LogoBrand({ navMode }: LogoBrandProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("nav-sidebar-collapsed") === "true");

    function handler(e: Event) {
      setSidebarCollapsed((e as CustomEvent<{ collapsed: boolean }>).detail.collapsed);
    }
    window.addEventListener("sidebar-state-change", handler);
    return () => window.removeEventListener("sidebar-state-change", handler);
  }, []);

  // Wordmark visible when: no sidebar mode (always), or sidebar mode + expanded
  // Wordmark visible when: no sidebar mode (always), or sidebar mode + expanded
  const showWordmark = navMode !== "sidebar" || !sidebarCollapsed;

  return (
    <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_vee.png" alt="veedeck" className="h-7 w-7 shrink-0 object-contain" />
      {showWordmark && (
        <>
          {/* Light mode: black wordmark (md+, hidden in dark) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vee_black.png"
            alt="veedeck"
            className="hidden md:block dark:hidden shrink-0"
            style={{ height: "17px", width: "auto" }}
          />
          {/* Dark mode: white wordmark (md+ dark only) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vee_white.png"
            alt=""
            className="hidden md:dark:block shrink-0"
            style={{ height: "17px", width: "auto" }}
          />
        </>
      )}
    </Link>
  );
}
