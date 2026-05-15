"use client";

import { useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, X,
  PushPin, LocalMall, Comment, ChatBubble,
  Pin, Check, ExternalLink, History,
  Paperclip, Mic, CornerDownLeft,
} from "@/components/ui/icons";

interface Feature {
  icon: React.ReactNode;
  label: string;
  desc: string;
}

interface ModuleInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  shortDesc: string;
  fullDesc: {
    general: string;
    designerTitle: string;
    designerSteps: string[];
    clientTitle: string;
    clientSteps: string[];
    features: Feature[];
  };
}

const ALL_MODULES: ModuleInfo[] = [
  {
    id: "renderflow",
    name: "RenderFlow",
    icon: <PushPin size={28} />,
    shortDesc: "Przeglądaj wizualizacje i pliki przygotowane przez projektanta. Komentuj i akceptuj gotowe elementy.",
    fullDesc: {
      general:
        "Moduł Rendery to miejsce, gdzie projektant umieszcza wizualizacje, zdjęcia i pliki PDF Twojego projektu. Możesz je przeglądać w dowolnym momencie, dodawać komentarze i zatwierdzać gotowe elementy.",
      designerTitle: "Co robi projektant",
      designerSteps: [
        "Przesyła pliki graficzne, rendery i dokumenty",
        "Organizuje pliki w pomieszczenia i foldery",
        "Udostępnia kolejne wersje projektu",
        "Zarządza statusem każdego pliku",
      ],
      clientTitle: "Co robisz Ty",
      clientSteps: [
        "Przeglądasz przesłane wizualizacje i pliki",
        "Dodajesz komentarze ogólne lub bezpośrednio na renderze (pinezka)",
        "Akceptujesz gotowe elementy projektu",
        "Śledzisz historię zmian i wersji",
      ],
      features: [
        { icon: <Pin size={18} />, label: "Pinezka", desc: "Kliknij na renderze, żeby dodać komentarz w konkretnym miejscu" },
        { icon: <ChatBubble size={18} />, label: "Czat", desc: "Napisz ogólną wiadomość dotyczącą tego pliku" },
        { icon: <Check size={18} />, label: "Akceptuj", desc: "Zatwierdź render gdy jesteś zadowolony/a z projektu" },
        { icon: <History size={18} />, label: "Historia", desc: "Sprawdź poprzednie wersje pliku" },
      ],
    },
  },
  {
    id: "listy",
    name: "Listy zakupowe",
    icon: <LocalMall size={28} />,
    shortDesc: "Sprawdzaj produkty i meble dobrane do Twojego projektu. Zatwierdź lub skomentuj każdy element.",
    fullDesc: {
      general:
        "Listy zakupowe to zestawienie produktów, mebli i materiałów wybranych przez projektanta. Możesz przeglądać szczegóły każdego produktu, sprawdzać ceny i linki do sklepów, a także zatwierdzać swoje wybory.",
      designerTitle: "Co robi projektant",
      designerSteps: [
        "Tworzy listy i dodaje produkty z linkami do sklepów",
        "Uzupełnia dane: cena, wymiary, kolor, czas dostawy",
        "Organizuje produkty w sekcje (np. Salon, Sypialnia)",
        "Aktualizuje listę w miarę postępów projektu",
      ],
      clientTitle: "Co robisz Ty",
      clientSteps: [
        "Przeglądasz produkty z pełnymi szczegółami",
        "Klikasz w link, żeby zobaczyć produkt w sklepie online",
        "Zatwierdzasz lub odrzucasz poszczególne produkty",
        "Dodajesz komentarze i pytania do konkretnych produktów",
      ],
      features: [
        { icon: <Check size={18} />, label: "Zatwierdź", desc: "Zaakceptuj produkt gdy Ci odpowiada" },
        { icon: <X size={18} />, label: "Odrzuć", desc: "Oznacz produkt do zmiany lub zastąpienia" },
        { icon: <Comment size={18} />, label: "Komentarz", desc: "Zadaj pytanie lub dodaj uwagę do konkretnego produktu" },
        { icon: <ExternalLink size={18} />, label: "Link", desc: "Otwórz produkt bezpośrednio w sklepie internetowym" },
      ],
    },
  },
  {
    id: "dyskusje",
    name: "Dyskusje",
    icon: <ChatBubble size={28} />,
    shortDesc: "Bezpośredni czat z projektantem. Zadawaj pytania, przesyłaj zdjęcia i śledź historię ustaleń.",
    fullDesc: {
      general:
        "Dyskusja to wbudowany komunikator, dzięki któremu możesz pisać bezpośrednio do projektanta. To idealne miejsce na pytania, szybkie ustalenia i przesyłanie materiałów inspiracyjnych.",
      designerTitle: "Co robi projektant",
      designerSteps: [
        "Odpowiada na Twoje pytania i komentarze",
        "Przesyła zdjęcia, dokumenty i linki",
        "Prowadzi historię komunikacji w jednym miejscu",
      ],
      clientTitle: "Co robisz Ty",
      clientSteps: [
        "Piszesz wiadomości bezpośrednio do projektanta",
        "Przesyłasz zdjęcia inspiracji lub zdjęcia pomieszczenia",
        "Nagrywasz wiadomości głosowe",
        "Czytasz i odpowiadasz na wiadomości projektanta",
      ],
      features: [
        { icon: <Paperclip size={18} />, label: "Załącznik", desc: "Wyślij zdjęcie lub dokument" },
        { icon: <Mic size={18} />, label: "Głosówka", desc: "Nagraj i wyślij wiadomość głosową" },
        { icon: <CornerDownLeft size={18} />, label: "Odpowiedz", desc: "Odpowiedz na konkretną wiadomość w wątku" },
      ],
    },
  },
];

interface Props {
  hiddenModules: string[];
  hasDiscussion: boolean;
}

export default function ModuleGuideSlider({ hiddenModules, hasDiscussion }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleInfo | null>(null);

  const visibleModules = ALL_MODULES.filter((m) => {
    if (hiddenModules.includes(m.id)) return false;
    if (m.id === "dyskusje" && !hasDiscussion) return false;
    return true;
  });

  if (visibleModules.length === 0) return null;

  function scrollBy(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  }

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Jak korzystać z platformy</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Poznaj moduły dostępne w Twoim projekcie</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scrollBy("left")}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy("right")}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Slider */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
      >
        {visibleModules.map((mod) => (
          <div
            key={mod.id}
            className="flex-shrink-0 w-[calc(100%-16px)] sm:w-72 bg-card border border-border rounded-2xl p-5 flex flex-col gap-3"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {mod.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{mod.name}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mod.shortDesc}</p>
            </div>
            <button
              onClick={() => setSelectedModule(mod)}
              className="self-start flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              Zobacz więcej <ChevronRight size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Dialog */}
      {selectedModule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedModule(null); }}
        >
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Dialog header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-background rounded-t-2xl z-10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                {selectedModule.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-gray-100">{selectedModule.name}</p>
                <p className="text-xs text-muted-foreground">Instrukcja modułu</p>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* General */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Informacje ogólne</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedModule.fullDesc.general}</p>
              </div>

              {/* Designer steps */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{selectedModule.fullDesc.designerTitle}</p>
                <ul className="space-y-1.5">
                  {selectedModule.fullDesc.designerSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Client steps */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{selectedModule.fullDesc.clientTitle}</p>
                <ul className="space-y-1.5">
                  {selectedModule.fullDesc.clientSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={11} className="text-primary" />
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature icons */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Przyciski i funkcje</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedModule.fullDesc.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-primary flex-shrink-0">
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
        </div>
      )}
    </div>
  );
}
