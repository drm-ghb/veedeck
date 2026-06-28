"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type ColorTheme = "violet" | "champagne" | "obsidian" | "navy" | "plum" | "mono" | "custom";

export interface CustomThemeColors {
  primary: string;
  background: string;
  sidebar: string;
}

// ── Color math helpers ──────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function getLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function getFg(hex: string) { return getLuminance(hex) > 0.35 ? "#111111" : "#FFFFFF"; }

function lighten(hex: string, t: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

function darken(hex: string, t: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t));
}

function muted(hex: string) { return getLuminance(hex) > 0.5 ? darken(hex, 0.06) : lighten(hex, 0.1); }
function border(hex: string) { return getLuminance(hex) > 0.5 ? darken(hex, 0.12) : lighten(hex, 0.15); }
function mutedFg(hex: string) { return getLuminance(hex) > 0.5 ? darken(hex, 0.45) : lighten(hex, 0.55); }
function sidebarAccent(hex: string) { return getLuminance(hex) > 0.5 ? darken(hex, 0.08) : lighten(hex, 0.1); }

export function buildCustomThemeCSS(c: CustomThemeColors): string {
  const primaryAccent = lighten(c.primary, 0.5);
  return `
:root[data-theme="custom"] {
  --background: ${c.background};
  --foreground: ${getFg(c.background)};
  --card: ${c.background};
  --card-foreground: ${getFg(c.background)};
  --popover: ${c.background};
  --popover-foreground: ${getFg(c.background)};
  --primary: ${c.primary};
  --primary-foreground: ${getFg(c.primary)};
  --secondary: ${muted(c.background)};
  --secondary-foreground: ${getFg(c.background)};
  --muted: ${muted(c.background)};
  --muted-foreground: ${mutedFg(c.background)};
  --accent: ${primaryAccent};
  --accent-foreground: ${c.primary};
  --destructive: oklch(0.577 0.245 27.325);
  --border: ${border(c.background)};
  --input: ${border(c.background)};
  --ring: ${c.primary};
  --radius: 0.625rem;
  --sidebar: ${c.sidebar};
  --sidebar-foreground: ${getFg(c.sidebar)};
  --sidebar-primary: ${c.primary};
  --sidebar-primary-foreground: ${getFg(c.primary)};
  --sidebar-accent: ${sidebarAccent(c.sidebar)};
  --sidebar-accent-foreground: ${getFg(c.sidebar)};
  --sidebar-border: ${border(c.sidebar)};
  --sidebar-ring: ${c.primary};
}`.trim();
}

// ── Context ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
  customTheme: CustomThemeColors | null;
  setCustomTheme: (c: CustomThemeColors) => void;
}>({
  theme: "light", setTheme: () => {},
  colorTheme: "violet", setColorTheme: () => {},
  customTheme: null, setCustomTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("violet");
  const [customTheme, setCustomThemeState] = useState<CustomThemeColors | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("veedeck-theme") as Theme | null;
    if (saved) setThemeState(saved);

    const savedColor = localStorage.getItem("color-theme") as ColorTheme | null;
    if (savedColor) setColorThemeState(savedColor);

    const savedCustom = localStorage.getItem("custom-theme");
    if (savedCustom) {
      try { setCustomThemeState(JSON.parse(savedCustom)); } catch {}
    }
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

    if (colorTheme === "custom" && customTheme) {
      let el = document.getElementById("custom-theme-style") as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement("style");
        el.id = "custom-theme-style";
        document.head.appendChild(el);
      }
      el.textContent = buildCustomThemeCSS(customTheme);
    }
  }, [colorTheme, customTheme]);

  function setCustomTheme(c: CustomThemeColors) {
    setCustomThemeState(c);
    localStorage.setItem("custom-theme", JSON.stringify(c));
    // Inject CSS immediately so live preview works
    let el = document.getElementById("custom-theme-style") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "custom-theme-style";
      document.head.appendChild(el);
    }
    el.textContent = buildCustomThemeCSS(c);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, colorTheme, setColorTheme: setColorThemeState, customTheme, setCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
