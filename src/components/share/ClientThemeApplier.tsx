"use client";

import { useEffect } from "react";
import { buildCustomThemeCSS, type CustomThemeColors } from "@/lib/theme";

export default function ClientThemeApplier({ colorTheme, customTheme }: { colorTheme: string; customTheme?: CustomThemeColors | null }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = colorTheme;

    // Inject custom theme CSS if needed
    if (colorTheme === "custom" && customTheme) {
      let el = document.getElementById("custom-theme-style") as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement("style");
        el.id = "custom-theme-style";
        document.head.appendChild(el);
      }
      el.textContent = buildCustomThemeCSS(customTheme);
    }

    // Watch for any external changes to data-theme (e.g. ThemeProvider reading
    // localStorage) and immediately reset to the project theme.
    const observer = new MutationObserver(() => {
      if (root.dataset.theme !== colorTheme) {
        root.dataset.theme = colorTheme;
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
      // Restore the designer's own theme from localStorage on unmount.
      const saved = localStorage.getItem("color-theme");
      if (saved) root.dataset.theme = saved;
    };
  }, [colorTheme, customTheme]);

  return null;
}
