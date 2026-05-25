"use client";

import { useState } from "react";
import {
  PushPin, LocalMall, Comment, ChatBubble,
  Pin, Check, ExternalLink, History,
  Paperclip, Mic, CornerDownLeft, X, Users,
  Package, CalendarDays, NotebookText, ViewInAr, CheckSquare,
} from "@/components/ui/icons";

/* ─── DESIGNER PANEL ────────────────────────────────────────────────────── */

interface DesignerStep {
  title: string;
  desc: string;
  tips?: string[];
  steps: string[];
}

const DESIGNER_MODULES: DesignerStep[] = [
  {
    title: "1. Klienci",
    desc: "Punkt startowy — tu dodajesz klientów, z którymi pracujesz. Każdy klient jest bazą do podpięcia projektów w RenderFlow i list zakupowych. Dzięki temu masz wszystko w jednym miejscu, przypisane do konkretnej osoby.",
    steps: [
      'Przejdź do modułu Klienci i kliknij "Dodaj klienta"',
      "Podaj imię, nazwisko i e-mail klienta",
      "Opcjonalnie: utwórz konto klienta — dostanie login do panelu i będzie mógł samodzielnie przeglądać projekty i listy",
      "Klient jest teraz gotowy do przypisania do projektu lub listy",
    ],
  },
  {
    title: "2. RenderFlow",
    desc: "Moduł do udostępniania wizualizacji i plików projektu. Po dodaniu klienta tworzysz projekt, przypisujesz go do istniejącego klienta, a następnie dodajesz pomieszczenia (np. Salon, Sypialnia) i wrzucasz do nich wizualizacje, pliki PDF lub kolejne foldery dla większego porządku.",
    tips: ["Możesz też dodać projekt z nowym klientem od razu — wystarczy wpisać jego dane przy tworzeniu projektu, a klient automatycznie trafi do modułu Klienci."],
    steps: [
      'Kliknij "Nowy projekt" i nadaj mu nazwę',
      "Przypisz istniejącego klienta lub dodaj nowego na miejscu",
      "Dodaj pomieszczenia (np. Salon, Kuchnia, Sypialnia)",
      "W każdym pomieszczeniu prześlij wizualizacje lub utwórz foldery",
      "Udostępnij projekt klientowi — dostanie link do podglądu",
    ],
  },
  {
    title: "3. Listy zakupowe",
    desc: "Moduł do tworzenia zestawień produktów, mebli i materiałów. Tak samo jak przy projektach — tworzysz listę i przypisujesz ją do istniejącego klienta. Produkty możesz organizować w sekcje odpowiadające pomieszczeniom.",
    tips: [
      "Możesz też dodać listę z nowym klientem od razu — wystarczy wpisać jego dane przy tworzeniu listy, a klient automatycznie trafi do modułu Klienci.",
      "Zainstaluj rozszerzenie veepick do przeglądarki — pozwala dodawać produkty do listy bezpośrednio ze sklepów internetowych jednym kliknięciem, bez ręcznego wklejania danych.",
    ],
    steps: [
      'Kliknij "Nowa lista" i nadaj jej nazwę',
      "Przypisz istniejącego klienta lub dodaj nowego na miejscu",
      "Dodaj sekcje (np. Salon, Sypialnia, Łazienka)",
      "W każdej sekcji dodawaj produkty z linkiem, ceną i szczegółami",
      "Udostępnij listę klientowi — zobaczy ją w swoim panelu",
    ],
  },
  {
    title: "4. Dyskusje",
    desc: "Wbudowany komunikator między Tobą a klientem. Po dodaniu klienta wątek dyskusji tworzy się automatycznie — nie musisz nic konfigurować. To idealne miejsce na szybkie ustalenia, pytania i przesyłanie materiałów inspiracyjnych bez używania maila.",
    steps: [
      "Wątek powstaje automatycznie po dodaniu klienta",
      "Piszesz wiadomości, wysyłasz zdjęcia i dokumenty",
      "Klient odpowiada bezpośrednio ze swojego panelu",
      "Cała historia komunikacji zostaje w jednym miejscu",
    ],
  },
  {
    title: "5. Produkty",
    desc: "Biblioteka produktów — Twoja baza mebli, oświetlenia, akcesoriów i materiałów, które często używasz w projektach. Produkty możesz dodawać ręcznie lub za pomocą rozszerzenia veepick, a następnie szybko wstawiać je do dowolnej listy zakupowej bez ponownego wpisywania danych.",
    tips: [
      "Rozszerzenie veepick pozwala dodać produkt ze sklepu internetowego do biblioteki lub bezpośrednio do listy jednym kliknięciem — bez kopiowania linku, ceny ani zdjęcia.",
    ],
    steps: [
      "Dodaj produkt ręcznie lub przez veepick ze sklepu internetowego",
      "Uzupełnij kategorię, cenę, wymiary i inne dane",
      "Otwórz dowolną listę zakupową i wstaw produkt z biblioteki",
      "Produkt trafia do sekcji z zachowaniem wszystkich danych",
    ],
  },
  {
    title: "6. Kalendarz",
    desc: "Osobisty kalendarz projektanta. Możesz planować spotkania z klientami, dodawać zadania do wykonania i ustawiać przypomnienia. Widok miesięczny, tygodniowy i dzienny. Do wydarzeń można zapraszać uczestników.",
    steps: [
      "Dodaj wydarzenie, zadanie lub przypomnienie",
      "Wybierz datę, godzinę i czas trwania",
      "Opcjonalnie dodaj lokalizację, opis i uczestników",
      "Śledź zaplanowane działania w widoku tygodniowym lub miesięcznym",
    ],
  },
  {
    title: "7. Notatnik",
    desc: "Prosty notatnik do zapisywania pomysłów, uwag i informacji przy projektach. Notatki widoczne są tylko dla Ciebie. Każda notatka może zawierać tekst lub szkic — wbudowany szkicownik działa na komputerze, telefonie i tablecie. Gotowe notatki można archiwizować.",
    steps: [
      "Utwórz nową notatkę i nadaj jej tytuł",
      "Wpisz tekst lub przejdź do trybu szkicu i rysuj palcem lub rysorem",
      "Szkicownik działa na każdym urządzeniu — komputer, telefon, tablet",
      "Archiwizuj ukończone lub nieaktualne notatki",
    ],
  },
  {
    title: "8. Zadania",
    desc: "Moduł do zarządzania zadaniami projektanta. Możesz tworzyć zadania powiązane z projektami, przypisywać je do siebie lub innych osób, ustawiać priorytety i terminy oraz śledzić postęp w widoku listy lub tablicy kanban.",
    steps: [
      "Dodaj nowe zadanie z tytułem, opisem i terminem",
      "Przypisz zadanie do projektu i wybierz priorytet",
      "Śledź postęp — statusy: Do zrobienia, W trakcie, Gotowe",
      "Przeglądaj zadania w widoku listy lub tablicy kanban",
      "Dodawaj podzadania dla bardziej złożonych działań",
    ],
  },
  {
    title: "9. Generator 3D",
    desc: "Wkrótce dostępny w veedeck.",
    steps: [],
  },
];

