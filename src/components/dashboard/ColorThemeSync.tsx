"use client";

import { useEffect } from "react";
import { useTheme, type ColorTheme, type CustomThemeColors } from "@/lib/theme";

export function ColorThemeSync({ dbTheme, dbCustomTheme, forceApply }: { dbTheme: ColorTheme; dbCustomTheme?: CustomThemeColors | null; forceApply?: boolean }) {
  const { setColorTheme, setCustomTheme } = useTheme();

  useEffect(() => {
    if (forceApply) {
      setColorTheme(dbTheme);
      if (dbCustomTheme) setCustomTheme(dbCustomTheme);
      return;
    }
    const local = localStorage.getItem("color-theme") as ColorTheme | null;
    if (!local) {
      // New device — sync everything from DB
      setColorTheme(dbTheme);
      if (dbCustomTheme) setCustomTheme(dbCustomTheme);
    } else {
      if (local === "custom" && !localStorage.getItem("custom-theme") && dbCustomTheme) {
        // Has custom selected but no colors locally — pull from DB
        setCustomTheme(dbCustomTheme);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
