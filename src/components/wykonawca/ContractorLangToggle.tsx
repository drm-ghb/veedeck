"use client";

import { useLang } from "@/lib/i18n";

export default function ContractorLangToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "pl" ? "en" : "pl")}
      title={lang === "pl" ? "Switch to English" : "Przełącz na Polski"}
      className="px-2 py-1 rounded text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
    >
      {lang === "pl" ? "PL" : "EN"}
    </button>
  );
}
