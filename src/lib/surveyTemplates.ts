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

type Lang = "pl" | "en";

interface I18nQuestion {
  label: Record<Lang, string>;
  type: QuestionType;
  required: boolean;
  description?: Record<Lang, string>;
  options?: Record<Lang, string[]>;
  config?: Record<string, unknown>;
}

interface I18nSection {
  name: Record<Lang, string>;
  questions: I18nQuestion[];
}

interface I18nTemplate {
  id: string;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  sections: I18nSection[];
  questions: I18nQuestion[];
}

function resolveQuestion(q: I18nQuestion, lang: Lang): TemplateQuestion {
  return {
    label: q.label[lang],
    type: q.type,
    required: q.required,
    ...(q.description ? { description: q.description[lang] } : {}),
    ...(q.options ? { options: q.options[lang] } : {}),
    ...(q.config ? { config: q.config } : {}),
  };
}

function resolveTemplate(t: I18nTemplate, lang: Lang): SurveyTemplate {
  return {
    id: t.id,
    name: t.name[lang],
    description: t.description[lang],
    sections: t.sections.map((s) => ({
      name: s.name[lang],
      questions: s.questions.map((q) => resolveQuestion(q, lang)),
    })),
    questions: t.questions.map((q) => resolveQuestion(q, lang)),
  };
}

