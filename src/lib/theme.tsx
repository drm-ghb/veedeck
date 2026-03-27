"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("renderflow-theme") as Theme | null;
    if (saved) setThemeState(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const applyDark = (dark: boolean) => {
      root.classList.toggle("dark", dark);
      document.cookie = `renderflow-theme=${dark ? "dark" : "light"}; path=/; max-age=31536000; SameSite=Lax`;
    };

    if (theme === "dark") {
      applyDark(true);
      localStorage.setItem("renderflow-theme", "dark");
      return;
    }

    if (theme === "light") {
      applyDark(false);
      localStorage.setItem("renderflow-theme", "light");
      return;
    }

    // system
    localStorage.setItem("renderflow-theme", "system");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    applyDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => applyDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
