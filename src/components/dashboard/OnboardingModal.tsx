"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Users, PushPin, LocalMall, ChatBubble, Package,
  CalendarDays, NotebookText, ListChecks,
  X, ChevronLeft, ChevronRight, BookOpen, Check,
} from "@/components/ui/icons";

interface Step {
  icon: React.ElementType;
  title: string;
  desc: string;
  steps: string[];
  tip?: string;
}

const STEPS: Step[] = [
  {
    icon: Users,
    title: "Klienci",
    desc: "Punkt startowy platformy. Tu dodajesz klientów, których potem podpisujesz do projektów w RenderFlow i list zakupowych.",
    steps: [
      'Przejdź do modułu Klienci i kliknij "Dodaj klienta"',
      "Podaj imię, nazwisko i e-mail klienta",
      "Opcjonalnie utwórz konto klienta — dostanie login do swojego panelu",
    ],
  },
  {
    icon: PushPin,
    title: "RenderFlow — wizualizacje",
    desc: "Udostępniaj wizualizacje i pliki projektu. Klient komentuje, akceptuje i śledzi zmiany w jednym miejscu.",
    steps: [
      "Utwórz projekt i przypisz istniejącego klienta",
      "Dodaj pomieszczenia (np. Salon, Kuchnia)",
      "W każdym pomieszczeniu wrzuć wizualizacje lub foldery",
    ],
    tip: "Nowego klienta możesz dodać bezpośrednio przy tworzeniu projektu.",
  },
  {
    icon: LocalMall,
    title: "Listy zakupowe",
    desc: "Twórz zestawienia produktów, mebli i materiałów. Klient przegląda szczegóły, klika w linki sklepów i zatwierdza produkty.",
    steps: [
      "Utwórz listę i przypisz klienta",
      "Dodaj sekcje (np. Salon, Sypialnia) i produkty w każdej sekcji",
      "Udostępnij listę — klient zobaczy ją w swoim panelu",
    ],
    tip: "Rozszerzenie veepick pozwala dodawać produkty ze sklepów jednym kliknięciem.",
  },
  {
    icon: ChatBubble,
    title: "Dyskusje",
    desc: "Wbudowany komunikator między Tobą a klientem. Wątek tworzy się automatycznie po dodaniu klienta — bez żadnej konfiguracji.",
    steps: [
      "Wątek powstaje automatycznie po dodaniu klienta",
      "Piszesz wiadomości, wysyłasz zdjęcia i dokumenty",
      "Klient odpowiada bezpośrednio ze swojego panelu",
    ],
  },
  {
    icon: Package,
    title: "Produkty",
    desc: "Twoja biblioteka często używanych mebli, oświetlenia i akcesoriów. Zapisz raz — wstawiaj do dowolnej listy zakupowej bez przepisywania.",
    steps: [
      "Dodaj produkty ręcznie lub przez rozszerzenie veepick",
      "Otwórz listę zakupową i wstaw produkt z biblioteki",
      "Wszystkie dane trafiają automatycznie",
    ],
  },
  {
    icon: CalendarDays,
    title: "Kalendarz",
    desc: "Planuj spotkania z klientami, zadania i przypomnienia. Widok miesięczny, tygodniowy i dzienny.",
    steps: [
      "Dodaj wydarzenie, zadanie lub przypomnienie",
      "Wybierz datę, godzinę i opcjonalnie zaproś uczestników",
      "Śledź plan w wybranym widoku kalendarza",
    ],
  },
  {
    icon: NotebookText,
    title: "Notatnik",
    desc: "Zapisuj pomysły, notatki ze spotkań i szkice. Działa na komputerze, telefonie i tablecie.",
    steps: [
      "Utwórz notatkę i wpisz tekst lub narysuj szkic",
      "Szkicownik działa na każdym urządzeniu — palcem lub rysorem",
      "Archiwizuj nieaktualne notatki",
    ],
  },
  {
    icon: ListChecks,
    title: "Zadania",
    desc: "Zarządzaj swoją pracą — twórz zadania powiązane z projektami, ustawiaj priorytety i śledź postęp w widoku listy lub kanban.",
    steps: [
      "Dodaj zadanie z tytułem, terminem i priorytetem",
      "Przypisz do projektu i śledź statusy: Do zrobienia, W trakcie, Gotowe",
      "Dodawaj podzadania dla złożonych działań",
    ],
  },
];

const STORAGE_KEY = "onboarding-modal-v1";

export default function OnboardingModal({ show }: { show: boolean }) {
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  // Auto-show: only on /dashboard, only if not dismissed before
  useEffect(() => {
    if (!show) return;
    if (pathname !== "/dashboard") return;
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true") return;
    setVisible(true);
  }, [show, pathname]);

  useEffect(() => {
    function handleOpen() {
      setStep(0);
      setVisible(true);
    }
    window.addEventListener("open-onboarding", handleOpen);
    return () => window.removeEventListener("open-onboarding", handleOpen);
  }, []);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
    fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mergeViewPreferences: { onboardingSeen: true } }),
    }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jak zacząć</p>
            <p className="text-sm text-muted-foreground mt-0.5">Krok {step + 1} z {STEPS.length}</p>
          </div>
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-5 py-3 border-b border-border">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`transition-all rounded-full ${
                i === step
                  ? "w-5 h-2 bg-primary"
                  : i < step
                  ? "w-2 h-2 bg-primary/40"
                  : "w-2 h-2 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Icon + title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Icon size={24} />
            </div>
            <h2 className="text-lg font-semibold text-foreground leading-snug">{current.title}</h2>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{current.desc}</p>

          {/* Steps */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Jak to zrobić</p>
            <ul className="space-y-2">
              {current.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Tip */}
          {current.tip && (
            <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/15 rounded-xl px-3.5 py-3">
              <span className="text-sm leading-none mt-0.5">💡</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{current.tip}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={dismiss}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
            >
              Pomiń
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={isFirst}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft size={15} />
                Wstecz
              </button>
              {isLast ? (
                <button
                  onClick={dismiss}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Check size={15} />
                  Gotowe
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Dalej
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-center">
            <Link
              href="/settings/instrukcja"
              onClick={dismiss}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <BookOpen size={13} />
              Zobacz pełną instrukcję
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
