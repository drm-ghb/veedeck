"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { pl } from "./translations/pl";
import { en } from "./translations/en";
import type { TranslationKeys } from "./translations/pl";

export type Lang = "pl" | "en";

const COOKIE_NAME = "veedeck-lang";

const translations: Record<Lang, TranslationKeys> = { pl, en };

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "pl";
  const lang = navigator.language?.toLowerCase() ?? "";
  return lang.startsWith("pl") ? "pl" : "en";
}

function getCookieLang(): Lang | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  const val = match[1] as Lang;
  return val === "pl" || val === "en" ? val : null;
}

function setCookieLang(lang: Lang) {
  document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslationKeys;
}

const LangContext = createContext<LangContextValue>({
  lang: "pl",
  setLang: () => {},
  t: pl,
});

interface LanguageProviderProps {
  children: React.ReactNode;
  /** Initial language read from cookie server-side */
  initialLang?: Lang | null;
}

export function LanguageProvider({ children, initialLang }: LanguageProviderProps) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (initialLang) return initialLang;
    const cookie = getCookieLang();
    if (cookie) return cookie;
    return detectBrowserLang();
  });

  useEffect(() => {
    // On mount, sync with cookie/browser if no initial value was passed
    if (!initialLang) {
      const cookie = getCookieLang();
      const resolved = cookie ?? detectBrowserLang();
      if (resolved !== lang) setLangState(resolved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setCookieLang(next);
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

/** Returns the full translations object for the active language */
export function useT() {
  return useContext(LangContext).t;
}

/** Returns the active language and a setter */
export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  return { lang, setLang };
}