/* ─── CLIENT PANEL ───────────────────────────────────────────────────────── */

interface Feature {
  icon: React.ReactNode;
  label: string;
  desc: string;
}

interface ClientModule {
  id: string;
  name: string;
  icon: React.ReactNode;
  desc: string;
  steps: string[];
  features: Feature[];
}

const CLIENT_MODULES: ClientModule[] = [
  {
    id: "renderflow",
    name: "RenderFlow — wizualizacje",
    icon: <PushPin size={22} />,
    desc: "Klient widzi wszystkie wizualizacje i pliki przesłane przez projektanta. Może je komentować — ogólnie lub bezpośrednio na renderze (pinezka), akceptować gotowe elementy i śledzić historię zmian.",
    steps: [
      "Otwiera projekt i przegląda pomieszczenia z wizualizacjami",
      "Klika na render, żeby zobaczyć go w pełnym rozmiarze",
      "Dodaje pinezkę w konkretnym miejscu lub zostawia ogólny komentarz",
      "Zatwierdza render lub prosi o zmiany",
      "Sprawdza historię wersji, jeśli projektant wgrał aktualizację",
    ],
    features: [
      { icon: <Pin size={16} />, label: "Pinezka", desc: "Kliknięcie na renderze dodaje komentarz w konkretnym miejscu" },
      { icon: <ChatBubble size={16} />, label: "Czat", desc: "Ogólna wiadomość dotycząca pliku" },
      { icon: <Check size={16} />, label: "Akceptuj", desc: "Klient zatwierdza render" },
      { icon: <History size={16} />, label: "Historia", desc: "Poprzednie wersje pliku" },
    ],
  },
  {
    id: "listy",
    name: "Listy zakupowe",
    icon: <LocalMall size={22} />,
    desc: "Klient przegląda zestawienie produktów, mebli i materiałów wybranych przez projektanta. Może sprawdzić szczegóły każdego produktu, kliknąć w link do sklepu, zatwierdzić lub odrzucić produkt i zostawić komentarz.",
    steps: [
      "Otwiera listę i przegląda sekcje z produktami",
      "Klika w produkt, żeby zobaczyć pełne szczegóły (cena, wymiary, czas dostawy)",
      "Używa linku, żeby otworzyć produkt w sklepie internetowym",
      "Zatwierdza lub odrzuca poszczególne produkty",
      "Dodaje komentarz lub pytanie do konkretnego produktu",
    ],
    features: [
      { icon: <Check size={16} />, label: "Zatwierdź", desc: "Klient akceptuje produkt" },
      { icon: <X size={16} />, label: "Odrzuć", desc: "Klient oznacza produkt do zmiany" },
      { icon: <Comment size={16} />, label: "Komentarz", desc: "Pytanie lub uwaga do produktu" },
      { icon: <ExternalLink size={16} />, label: "Link", desc: "Otwiera produkt w sklepie internetowym" },
    ],
  },
  {
    id: "dyskusje",
    name: "Dyskusje",
    icon: <ChatBubble size={22} />,
    desc: "Klient ma dostęp do bezpośredniego czatu z projektantem. Może pisać wiadomości, przesyłać zdjęcia inspiracji lub pomieszczenia, nagrywać głosówki i odpowiadać na konkretne wiadomości.",
    steps: [
      "Otwiera zakładkę Dyskusje",
      "Pisze wiadomość do projektanta",
      "Wysyła zdjęcia, dokumenty lub linki jako załącznik",
      "Nagrywa wiadomość głosową (przytrzymaj mikrofon)",
      "Odpowiada na konkretną wiadomość projektanta",
    ],
    features: [
      { icon: <Paperclip size={16} />, label: "Załącznik", desc: "Wysyłanie zdjęcia lub dokumentu" },
      { icon: <Mic size={16} />, label: "Głosówka", desc: "Nagrywanie i wysyłanie wiadomości głosowej" },
      { icon: <CornerDownLeft size={16} />, label: "Odpowiedz", desc: "Odpowiedź na konkretną wiadomość" },
    ],
  },
];

