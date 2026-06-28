"use client";

import { useEffect } from "react";
import { useTheme, type ColorTheme, type CustomThemeColors } from "@/lib/theme";

export function ColorThemeSync({ dbTheme, dbCustomTheme }: { dbTheme: ColorTheme; dbCustomTheme?: CustomThemeColors | null }) {
  const { setColorTheme, setCustomTheme } = useTheme();

  useEffect(() => {
    const local = localStorage.getItem("color-theme") as ColorTheme | null;
    if (!local) {
      // New device — sync everything from DB
      setColorTheme(dbTheme);
      if (dbCustomTheme) setCustomTheme(dbCustomTheme);
    } else if (local === "custom" && !localStorage.getItem("custom-theme") && dbCustomTheme) {
      // Has custom selected but no colors locally — pull from DB
      setCustomTheme(dbCustomTheme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
