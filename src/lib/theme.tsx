"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type ColorTheme = "champagne" | "obsidian" | "navy" | "plum" | "mono";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
}>({ theme: "light", setTheme: () => {}, colorTheme: "champagne", setColorTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("champagne");

  useEffect(() => {
    const saved = localStorage.getItem("veedeck-theme") as Theme | null;
    if (saved) setThemeState(saved);

    const savedColor = localStorage.getItem("color-theme") as ColorTheme | null;
    if (savedColor) setColorThemeState(savedColor);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const applyDark = (dark: boolean) => {
      root.classList.toggle("dark", dark);
      document.cookie = `veedeck-theme=${dark ? "dark" : "light"}; path=/; max-age=31536000; SameSite=Lax`;
    };

    if (theme === "dark") {
      applyDark(true);
      localStorage.setItem("veedeck-theme", "dark");
      return;
    }

    if (theme === "light") {
      applyDark(false);
      localStorage.setItem("veedeck-theme", "light");
      return;
    }

    // system
    localStorage.setItem("veedeck-theme", "system");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    applyDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => applyDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = colorTheme;
    localStorage.setItem("color-theme", colorTheme);
    document.cookie = `color-theme=${colorTheme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [colorTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, colorTheme, setColorTheme: setColorThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