/* ─── PAGE ───────────────────────────────────────────────────────────────── */

export default function InstrukcjaPage() {
  const [tab, setTab] = useState<"designer" | "client">("designer");

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Instrukcja</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Przełącz widok, żeby zobaczyć jak działa platforma z perspektywy projektanta i klienta.
        </p>
      </div>

      {/* Tab switch */}
      <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1">
        <button
          onClick={() => setTab("designer")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "designer"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Panel projektanta
        </button>
        <button
          onClick={() => setTab("client")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "client"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Panel klienta
        </button>
      </div>

      {/* ── Designer panel ── */}
      {tab === "designer" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Poniżej opisany jest przepływ pracy w platformie — od dodania klienta, przez projekt i listy, aż po komunikację.
          </p>
          {DESIGNER_MODULES.map((mod, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {idx === 0 && <Users size={22} />}
                  {idx === 1 && <PushPin size={22} />}
                  {idx === 2 && <LocalMall size={22} />}
                  {idx === 3 && <ChatBubble size={22} />}
                  {idx === 4 && <Package size={22} />}
                  {idx === 5 && <CalendarDays size={22} />}
                  {idx === 6 && <NotebookText size={22} />}
                  {idx === 7 && <CheckSquare size={22} />}
                  {idx === 8 && <ViewInAr size={22} />}
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{mod.title}</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{mod.desc}</p>
                {mod.tips && mod.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
                    <span className="text-primary text-base leading-none mt-0.5">💡</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{tip}</p>
                  </div>
                ))}
                {mod.steps.length > 0 && <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Jak to zrobić</p>
                  <ul className="space-y-1.5">
                    {mod.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Client panel ── */}
      {tab === "client" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Tak wygląda platforma z perspektywy klienta — co widzi i co może zrobić w każdym module.
          </p>
          {CLIENT_MODULES.map((mod) => (
            <div key={mod.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {mod.icon}
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{mod.name}</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{mod.desc}</p>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Co widzi i robi klient</p>
                  <ul className="space-y-1.5">
                    {mod.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} className="text-primary" />
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dostępne funkcje</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mod.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                        <div className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-primary flex-shrink-0">
                          {f.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{f.label}</p>
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