const i18nTemplates: I18nTemplate[] = [
  {
    id: "kwalifikacja",
    name: { pl: "Kwalifikacja klienta", en: "Client Qualification" },
    description: {
      pl: "Szybki filtr przed podjęciem współpracy. Diagnozuje dopasowanie klienta, kulturę decyzyjną i budżet zanim podpiszesz umowę.",
      en: "A quick filter before starting a collaboration. Assesses client fit, decision-making style, and budget before signing a contract.",
    },
    sections: [],
    questions: [
      {
        label: { pl: "Jaki jest główny cel projektu?", en: "What is the main goal of the project?" },
        type: "single_choice",
        required: true,
        options: {
          pl: ["Rezydencja własna", "Wynajem długoterminowy", "Wynajem krótkoterminowy (Airbnb)", "Przygotowanie do sprzedaży"],
          en: ["Private residence", "Long-term rental", "Short-term rental (Airbnb)", "Preparing for sale"],
        },
      },
      {
        label: { pl: "Jaki jest planowany termin realizacji?", en: "What is the planned timeline?" },
        type: "single_choice",
        required: true,
        options: {
          pl: ["Do 3 miesięcy", "3–6 miesięcy", "6–12 miesięcy", "Powyżej roku", "Nie mam jeszcze daty"],
          en: ["Within 3 months", "3–6 months", "6–12 months", "Over a year", "No date yet"],
        },
      },
      {
        label: { pl: "Czy data realizacji jest nieprzekraczalna?", en: "Is the deadline non-negotiable?" },
        type: "yes_no",
        required: true,
      },
      {
        label: { pl: "Kto podejmuje ostateczne decyzje dotyczące projektu?", en: "Who makes the final decisions about the project?" },
        type: "single_choice",
        required: true,
        options: {
          pl: ["Ja samodzielnie", "Wspólnie z partnerem/małżonkiem", "Z całą rodziną", "Decyzje wymagają wielu zatwierdzeń"],
          en: ["Myself", "Together with partner/spouse", "With the whole family", "Decisions require multiple approvals"],
        },
      },
      {
        label: { pl: "Jak oceniasz swoją szybkość podejmowania decyzji?", en: "How would you rate your decision-making speed?" },
        type: "rating",
        required: true,
        config: { min: 1, max: 5 },
      },
      {
        label: { pl: "Co jest priorytetem w tym projekcie?", en: "What is the priority in this project?" },
        type: "multiple_choice",
        required: true,
        options: {
          pl: ["Funkcjonalność", "Wyjątkowy design", "Oszczędność kosztów", "Smart Home", "Ekologia i zrównoważony rozwój"],
          en: ["Functionality", "Exceptional design", "Cost savings", "Smart Home", "Ecology and sustainability"],
        },
      },
      {
        label: { pl: "Jaki jest orientacyjny budżet na cały projekt?", en: "What is the approximate budget for the entire project?" },
        type: "budget_range",
        required: true,
        config: { min: 0, max: 500000, step: 5000 },
      },
      {
        label: { pl: "Czy budżet jest elastyczny?", en: "Is the budget flexible?" },
        type: "single_choice",
        required: true,
        options: {
          pl: ["Stały, nie do ruszenia", "Możliwa niewielka elastyczność (do 10%)", "Otwarty na propozycje projektanta"],
          en: ["Fixed, non-negotiable", "Slight flexibility possible (up to 10%)", "Open to designer suggestions"],
        },
      },
      {
        label: { pl: "Czy miałeś/aś wcześniej doświadczenie z projektantem wnętrz?", en: "Have you had previous experience with an interior designer?" },
        type: "single_choice",
        required: false,
        options: {
          pl: ["To moja pierwsza współpraca", "Pozytywne doświadczenia", "Trudne doświadczenia", "Nie korzystałem/am"],
          en: ["This is my first collaboration", "Positive experiences", "Difficult experiences", "Never used one"],
        },
      },
      {
        label: { pl: "Co jest dla Ciebie najważniejsze we współpracy z projektantem?", en: "What is most important to you in working with a designer?" },
        type: "long_text",
        required: false,
      },
    ],
  },
  {
    id: "brief",
    name: { pl: "Brief projektowy", en: "Project Brief" },
    description: {
      pl: "Kompletny wywiad na początku współpracy — zakres projektu, domownicy, styl życia i budżet w jednym miejscu.",
      en: "A complete interview at the start of collaboration — project scope, household, lifestyle, and budget all in one place.",
    },
    questions: [],
    sections: [
      {
        name: { pl: "O projekcie", en: "About the project" },
        questions: [
          {
            label: { pl: "Jakie pomieszczenia obejmuje projekt?", en: "Which rooms does the project include?" },
            type: "multiple_choice",
            required: true,
            options: {
              pl: ["Salon", "Kuchnia", "Sypialnia główna", "Sypialnia gościnana", "Łazienka główna", "Łazienka gościnana", "Korytarz / Wejście", "Gabinet / Pokój do pracy", "Garderoba", "Pralnia", "Inne"],
              en: ["Living room", "Kitchen", "Master bedroom", "Guest bedroom", "Main bathroom", "Guest bathroom", "Hallway / Entrance", "Home office", "Walk-in closet", "Laundry room", "Other"],
            },
          },
          {
            label: { pl: "Jaki jest stan lokalu?", en: "What is the current condition of the property?" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["Stan deweloperski (nowe)", "Do remontu kapitalnego", "Do odświeżenia", "Zmiana istniejącej aranżacji"],
              en: ["Shell condition (new)", "Requires full renovation", "Needs refreshing", "Redesigning existing layout"],
            },
          },
          {
            label: { pl: "Jaka jest powierzchnia lokalu?", en: "What is the area of the property?" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["Do 40 m²", "40–70 m²", "70–100 m²", "100–150 m²", "Powyżej 150 m²"],
              en: ["Up to 40 m²", "40–70 m²", "70–100 m²", "100–150 m²", "Over 150 m²"],
            },
          },
          {
            label: { pl: "Jaki jest planowany termin zakończenia projektu?", en: "What is the planned project completion date?" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["Do 3 miesięcy", "3–6 miesięcy", "6–12 miesięcy", "Powyżej roku", "Data jest elastyczna"],
              en: ["Within 3 months", "3–6 months", "6–12 months", "Over a year", "Date is flexible"],
            },
          },
        ],
      },
      {
        name: { pl: "Domownicy i styl życia", en: "Household & lifestyle" },
        questions: [
          {
            label: { pl: "Ile osób będzie mieszkać w lokalu?", en: "How many people will live in the property?" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["1 osoba", "2 osoby", "3 osoby", "4 osoby", "5 i więcej"],
              en: ["1 person", "2 people", "3 people", "4 people", "5 or more"],
            },
          },
          {
            label: { pl: "Czy w domu są lub planowane są dzieci?", en: "Are there or will there be children in the household?" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["Nie", "Małe dzieci (0–6 lat)", "Dzieci szkolne (7–12 lat)", "Nastolatki", "Planujemy powiększenie rodziny"],
              en: ["No", "Young children (0–6 years)", "School-age children (7–12 years)", "Teenagers", "Planning to expand the family"],
            },
          },
          {
            label: { pl: "Czy macie zwierzęta domowe?", en: "Do you have pets?" },
            type: "multiple_choice",
            required: true,
            options: {
              pl: ["Nie mamy", "Pies", "Kot", "Inne zwierzęta"],
              en: ["No pets", "Dog", "Cat", "Other animals"],
            },
          },
          {
            label: { pl: "Czy ktoś pracuje zdalnie z domu?", en: "Does anyone work remotely from home?" },
            type: "yes_no",
            required: true,
          },
          {
            label: { pl: "Jakie hobby lub aktywności wymagają specjalnego miejsca?", en: "What hobbies or activities require a dedicated space?" },
            type: "multiple_choice",
            required: false,
            options: {
              pl: ["Sport / siłownia domowa", "Muzyka", "Kolekcje", "Praca artystyczna", "Gotowanie / pieczenie", "Ogrodnictwo / rośliny", "Żadne szczególne"],
              en: ["Sports / home gym", "Music", "Collections", "Art/craft", "Cooking / baking", "Gardening / plants", "Nothing in particular"],
            },
          },
        ],
      },
      {
        name: { pl: "Budżet", en: "Budget" },
        questions: [
          {
            label: { pl: "Jaki jest całkowity budżet na projekt?", en: "What is the total budget for the project?" },
            type: "budget_range",
            required: true,
            config: { min: 0, max: 500000, step: 5000 },
          },
          {
            label: { pl: "Czy budżet obejmuje meble i dekoracje?", en: "Does the budget include furniture and decorations?" },
            type: "yes_no",
            required: true,
          },
          {
            label: { pl: "Co jest priorytetem, gdyby budżet okazał się za mały?", en: "What is the priority if the budget turns out to be too small?" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["Utrzymać jakość materiałów, ograniczyć zakres", "Tańsze zamienniki, ten sam efekt wizualny", "Podzielić projekt na etapy", "Zdecyduję w trakcie"],
              en: ["Maintain material quality, reduce scope", "Cheaper alternatives, same visual effect", "Split the project into phases", "Will decide during the process"],
            },
          },
          {
            label: { pl: "Dodatkowe informacje lub pytania dla projektanta", en: "Additional information or questions for the designer" },
            type: "long_text",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "styl",
    name: { pl: "Preferencje stylistyczne", en: "Style Preferences" },
    description: {
      pl: "Głęboki wywiad estetyczny — kierunek wizualny, materiały, paleta kolorów i inspiracje przed opracowaniem konceptu.",
      en: "An in-depth aesthetic interview — visual direction, materials, color palette, and inspiration before developing the concept.",
    },
    questions: [],
    sections: [
      {
        name: { pl: "Styl i kolorystyka", en: "Style & colors" },
        questions: [
          {
            label: { pl: "Jakie style wnętrzarskie najbardziej Ci odpowiadają?", en: "Which interior styles appeal to you the most?" },
            type: "multiple_choice",
            required: true,
            options: {
              pl: ["Minimalistyczny", "Skandynawski", "Japandi", "Klasyczny / Hampton", "Industrialny", "Nowoczesny", "Boho", "Prowansalski", "Art Deco", "Nie mam jasnych preferencji"],
              en: ["Minimalist", "Scandinavian", "Japandi", "Classic / Hampton", "Industrial", "Modern", "Boho", "Provençal", "Art Deco", "No clear preference"],
            },
          },
          {
            label: { pl: "Opisz idealne wnętrze trzema słowami", en: "Describe your ideal interior in three words" },
            type: "short_text",
            required: true,
          },
          {
            label: { pl: "Preferowana kolorystyka wnętrza", en: "Preferred interior color palette" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["Biała / jasna / neutralna", "Ciepłe beże i ziemiste", "Szarości i chłodne tony", "Głębokie, ciemne kolory", "Żywe akcenty kolorystyczne", "Pastelowe"],
              en: ["White / light / neutral", "Warm beiges and earthy tones", "Greys and cool tones", "Deep, dark colors", "Vibrant color accents", "Pastels"],
            },
          },
          {
            label: { pl: "Czy są kolory, których absolutnie nie chcesz w mieszkaniu?", en: "Are there any colors you absolutely don't want in your home?" },
            type: "long_text",
            required: false,
          },
          {
            label: { pl: "Stosunek do materiałów naturalnych vs. imitacji", en: "Your attitude towards natural materials vs. imitations" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["Wymagam wyłącznie naturalnych (kamień, drewno, len)", "Preferuję naturalne, akceptuję wybrane imitacje", "Dobra imitacja jest OK — liczy się efekt końcowy", "Bez preferencji"],
              en: ["I require only natural (stone, wood, linen)", "I prefer natural, accept selected imitations", "Good imitation is OK — the final effect matters", "No preference"],
            },
          },
        ],
      },
      {
        name: { pl: "Detale i inspiracje", en: "Details & inspiration" },
        questions: [
          {
            label: { pl: "Fronty meblowe — preferowana estetyka", en: "Cabinet fronts — preferred aesthetic" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["Gładkie, bez zdobień (modern/minimal)", "Frezowane (classic)", "Ryflowane", "Drewno naturalne", "Mieszane", "Bez preferencji"],
              en: ["Smooth, no ornamentation (modern/minimal)", "Routed (classic)", "Fluted", "Natural wood", "Mixed", "No preference"],
            },
          },
          {
            label: { pl: "Uchwyty meblowe", en: "Cabinet handles" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["Tradycyjne uchwyty", "Bezuchwytowe (push-to-open / Tip-on)", "Bez preferencji"],
              en: ["Traditional handles", "Handleless (push-to-open / Tip-on)", "No preference"],
            },
          },
          {
            label: { pl: "Materiały lub elementy, których chcesz unikać", en: "Materials or elements you want to avoid" },
            type: "multiple_choice",
            required: false,
            options: {
              pl: ["Połysk na frontach", "Złote / mosiążne akcenty", "Surowy, nieotynkowany beton", "Plastik widoczny w dekorze", "Ciemne drewno", "Nic szczególnego"],
              en: ["Glossy fronts", "Gold / brass accents", "Raw, unplastered concrete", "Visible plastic in decor", "Dark wood", "Nothing in particular"],
            },
          },
          {
            label: { pl: "Czy priorytetem są materiały ekologiczne i certyfikowane?", en: "Are eco-friendly and certified materials a priority?" },
            type: "yes_no",
            required: false,
          },
          {
            label: { pl: "Link do tablicy na Pintereście lub Homebook (jeśli masz)", en: "Link to your Pinterest or Homebook board (if you have one)" },
            type: "short_text",
            required: false,
          },
          {
            label: { pl: "Czego absolutnie nie chcesz w swoim wnętrzu?", en: "What do you absolutely not want in your interior?" },
            type: "long_text",
            required: false,
          },
          {
            label: { pl: "Podziel się inspiracjami (max. 5 plików).", en: "Share your inspirations (max. 5 files)." },
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
    name: { pl: "Specyfikacja techniczna", en: "Technical Specification" },
    description: {
      pl: "Twarde dane instalacyjne i sprzętowe — kuchnia, łazienka, sypialnia, Smart Home. Eliminuje niespodzianki techniczne na późnym etapie projektu.",
      en: "Hard installation and equipment data — kitchen, bathroom, bedroom, Smart Home. Eliminates technical surprises at later project stages.",
    },
    questions: [],
    sections: [
      {
        name: { pl: "Instalacje i technologie", en: "Installations & technology" },
        questions: [
          {
            label: { pl: "Zakres systemu Smart Home", en: "Smart Home system scope" },
            type: "single_choice",
            required: true,
            options: {
              pl: ["Nie planuję", "Podstawowy (sterowanie oświetleniem)", "Rozszerzony (oświetlenie + ogrzewanie + rolety)", "Kompleksowy (pełna automatyka)"],
              en: ["Not planned", "Basic (lighting control)", "Extended (lighting + heating + blinds)", "Comprehensive (full automation)"],
            },
          },
          {
            label: { pl: "Czy planujesz klimatyzację?", en: "Do you plan to install air conditioning?" },
            type: "yes_no",
            required: true,
          },
          {
            label: { pl: "Czy planujesz rekuperację (wentylację mechaniczną)?", en: "Do you plan heat recovery ventilation (HRV)?" },
            type: "yes_no",
            required: true,
          },
          {
            label: { pl: "Czy planujesz fotowoltaikę lub pompę ciepła?", en: "Do you plan solar panels or a heat pump?" },
            type: "yes_no",
            required: false,
          },
          {
            label: { pl: "Czy potrzebujesz wyciszenia konkretnych ścian?", en: "Do you need soundproofing for specific walls?" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["Nie", "Izolacja od sąsiadów", "Strefa ciszy w sypialni", "Gabinet lub sala muzyczna", "Kilka stref"],
              en: ["No", "Insulation from neighbors", "Quiet zone in bedroom", "Home office or music room", "Multiple zones"],
            },
          },
          {
            label: { pl: "Czy dopuszczasz zmiany konstrukcyjne (wyburzenia ścian, zmiana otworów)?", en: "Do you allow structural changes (wall demolition, changing openings)?" },
            type: "yes_no",
            required: true,
          },
        ],
      },
      {
        name: { pl: "Kuchnia i pralnia", en: "Kitchen & laundry" },
        questions: [
          {
            label: { pl: "Typ lodówki", en: "Refrigerator type" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["Do zabudowy", "Wolnostojąca standardowa", "Side-by-Side", "Lodówka + oddzielna zamrażarka", "Lodówka na wino jako dodatkowa"],
              en: ["Built-in", "Freestanding standard", "Side-by-Side", "Fridge + separate freezer", "Wine fridge as additional"],
            },
          },
          {
            label: { pl: "Niezbędne urządzenia do zaplanowania w kuchni", en: "Essential appliances to plan in the kitchen" },
            type: "multiple_choice",
            required: false,
            options: {
              pl: ["Ekspres do kawy", "Duży robot kuchenny", "Piekarnik parowy", "Mikrofalówka do zabudowy", "Zmywarka", "Okap wyspowy", "Rozdrabniacz odpadów (młynek w zlewie)"],
              en: ["Coffee machine", "Large food processor", "Steam oven", "Built-in microwave", "Dishwasher", "Island hood", "Garbage disposal (sink grinder)"],
            },
          },
          {
            label: { pl: "Ile urządzeń piorących potrzebujesz?", en: "How many laundry appliances do you need?" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["Jedna pralka", "Pralka + suszarka w kolumnie", "Pralka + suszarka obok siebie", "Dwie osobne pralki"],
              en: ["One washing machine", "Washer + dryer in stack", "Washer + dryer side by side", "Two separate washers"],
            },
          },
        ],
      },
      {
        name: { pl: "Łazienka i sypialnia", en: "Bathroom & bedroom" },
        questions: [
          {
            label: { pl: "Wanna czy prysznic?", en: "Bathtub or shower?" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["Tylko prysznic walk-in", "Tylko wanna", "Wanna + oddzielny prysznic walk-in", "Bez preferencji"],
              en: ["Walk-in shower only", "Bathtub only", "Bathtub + separate walk-in shower", "No preference"],
            },
          },
          {
            label: { pl: "Miska WC", en: "Toilet type" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["Wisząca (stelaż w ścianie)", "Stojąca", "Bez preferencji"],
              en: ["Wall-hung (concealed frame)", "Floor-standing", "No preference"],
            },
          },
          {
            label: { pl: "Czy potrzebujesz bidetu lub funkcji bidet w WC?", en: "Do you need a bidet or bidet function in the toilet?" },
            type: "yes_no",
            required: false,
          },
          {
            label: { pl: "Wymiar materaca w sypialni", en: "Bedroom mattress size" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["80×200 (pojedyncze)", "160×200", "180×200", "200×200", "Jeszcze nie wiem"],
              en: ["80×200 (single)", "160×200", "180×200", "200×200", "Not sure yet"],
            },
          },
          {
            label: { pl: "Czy w sypialni ma być telewizor?", en: "Should there be a TV in the bedroom?" },
            type: "yes_no",
            required: false,
          },
          {
            label: { pl: "Garderoba", en: "Wardrobe" },
            type: "single_choice",
            required: false,
            options: {
              pl: ["Nie potrzebuję osobnej garderoby", "Walk-in garderoba", "Szafy wnękowe", "Szafy wolnostojące"],
              en: ["Don't need a separate dressing room", "Walk-in closet", "Built-in wardrobes", "Freestanding wardrobes"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "ocena",
    name: { pl: "Ocena współpracy", en: "Collaboration Review" },
    description: {
      pl: "Ankieta satysfakcji po zakończeniu projektu. Zbiera oceny, feedback i zgodę na portfolio.",
      en: "A satisfaction survey after project completion. Collects ratings, feedback, and portfolio consent.",
    },
    sections: [],
    questions: [
      {
        label: { pl: "Jak ogólnie oceniasz nasze studio?", en: "How would you rate our studio overall?" },
        type: "rating",
        required: true,
        config: { min: 1, max: 5 },
      },
      {
        label: { pl: "Jak oceniasz jakość komunikacji w trakcie projektu?", en: "How would you rate the quality of communication during the project?" },
        type: "rating",
        required: true,
        config: { min: 1, max: 5 },
      },
      {
        label: { pl: "Jak oceniasz terminowość naszych działań?", en: "How would you rate the timeliness of our work?" },
        type: "rating",
        required: true,
        config: { min: 1, max: 5 },
      },
      {
        label: { pl: "Czy projekt spełnił Twoje oczekiwania estetyczne?", en: "Did the project meet your aesthetic expectations?" },
        type: "single_choice",
        required: true,
        options: {
          pl: ["Przekroczył oczekiwania", "W pełni spełnił", "Częściowo spełnił", "Nie spełnił"],
          en: ["Exceeded expectations", "Fully met expectations", "Partially met expectations", "Did not meet expectations"],
        },
      },
      {
        label: { pl: "Czy projekt spełnił Twoje oczekiwania funkcjonalne?", en: "Did the project meet your functional expectations?" },
        type: "single_choice",
        required: true,
        options: {
          pl: ["Przekroczył oczekiwania", "W pełni spełnił", "Częściowo spełnił", "Nie spełnił"],
          en: ["Exceeded expectations", "Fully met expectations", "Partially met expectations", "Did not meet expectations"],
        },
      },
      {
        label: { pl: "Co było najlepszym elementem naszej współpracy?", en: "What was the best part of our collaboration?" },
        type: "long_text",
        required: false,
      },
      {
        label: { pl: "Co moglibyśmy zrobić lepiej?", en: "What could we do better?" },
        type: "long_text",
        required: false,
      },
      {
        label: { pl: "Czy poleciłbyś/poleciłabyś nasze studio znajomym?", en: "Would you recommend our studio to friends?" },
        type: "single_choice",
        required: true,
        options: {
          pl: ["Zdecydowanie tak", "Raczej tak", "Nie wiem", "Raczej nie"],
          en: ["Definitely yes", "Probably yes", "Not sure", "Probably not"],
        },
      },
      {
        label: { pl: "Czy zgadzasz się na wykorzystanie zdjęć projektu w naszym portfolio?", en: "Do you agree to use project photos in our portfolio?" },
        type: "yes_no",
        required: true,
      },
    ],
  },
];

/** Returns survey templates resolved for the given language. */
export function getSurveyTemplates(lang: Lang = "pl"): SurveyTemplate[] {
  return i18nTemplates.map((t) => resolveTemplate(t, lang));
}

/** Default PL templates for backwards compatibility. */
export const surveyTemplates: SurveyTemplate[] = getSurveyTemplates("pl");
