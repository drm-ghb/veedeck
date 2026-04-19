"use client";

import { useEffect } from "react";

export default function ClientThemeApplier({ colorTheme }: { colorTheme: string }) {
  useEffect(() => {
    document.documentElement.dataset.theme = colorTheme;
    return () => {
      // Restore user's own theme from localStorage on unmount
      const saved = localStorage.getItem("color-theme");
      if (saved) document.documentElement.dataset.theme = saved;
    };
  }, [colorTheme]);
  return null;
}
