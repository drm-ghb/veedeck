"use client";

import { useEffect } from "react";
import { useTheme, type ColorTheme, type CustomThemeColors } from "@/lib/theme";

export function ColorThemeSync({ dbTheme, dbCustomTheme, forceApply }: { dbTheme: ColorTheme; dbCustomTheme?: CustomThemeColors | null; forceApply?: boolean }) {
  const { setColorTheme, setCustomTheme } = useTheme();

  useEffect(() => {
    // Always apply DB theme — it's the source of truth per user.
    // localStorage is only a write-through cache, not authoritative.
    setColorTheme(dbTheme);
    if (dbCustomTheme) setCustomTheme(dbCustomTheme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
