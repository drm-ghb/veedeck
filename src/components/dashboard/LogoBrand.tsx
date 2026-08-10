"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";

const DARK_SIDEBAR_THEMES = ["obsidian", "navy", "plum"];

export function LogoBrand({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialCollapsed);
  const { colorTheme } = useTheme();
  const darkSidebar = DARK_SIDEBAR_THEMES.includes(colorTheme);

  useEffect(() => {
    function handler(e: Event) {
      setSidebarCollapsed((e as CustomEvent<{ collapsed: boolean }>).detail.collapsed);
    }
    window.addEventListener("sidebar-state-change", handler);
    return () => window.removeEventListener("sidebar-state-change", handler);
  }, []);

  const showWordmark = !sidebarCollapsed;
  const iconSrc = "/veedeck_ikona_vsg.svg";

  return (
    <Link href="/panel-glowny" className="flex items-center gap-2 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconSrc} alt="veedeck" className="h-7 w-7 shrink-0 object-contain" />
      {showWordmark && (
        <>
          {/* Black wordmark — light mode only, not on dark-sidebar themes */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vee_black.png"
            alt="veedeck"
            className={darkSidebar ? "hidden" : "hidden md:block dark:hidden shrink-0"}
            style={{ height: "19px", width: "auto" }}
          />
          {/* White wordmark — dark mode or dark-sidebar themes */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/veedeckicon.png"
            alt=""
            className={darkSidebar ? "hidden md:block shrink-0" : "hidden md:dark:block shrink-0"}
            style={{ height: "19px", width: "auto" }}
          />
        </>
      )}
    </Link>
  );
}
