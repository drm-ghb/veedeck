"use client";

import { useEffect } from "react";
import { useTheme, type ColorTheme, type CustomThemeColors } from "@/lib/theme";

export function ColorThemeSync({ dbTheme, dbCustomTheme, forceApply }: { dbTheme: ColorTheme; dbCustomTheme?: CustomThemeColors | null; forceApply?: boolean }) {
  const { setColorTheme, setCustomTheme } = useTheme();

  useEffect(() => {
    // Always apply DB theme — it's the source of truth per user.
    // Write to localStorage first so ThemeProvider's mount effect (which runs after
    // this child effect) reads the correct value instead of overwriting with stale data.
    localStorage.setItem("color-theme", dbTheme);
    if (dbCustomTheme) localStorage.setItem("custom-theme", JSON.stringify(dbCustomTheme));
    setColorTheme(dbTheme);
    if (dbCustomTheme) setCustomTheme(dbCustomTheme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
