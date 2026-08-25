"use client";

import { useState, useEffect } from "react";

export default function RenderFixedWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      const collapsed = (e as CustomEvent).detail?.collapsed;
      setSidebarExpanded(collapsed === false);
    }
    window.addEventListener("sidebar-state-change", handler);
    return () => window.removeEventListener("sidebar-state-change", handler);
  }, []);

  return (
    <div className={`fixed inset-0 top-[57px] z-40 bg-background md:rounded-tl-2xl transition-[left] duration-200 ${sidebarExpanded ? "md:left-60" : "md:left-14"}`}>
      {children}
    </div>
  );
}
