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
  const showWordmark = navMode !== "sidebar" || !sidebarCollapsed;

  return (
    <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_veedeck.svg" alt="veedeck" className="h-7 w-7 shrink-0" />
      {/* Wordmark: always hidden on mobile, visible md+ depending on sidebar state */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/veedeck_wordmark.svg"
        alt="veedeck"
        className={`hidden shrink-0 transition-opacity duration-200 ${showWordmark ? "md:block" : ""}`}
        style={{ height: "17px", width: "auto" }}
      />
    </Link>
  );
}
