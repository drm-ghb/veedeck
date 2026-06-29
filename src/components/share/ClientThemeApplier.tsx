"use client";

import { useEffect } from "react";

export default function ClientThemeApplier({ colorTheme }: { colorTheme: string }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = colorTheme;

    // Watch for any external changes to data-theme (e.g. ThemeProvider reading
    // localStorage) and immediately reset to the project theme.
    // MutationObserver callbacks are microtasks — they run before the browser
    // paints, so there is no visible flash.
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
  }, [colorTheme]);

  return null;
}
