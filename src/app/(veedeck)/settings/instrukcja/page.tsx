import {
  PushPin, LocalMall, Comment, ChatBubble,
  Pin, Check, ExternalLink, History,
  Paperclip, Mic, CornerDownLeft, X,
} from "@/components/ui/icons";

interface Feature {
  icon: React.ReactNode;
  label: string;
  desc: string;
}

interface ModuleSection {
  id: string;
  name: string;
  icon: React.ReactNode;
  general: string;
  designerTitle: string;
  designerSteps: string[];
  clientTitle: string;
  clientSteps: string[];
  features: Feature[];
}

const MODULES: ModuleSection[] = [
  {
    id: "renderflow",
    name: "RenderFlow",
    icon: <PushPin size={22} />,
    general:
      "Moduł Rendery to miejsce, gdzie projektant umieszcza wizualizacje, zdjęcia i pliki PDF projektu. Klient może je przeglądać w dowolnym momencie, dodawać komentarze i zatwierdzać gotowe elementy.",
    designerTitle: "Co robi projektant",
    designerSteps: [
      "Przesyła pliki graficzne, rendery i dokumenty",
      "Organizuje pliki w pomieszczenia i foldery",
      "Udostępnia kolejne wersje projektu",
      "Zarządza statusem każdego pliku",
    ],
    clientTitle: "Co robi klient",
    clientSteps: [
      "Przegląda przesłane wizualizacje i pliki",
      "Dodaje komentarze ogólne lub bezpośrednio na renderze (pinezka)",
      "Akceptuje gotowe elementy projektu",
      "Śledzi historię zmian i wersji",
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
    general:
      "Listy zakupowe to zestawienie produktów, mebli i materiałów wybranych przez projektanta. Klient może przeglądać szczegóły każdego produktu, sprawdzać ceny i linki do sklepów, a także zatwierdzać swoje wybory.",
    designerTitle: "Co robi projektant",
    designerSteps: [
      "Tworzy listy i dodaje produkty z linkami do sklepów",
      "Uzupełnia dane: cena, wymiary, kolor, czas dostawy",
      "Organizuje produkty w sekcje (np. Salon, Sypialnia)",
      "Aktualizuje listę w miarę postępów projektu",
    ],
    clientTitle: "Co robi klient",
    clientSteps: [
      "Przegląda produkty z pełnymi szczegółami",
      "Klika w link, żeby zobaczyć produkt w sklepie online",
      "Zatwierdza lub odrzuca poszczególne produkty",
      "Dodaje komentarze i pytania do konkretnych produktów",
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
    general:
      "Dyskusja to wbudowany komunikator między projektantem a klientem. Idealne miejsce na pytania, szybkie ustalenia i przesyłanie materiałów inspiracyjnych.",
    designerTitle: "Co robi projektant",
    designerSteps: [
      "Odpowiada na pytania i komentarze klienta",
      "Przesyła zdjęcia, dokumenty i linki",
      "Prowadzi historię komunikacji w jednym miejscu",
    ],
    clientTitle: "Co robi klient",
    clientSteps: [
      "Pisze wiadomości bezpośrednio do projektanta",
      "Przesyła zdjęcia inspiracji lub zdjęcia pomieszczenia",
      "Nagrywa wiadomości głosowe",
      "Czyta i odpowiada na wiadomości projektanta",
    ],
    features: [
      { icon: <Paperclip size={16} />, label: "Załącznik", desc: "Wysyłanie zdjęcia lub dokumentu" },
      { icon: <Mic size={16} />, label: "Głosówka", desc: "Nagrywanie i wysyłanie wiadomości głosowej" },
      { icon: <CornerDownLeft size={16} />, label: "Odpowiedz", desc: "Odpowiedź na konkretną wiadomość" },
    ],
  },
];

export default function InstrukcjaPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Instrukcja dla klienta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ta instrukcja jest wyświetlana klientom na dashboardzie projektu. Pokazuje im jak korzystać z każdego modułu platformy.
        </p>
      </div>

      {MODULES.map((mod) => (
        <div key={mod.id} className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Module header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {mod.icon}
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{mod.name}</h2>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* General */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Informacje ogólne</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{mod.general}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Designer steps */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{mod.designerTitle}</p>
                <ul className="space-y-1.5">
                  {mod.designerSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Client steps */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{mod.clientTitle}</p>
                <ul className="space-y-1.5">
                  {mod.clientSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={9} className="text-primary" />
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Features */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Przyciski i funkcje widoczne dla klienta</p>
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
  );
}
