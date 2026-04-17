"use client";

import { useEffect } from "react";
import { useTheme, type ColorTheme } from "@/lib/theme";

export function ColorThemeSync({ dbTheme }: { dbTheme: ColorTheme }) {
  const { setColorTheme } = useTheme();

  useEffect(() => {
    const local = localStorage.getItem("color-theme") as ColorTheme | null;
    // If localStorage has no value, sync from DB (new device)
    if (!local) {
      setColorTheme(dbTheme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
