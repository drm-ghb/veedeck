export type QuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "rating"
  | "yes_no"
  | "budget_range";

export interface TemplateQuestion {
  label: string;
  type: QuestionType;
  required: boolean;
  description?: string;
  options?: string[];
  config?: Record<string, unknown>;
}

export interface TemplateSection {
  name: string;
  questions: TemplateQuestion[];
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
  /** Questions not in any section */
  questions: TemplateQuestion[];
}

export const surveyTemplates: SurveyTemplate[] = [
  {
    id: "kwalifikacja",
    name: "Kwalifikacja klienta",
    description: "Szybki filtr przed podjęciem współpracy. Diagnozuje dopasowanie klienta, kulturę decyzyjną i budżet zanim podpiszesz umowę.",
    sections: [],
    questions: [
      {
        label: "Jaki jest główny cel projektu?",
        type: "single_choice",
        required: true,
        options: ["Rezydencja własna", "Wynajem długoterminowy", "Wynajem krótkoterminowy (Airbnb)", "Przygotowanie do sprzedaży"],
      },
      {
        label: "Jaki jest planowany termin realizacji?",
        type: "single_choice",
        required: true,
        options: ["Do 3 miesięcy", "3–6 miesięcy", "6–12 miesięcy", "Powyżej roku", "Nie mam jeszcze daty"],
      },
      {
        label: "Czy data realizacji jest nieprzekraczalna?",
        type: "yes_no",
        required: true,
      },
      {
        label: "Kto podejmuje ostateczne decyzje dotyczące projektu?",
        type: "single_choice",
        required: true,
        options: ["Ja samodzielnie", "Wspólnie z partnerem/małżonkiem", "Z całą rodziną", "Decyzje wymagają wielu zatwierdzeń"],
      },
      {
        label: "Jak oceniasz swoją szybkość podejmowania decyzji?",
        type: "rating",
        required: true,
        config: { min: 1, max: 5 },
      },
      {
        label: "Co jest priorytetem w tym projekcie?",
        type: "multiple_choice",
        required: true,
        options: ["Funkcjonalność", "Wyjątkowy design", "Oszczędność kosztów", "Smart Home", "Ekologia i zrównoważony rozwój"],
      },
      {
        label: "Jaki jest orientacyjny budżet na cały projekt?",
        type: "budget_range",
        required: true,
        config: { min: 0, max: 500000, step: 5000 },
      },
      {
        label: "Czy budżet jest elastyczny?",
        type: "single_choice",
        required: true,
        options: ["Stały, nie do ruszenia", "Możliwa niewielka elastyczność (do 10%)", "Otwarty na propozycje projektanta"],
      },
      {
        label: "Czy miałeś/aś wcześniej doświadczenie z projektantem wnętrz?",
        type: "single_choice",
        required: false,
        options: ["To moja pierwsza współpraca", "Pozytywne doświadczenia", "Trudne doświadczenia", "Nie korzystałem/am"],
      },
      {
        label: "Co jest dla Ciebie najważniejsze we współpracy z projektantem?",
        type: "long_text",
        required: false,
      },
    ],
  },
  {
    id: "brief",
    name: "Brief projektowy",
    description: "Kompletny wywiad na początku współpracy — zakres projektu, domownicy, styl życia i budżet w jednym miejscu.",
    questions: [],
    sections: [
      {
        name: "O projekcie",
        questions: [
          {
            label: "Jakie pomieszczenia obejmuje projekt?",
            type: "multiple_choice",
            required: true,
            options: ["Salon", "Kuchnia", "Sypialnia główna", "Sypialnia gościnana", "Łazienka główna", "Łazienka gościnana", "Korytarz / Wejście", "Gabinet / Pokój do pracy", "Garderoba", "Pralnia", "Inne"],
          },
          {
            label: "Jaki jest stan lokalu?",
            type: "single_choice",
            required: true,
            options: ["Stan deweloperski (nowe)", "Do remontu kapitalnego", "Do odświeżenia", "Zmiana istniejącej aranżacji"],
          },
          {
            label: "Jaka jest powierzchnia lokalu?",
            type: "single_choice",
            required: true,
            options: ["Do 40 m²", "40–70 m²", "70–100 m²", "100–150 m²", "Powyżej 150 m²"],
          },
          {
            label: "Jaki jest planowany termin zakończenia projektu?",
            type: "single_choice",
            required: true,
            options: ["Do 3 miesięcy", "3–6 miesięcy", "6–12 miesięcy", "Powyżej roku", "Data jest elastyczna"],
          },
        ],
      },
      {
        name: "Domownicy i styl życia",
        questions: [
          {
            label: "Ile osób będzie mieszkać w lokalu?",
            type: "single_choice",
            required: true,
            options: ["1 osoba", "2 osoby", "3 osoby", "4 osoby", "5 i więcej"],
          },
          {
            label: "Czy w domu są lub planowane są dzieci?",
            type: "single_choice",
            required: true,
            options: ["Nie", "Małe dzieci (0–6 lat)", "Dzieci szkolne (7–12 lat)", "Nastolatki", "Planujemy powiększenie rodziny"],
          },
          {
            label: "Czy macie zwierzęta domowe?",
            type: "multiple_choice",
            required: true,
            options: ["Nie mamy", "Pies", "Kot", "Inne zwierzęta"],
          },
          {
            label: "Czy ktoś pracuje zdalnie z domu?",
            type: "yes_no",
            required: true,
          },
          {
            label: "Jakie hobby lub aktywności wymagają specjalnego miejsca?",
            type: "multiple_choice",
            required: false,
            options: ["Sport / siłownia domowa", "Muzyka", "Kolekcje", "Praca artystyczna", "Gotowanie / pieczenie", "Ogrodnictwo / rośliny", "Żadne szczególne"],
          },
        ],
      },
      {
        name: "Budżet",
        questions: [
          {
            label: "Jaki jest całkowity budżet na projekt?",
            type: "budget_range",
            required: true,
            config: { min: 0, max: 500000, step: 5000 },
          },
          {
            label: "Czy budżet obejmuje meble i dekoracje?",
            type: "yes_no",
            required: true,
          },
          {
            label: "Co jest priorytetem, gdyby budżet okazał się za mały?",
            type: "single_choice",
            required: true,
            options: ["Utrzymać jakość materiałów, ograniczyć zakres", "Tańsze zamienniki, ten sam efekt wizualny", "Podzielić projekt na etapy", "Zdecyduję w trakcie"],
          },
          {
            label: "Dodatkowe informacje lub pytania dla projektanta",
            type: "long_text",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "styl",
    name: "Preferencje stylistyczne",
    description: "Głęboki wywiad estetyczny — kierunek wizualny, materiały, paleta kolorów i inspiracje przed opracowaniem konceptu.",
    questions: [],
    sections: [
      {
        name: "Styl i kolorystyka",
        questions: [
          {
            label: "Jakie style wnętrzarskie najbardziej Ci odpowiadają?",
            type: "multiple_choice",
            required: true,
            options: ["Minimalistyczny", "Skandynawski", "Japandi", "Klasyczny / Hampton", "Industrialny", "Nowoczesny", "Boho", "Prowansalski", "Art Deco", "Nie mam jasnych preferencji"],
          },
          {
            label: "Opisz idealne wnętrze trzema słowami",
            type: "short_text",
            required: true,
          },
          {
            label: "Preferowana kolorystyka wnętrza",
            type: "single_choice",
            required: true,
            options: ["Biała / jasna / neutralna", "Ciepłe beże i ziemiste", "Szarości i chłodne tony", "Głębokie, ciemne kolory", "Żywe akcenty kolorystyczne", "Pastelowe"],
          },
          {
            label: "Czy są kolory, których absolutnie nie chcesz w mieszkaniu?",
            type: "long_text",
            required: false,
          },
          {
            label: "Stosunek do materiałów naturalnych vs. imitacji",
            type: "single_choice",
            required: true,
            options: ["Wymagam wyłącznie naturalnych (kamień, drewno, len)", "Preferuję naturalne, akceptuję wybrane imitacje", "Dobra imitacja jest OK — liczy się efekt końcowy", "Bez preferencji"],
          },
        ],
      },
      {
        name: "Detale i inspiracje",
        questions: [
          {
            label: "Fronty meblowe — preferowana estetyka",
            type: "single_choice",
            required: false,
            options: ["Gładkie, bez zdobień (modern/minimal)", "Frezowane (classic)", "Ryflowane", "Drewno naturalne", "Mieszane", "Bez preferencji"],
          },
          {
            label: "Uchwyty meblowe",
            type: "single_choice",
            required: false,
            options: ["Tradycyjne uchwyty", "Bezuchwytowe (push-to-open / Tip-on)", "Bez preferencji"],
          },
          {
            label: "Materiały lub elementy, których chcesz unikać",
            type: "multiple_choice",
            required: false,
            options: ["Połysk na frontach", "Złote / mosiążne akcenty", "Surowy, nieotynkowany beton", "Plastik widoczny w dekorze", "Ciemne drewno", "Nic szczególnego"],
          },
          {
            label: "Czy priorytetem są materiały ekologiczne i certyfikowane?",
            type: "yes_no",
            required: false,
          },
          {
            label: "Link do tablicy na Pintereście lub Homebook (jeśli masz)",
            type: "short_text",
            required: false,
          },
          {
            label: "Czego absolutnie nie chcesz w swoim wnętrzu?",
            type: "long_text",
            required: false,
          },
          {
            label: "Podziel się inspiracjami (max. 5 plików).",
            type: "long_text",
            required: false,
            config: { allowAttachments: true, maxAttachments: 5 },
          },
        ],
      },
    ],
  },
  {
    id: "techniczna",
    name: "Specyfikacja techniczna",
    description: "Twarde dane instalacyjne i sprzętowe — kuchnia, łazienka, sypialnia, Smart Home. Eliminuje niespodzianki techniczne na późnym etapie projektu.",
    questions: [],
    sections: [
      {
        name: "Instalacje i technologie",
        questions: [
          {
            label: "Zakres systemu Smart Home",
            type: "single_choice",
            required: true,
            options: ["Nie planuję", "Podstawowy (sterowanie oświetleniem)", "Rozszerzony (oświetlenie + ogrzewanie + rolety)", "Kompleksowy (pełna automatyka)"],
          },
          {
            label: "Czy planujesz klimatyzację?",
            type: "yes_no",
            required: true,
          },
          {
            label: "Czy planujesz rekuperację (wentylację mechaniczną)?",
            type: "yes_no",
            required: true,
          },
          {
            label: "Czy planujesz fotowoltaikę lub pompę ciepła?",
            type: "yes_no",
            required: false,
          },
          {
            label: "Czy potrzebujesz wyciszenia konkretnych ścian?",
            type: "single_choice",
            required: false,
            options: ["Nie", "Izolacja od sąsiadów", "Strefa ciszy w sypialni", "Gabinet lub sala muzyczna", "Kilka stref"],
          },
          {
            label: "Czy dopuszczasz zmiany konstrukcyjne (wyburzenia ścian, zmiana otworów)?",
            type: "yes_no",
            required: true,
          },
        ],
      },
      {
        name: "Kuchnia i pralnia",
        questions: [
          {
            label: "Typ lodówki",
            type: "single_choice",
            required: false,
            options: ["Do zabudowy", "Wolnostojąca standardowa", "Side-by-Side", "Lodówka + oddzielna zamrażarka", "Lodówka na wino jako dodatkowa"],
          },
          {
            label: "Niezbędne urządzenia do zaplanowania w kuchni",
            type: "multiple_choice",
            required: false,
            options: ["Ekspres do kawy", "Duży robot kuchenny", "Piekarnik parowy", "Mikrofalówka do zabudowy", "Zmywarka", "Okap wyspowy", "Rozdrabniacz odpadów (młynek w zlewie)"],
          },
          {
            label: "Ile urządzeń piorących potrzebujesz?",
            type: "single_choice",
            required: false,
            options: ["Jedna pralka", "Pralka + suszarka w kolumnie", "Pralka + suszarka obok siebie", "Dwie osobne pralki"],
          },
        ],
      },
      {
        name: "Łazienka i sypialnia",
        questions: [
          {
            label: "Wanna czy prysznic?",
            type: "single_choice",
            required: false,
            options: ["Tylko prysznic walk-in", "Tylko wanna", "Wanna + oddzielny prysznic walk-in", "Bez preferencji"],
          },
          {
            label: "Miska WC",
            type: "single_choice",
            required: false,
            options: ["Wisząca (stelaż w ścianie)", "Stojąca", "Bez preferencji"],
          },
          {
            label: "Czy potrzebujesz bidetu lub funkcji bidet w WC?",
            type: "yes_no",
            required: false,
          },
          {
            label: "Wymiar materaca w sypialni",
            type: "single_choice",
            required: false,
            options: ["80×200 (pojedyncze)", "160×200", "180×200", "200×200", "Jeszcze nie wiem"],
          },
          {
            label: "Czy w sypialni ma być telewizor?",
            type: "yes_no",
            required: false,
          },
          {
            label: "Garderoba",
            type: "single_choice",
            required: false,
            options: ["Nie potrzebuję osobnej garderoby", "Walk-in garderoba", "Szafy wnękowe", "Szafy wolnostojące"],
          },
        ],
      },
    ],
  },
  {
    id: "ocena",
    name: "Ocena współpracy",
    description: "Ankieta satysfakcji po zakończeniu projektu. Zbiera oceny, feedback i zgodę na portfolio.",
    sections: [],
    questions: [
      {
        label: "Jak ogólnie oceniasz nasze studio?",
        type: "rating",
        required: true,
        config: { min: 1, max: 5 },
      },
      {
        label: "Jak oceniasz jakość komunikacji w trakcie projektu?",
        type: "rating",
        required: true,
        config: { min: 1, max: 5 },
      },
      {
        label: "Jak oceniasz terminowość naszych działań?",
        type: "rating",
        required: true,
        config: { min: 1, max: 5 },
      },
      {
        label: "Czy projekt spełnił Twoje oczekiwania estetyczne?",
        type: "single_choice",
        required: true,
        options: ["Przekroczył oczekiwania", "W pełni spełnił", "Częściowo spełnił", "Nie spełnił"],
      },
      {
        label: "Czy projekt spełnił Twoje oczekiwania funkcjonalne?",
        type: "single_choice",
        required: true,
        options: ["Przekroczył oczekiwania", "W pełni spełnił", "Częściowo spełnił", "Nie spełnił"],
      },
      {
        label: "Co było najlepszym elementem naszej współpracy?",
        type: "long_text",
        required: false,
      },
      {
        label: "Co moglibyśmy zrobić lepiej?",
        type: "long_text",
        required: false,
      },
      {
        label: "Czy poleciłbyś/poleciłabyś nasze studio znajomym?",
        type: "single_choice",
        required: true,
        options: ["Zdecydowanie tak", "Raczej tak", "Nie wiem", "Raczej nie"],
      },
      {
        label: "Czy zgadzasz się na wykorzystanie zdjęć projektu w naszym portfolio?",
        type: "yes_no",
        required: true,
      },
    ],
  },
];
