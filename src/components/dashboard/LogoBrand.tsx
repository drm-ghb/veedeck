"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";

export function LogoBrand({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialCollapsed);
  const { colorTheme } = useTheme();

  useEffect(() => {
    function handler(e: Event) {
      setSidebarCollapsed((e as CustomEvent<{ collapsed: boolean }>).detail.collapsed);
    }
    window.addEventListener("sidebar-state-change", handler);
    return () => window.removeEventListener("sidebar-state-change", handler);
  }, []);

  const showWordmark = !sidebarCollapsed;
  const iconSrc = colorTheme === "violet" ? "/logo_violet.png" : "/veedeck_ikona_vsg.svg";

  return (
    <Link href="/panel-glowny" className="flex items-center gap-2 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconSrc} alt="veedeck" className="h-7 w-7 shrink-0 object-contain" />
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
            src="/veedeckicon.png"
            alt=""
            className="hidden md:dark:block shrink-0"
            style={{ height: "17px", width: "auto" }}
          />
        </>
      )}
    </Link>
  );
}
