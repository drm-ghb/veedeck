"use client";

import { useState } from "react";
import {
  PushPin, LocalMall, Comment, ChatBubble,
  Pin, Check, ExternalLink, History,
  Paperclip, Mic, CornerDownLeft, X, Users,
  Package, CalendarDays, NotebookText, VeezardIcon, CheckSquare,
  Engineering, FolderOpen, Ruler, ClipboardList,
  Eye, CheckCircle, RadioButtonUnchecked, Copy, FolderInput, MoreHorizontal, Search,
} from "@/components/ui/icons";

/* ─── SHARED TYPES ───────────────────────────────────────────────────────── */

interface Feature {
  icon: React.ReactNode;
  label: string;
  desc: string;
}

/* ─── DESIGNER PANEL ────────────────────────────────────────────────────── */

interface ClientTabSection {
  name: string;
  items: string[];
}

interface DesignerStep {
  title: string;
  desc: string;
  tips?: string[];
  steps: string[];
  clientTabs?: ClientTabSection[];
  features?: Feature[];
  featuresTitle?: string;
}

const DESIGNER_MODULES: DesignerStep[] = [
  {
    title: "1. Klienci",
    desc: "Centralna baza klientów. Każdy klient może mieć wiele kontaktów, przypisane projekty z ProjectFlow, listy zakupowe, harmonogram etapów, plan płatności i dokumenty — wszystko w jednym miejscu. Klientowi możesz założyć konto w platformie, żeby sam logował się i przeglądał swoje materiały bez jednorazowych linków.",
    steps: [
      'Kliknij **Dodaj klienta** i wpisz nazwę (imię i nazwisko lub firma)',
      "Klient pojawia się na liście — kliknij jego kartę, żeby otworzyć profil",
      "Profil ma pięć zakładek: **Informacje**, **Kontakty**, **Płatności**, **Harmonogram**, **Dokumenty** — opisane poniżej",
    ],
    clientTabs: [
      {
        name: "Informacje",
        items: [
          "Nazwa klienta lub firmy — edytuj i zapisz przyciskiem **Zapisz**",
          "**Opis projektu** — notatka tekstowa widoczna tylko dla Ciebie",
          "**Data rozpoczęcia** i **zakończenia** projektu",
          "**Adres inwestycji**: ulica, miasto, kod pocztowy, kraj",
          "**Ukrywanie modułów**: przełączniki wyłączają wybrane moduły (np. Listy zakupowe) dla tego klienta — nie pojawią się w jego panelu",
          "**Przesyłanie przez klienta**: toggle umożliwia klientowi wgrywanie własnych plików",
        ],
      },
      {
        name: "Kontakty",
        items: [
          "Lista osób kontaktowych — może ich być kilka (np. inwestor i małżonek)",
          "Każdy kontakt ma: imię i nazwisko, email, telefon, oznaczenie czy jest **kontaktem głównym**",
          "Kolejność kontaktów zmieniasz przeciągając (ikona uchwytu po lewej stronie wiersza)",
          "Kliknij **Utwórz konto** przy kontakcie — system generuje login (z emaila) i hasło; klient może się zalogować do platformy",
          "Rozwiń sekcję **Dane logowania** przy kontakcie, żeby zmienić login lub ustawić nowe hasło",
          "**Odłącz konto** — klient straci dostęp do panelu, ale jego dane kontaktowe zostają",
        ],
      },
      {
        name: "Płatności",
        items: [
          "Lista transz płatności: nazwa (np. Zaliczka, II rata), kwota i termin",
          "Kliknij **Dodaj płatność** — wpisz nazwę, kwotę i termin",
          "Zaznacz transzę jako **opłaconą** — system odnotowuje datę zapłaty",
          "Podsumowanie: łączna kwota, suma opłaconych, suma zaległych",
        ],
      },
      {
        name: "Harmonogram",
        items: [
          "Lista etapów i kamieni milowych projektu",
          "Każdy etap ma: nazwę (np. Projekt wstępny, Przetarg), datę i status",
          "Statusy: **Do zrobienia**, **W trakcie**, **Zakończony**",
          "Przeciągaj etapy, żeby zmieniać ich kolejność",
        ],
      },
      {
        name: "Dokumenty",
        items: [
          "Wgrywaj pliki powiązane z klientem: umowy, oferty, kosztorysy, zdjęcia nieruchomości",
          "Kliknij **Dodaj dokument** lub przeciągnij plik na obszar wgrywania",
          "Lista dokumentów z nazwą pliku i datą dodania",
          "Pobierz dokument klikając ikonę pobierania lub usuń z menu przy pliku",
        ],
      },
    ],
  },
  {
    title: "2. ProjectFlow",
    desc: "Moduł do prezentowania wizualizacji, renderów i plików projektu klientowi. Organizujesz materiały w pomieszczenia (Salon, Sypialnia itd.), do których wgrywasz pliki. Klient otwiera projekt w swoim panelu, komentuje, dodaje pinezki w konkretnych miejscach na renderach i zatwierdza gotowe elementy. Każdy render ma pełną historię wersji — żadna wersja nigdy nie ginie.",
    tips: [
      "Możesz tworzyć foldery wewnątrz pomieszczeń — przydatne gdy masz wiele etapów, wariantów lub dostawców.",
      "Pomieszczenie możesz ukryć przed klientem — niewidoczne dopóki nie zmienisz ustawienia widoczności.",
    ],
    steps: [
      "Kliknij **Nowy projekt** i nadaj mu nazwę",
      "Przypisz projekt do istniejącego klienta lub dodaj nowego na miejscu",
      "Dodaj pomieszczenia — każde ma nazwę i ikonę; przeciągaj je, żeby zmienić kolejność",
      "W pomieszczeniu wgrywaj wizualizacje, pliki PDF lub inne dokumenty (drag & drop lub kliknij **Dodaj plik**)",
      "Opcjonalnie: utwórz foldery wewnątrz pomieszczenia (np. Wariant A, Wariant B)",
      "Aby wgrać nową wersję renderu: otwórz plik i kliknij **Wgraj nową wersję** — stara zostaje w historii",
      "**Historia wersji**: przeglądaj poprzednie wersje i przywróć dowolną z nich",
      "Udostępnij projekt: kliknij **Udostępnij** na karcie projektu i skopiuj link",
      "Klient zostawia pinezki (klik w konkretne miejsce na renderze) lub ogólne komentarze — widzisz je na pliku",
      "Odpowiadaj na komentarze klienta bezpośrednio w wątkach",
      "Klient może zatwierdzić render lub zgłosić prośbę o zmiany z opisem",
      "Pomieszczenie lub plik możesz ukryć lub odkryć w dowolnym momencie (ikona **oka**)",
    ],
    features: [
      { icon: <Pin size={16} />, label: "Pinezki", desc: "Komentarz przypisany do konkretnego miejsca na wizualizacji — klient klika punkt na renderze" },
      { icon: <History size={16} />, label: "Historia wersji", desc: "Wszystkie poprzednie wersje pliku zachowane — możesz je przeglądać i przywracać" },
      { icon: <Check size={16} />, label: "Akceptacja renderów", desc: "Klient zatwierdza render lub zgłasza prośbę o zmiany z opisem" },
      { icon: <Eye size={16} />, label: "Ukrywanie pomieszczeń", desc: "Pomieszczenie lub plik niewidoczny dla klienta dopóki go nie odkryjesz" },
      { icon: <FolderOpen size={16} />, label: "Foldery", desc: "Podfoldery wewnątrz pomieszczeń dla lepszej organizacji plików i wariantów" },
    ],
    featuresTitle: "Kluczowe funkcje",
  },
  {
    title: "3. Listy zakupowe",
    desc: "Moduł do tworzenia zestawień produktów, mebli i materiałów dla klientów. Produkty organizujesz w sekcje odpowiadające pomieszczeniom, ustawiasz ceny i linki do sklepów. Klient przegląda listę, zatwierdza lub odrzuca produkty i zostawia komentarze. Produkty opcjonalne nie wliczają się do sumy kosztów.",
    tips: [
      "Zainstaluj rozszerzenie veepick do przeglądarki — pozwala dodawać produkty do listy bezpośrednio ze sklepów internetowych jednym kliknięciem, bez ręcznego wklejania danych.",
      "Możesz też dodać listę z nowym klientem od razu — klient automatycznie trafi do modułu Klienci.",
    ],
    steps: [
      "Kliknij **Nowa lista** i nadaj jej nazwę",
      "Przypisz listę do istniejącego klienta lub dodaj nowego na miejscu",
      "Dodaj sekcje odpowiadające pomieszczeniom (np. Salon, Sypialnia, Łazienka) — przeciągaj, żeby zmienić kolejność",
      "W sekcji dodawaj produkty: nazwa, link do sklepu, cena, zdjęcie, wymiary, czas dostawy, notatka",
      "Ikona **oka** na kafelku: ukryj produkt przed klientem (nadal widzisz go z przekreśloną ikoną oka)",
      "Ikona **kółka / checkboxa**: oznacz jako opcjonalny — nie wlicza się do sumy sekcji ani łącznej kwoty listy",
      "Ikona **kopiowania**: skopiuj produkt do innej sekcji tej samej listy",
      "Ikona **folderu ze strzałką**: przenieś produkt do innej sekcji",
      "Menu **3 kropki**: edytuj, zatwierdź lub odrzuć ręcznie, resetuj status, oznacz opcjonalnym, ukryj, usuń",
      "Pasek narzędzi: **lupa** (wyszukiwarka filtrująca produkty po nazwie), **Ukryj ceny**, eksport do **XLSX**",
      "Udostępnij listę klientowi: kliknij **Udostępnij** i skopiuj link",
      "Klient zatwierdza lub odrzuca produkty i może zostawiać komentarze",
    ],
    features: [
      { icon: <Eye size={16} />, label: "Ukryj/pokaż produkt", desc: "Produkt niewidoczny dla klienta — nadal widoczny dla projektanta z przekreśloną ikoną" },
      { icon: <CheckCircle size={16} />, label: "Podstawowy / opcjonalny", desc: "Produkty opcjonalne nie są wliczane do sumy sekcji ani łącznej kwoty listy" },
      { icon: <Copy size={16} />, label: "Kopiuj do sekcji", desc: "Tworzy kopię produktu w wybranej sekcji tej samej listy" },
      { icon: <FolderInput size={16} />, label: "Przenieś do sekcji", desc: "Przenosi produkt do innej sekcji — oryginał znika z bieżącej" },
      { icon: <MoreHorizontal size={16} />, label: "Więcej opcji (3 kropki)", desc: "Edytuj, zatwierdź/odrzuć ręcznie, resetuj status, oznacz opcjonalnym, ukryj, przenieś, kopiuj, usuń" },
      { icon: <Search size={16} />, label: "Wyszukiwarka", desc: "Filtruje produkty na bieżącej liście po nazwie — ikona lupy w pasku narzędzi" },
    ],
    featuresTitle: "Przyciski na kafelku produktu",
  },
  {
    title: "4. Zadania",
    desc: "Moduł do zarządzania własną pracą. Tworzysz zadania z tytułem, opisem, priorytetem i terminem, opcjonalnie powiązane z projektem. Postęp śledzisz w widoku listy lub tablicy kanban — przeciągając zadania między kolumnami statusów.",
    steps: [
      "Kliknij **Nowe zadanie** i wpisz tytuł",
      "Uzupełnij opis, termin wykonania i priorytet (**niski** / **średni** / **wysoki**)",
      "Opcjonalnie przypisz zadanie do projektu z ProjectFlow",
      "Zmieniaj status: **Do zrobienia** → **W trakcie** → **Gotowe**",
      "Na tablicy **kanban**: przeciągaj zadanie między kolumnami, żeby zmienić status",
      "Dodawaj **podzadania** — lista checkboxów wewnątrz zadania; zaznaczaj je po kolei",
      "Filtruj zadania po priorytecie, projekcie lub terminie",
      "Przełączaj między widokiem **listy** i **tablicy kanban** ikonami w pasku narzędzi",
    ],
  },
  {
    title: "5. Ankiety",
    desc: "Moduł do tworzenia formularzy i ankiet wysyłanych do klientów. Budujesz ankietę z pytań różnego typu (tekst, jednokrotny i wielokrotny wybór, ocena, tak/nie, budżet), dzielisz ją na sekcje tematyczne i przypisujesz klientowi. Klient wypełnia ankietę w swoim panelu, Ty przeglądasz odpowiedzi.",
    tips: [
      "Pytania możesz przeciągać i zmieniać ich kolejność — działa też między sekcjami.",
      "Możesz zapisać ankietę jako szablon i użyć jej ponownie przy kolejnym kliencie bez przepisywania pytań.",
    ],
    steps: [
      "Kliknij **Nowa ankieta** i nadaj jej tytuł",
      "Opcjonalnie: dodaj sekcje tematyczne, np. Styl, Budżet, Oczekiwania",
      "Dodaj pytania i wybierz typ: **krótki tekst**, **długi tekst**, **jednokrotny wybór**, **wielokrotny wybór**, **ocena w skali**, **tak/nie**, **przedział budżetowy**",
      "Dla pytań jednokrotnego i wielokrotnego wyboru: wpisz opcje odpowiedzi",
      "Przeciągaj pytania, żeby zmienić ich kolejność — możesz też przenosić między sekcjami",
      "Oznacz pytania jako **wymagane** — klient nie może ich pominąć",
      "Przypisz ankietę do klienta i zmień status na **Aktywna**",
      "Klient wypełnia ankietę — śledzisz liczbę wyświetleń i czy odpowiedź została wysłana",
      "Przeglądaj odpowiedzi w zakładce **Odpowiedzi** — wyniki pogrupowane według pytań",
      "Kliknij **Zapisz jako szablon** — ankieta pojawi się w zakładce **Szablony**",
      "Zmień status na **Zamknięta** gdy nie chcesz przyjmować kolejnych odpowiedzi",
      "**Archiwizuj** nieaktualne ankiety — znikają z widoku, ale ich dane zostają",
    ],
    features: [
      { icon: <CheckSquare size={16} />, label: "Typy pytań", desc: "Krótki tekst, długi tekst, jednokrotny wybór, wielokrotny wybór, ocena, tak/nie, budżet" },
      { icon: <ClipboardList size={16} />, label: "Sekcje", desc: "Grupuj pytania w sekcje tematyczne — możesz przeciągać pytania między sekcjami" },
      { icon: <Copy size={16} />, label: "Szablony", desc: "Zapisz ankietę jako szablon i użyj ponownie bez przepisywania pytań" },
    ],
    featuresTitle: "Dostępne funkcje",
  },
  {
    title: "6. Produkty",
    desc: "Osobista biblioteka mebli, oświetlenia, tkanin, materiałów i akcesoriów, które często pojawiają się w Twoich projektach. Zamiast wklejać te same dane za każdym razem, dodajesz produkt raz i wstawiasz go do dowolnej listy zakupowej jednym kliknięciem. Rozszerzenie veepick umożliwia dodawanie produktów bezpośrednio ze stron sklepów internetowych.",
    tips: [
      "Rozszerzenie veepick automatycznie pobiera zdjęcie, nazwę, cenę i link ze strony sklepu — zero ręcznego wklejania.",
      "Produkt z biblioteki wstawiasz na listę ze wszystkimi zapisanymi danymi — nie przepisujesz ich ponownie.",
    ],
    steps: [
      "Kliknij **Dodaj produkt** i uzupełnij: nazwę, link do sklepu, cenę, kategorię, zdjęcie",
      "Lub użyj rozszerzenia **veepick**: otwórz stronę produktu w sklepie, kliknij ikonę rozszerzenia i dodaj do biblioteki",
      "Uzupełnij wymiary, czas dostawy i inne szczegóły dla łatwiejszego wyszukiwania",
      "Aby wstawić produkt na listę zakupową: otwórz listę, kliknij **Dodaj z biblioteki** i wyszukaj produkt",
      "Produkt trafia do wybranej sekcji z zachowaniem wszystkich danych",
      "Edytuj produkt w bibliotece — zmiany nie wpływają na egzemplarze już wstawione na listy",
    ],
  },
  {
    title: "7. Wykonawcy",
    desc: "Moduł do zarządzania wykonawcami — hydraulikami, malarzami, elektrykami, firmami budowlanymi i innymi specjalistami. Każdy wykonawca ma własne konto i loguje się do swojego panelu, gdzie widzi wyłącznie przypisane mu foldery i pliki. Tworzysz strukturę folderów z dokumentacją techniczną, wgrywasz pliki i ukrywasz foldery, które nie są jeszcze gotowe.",
    tips: [
      "Folder możesz ukryć — wykonawca nie widzi go dopóki nie zmienisz ustawienia widoczności.",
      "Pliki z ProjectFlow możesz dodać bezpośrednio do folderu wykonawcy — bez duplikowania pliku, tylko powiązanie.",
    ],
    steps: [
      "Kliknij **Dodaj wykonawcę** i wpisz dane: imię lub firma, email, telefon",
      "Przejdź do profilu wykonawcy i kliknij **Utwórz konto** — wykonawca dostanie login i hasło",
      "Przypisz wykonawcę do projektu: otwórz jego profil i kliknij **Przypisz do projektu**",
      "W projekcie wykonawcy twórz foldery — wybierz typ: **Rysunki**, **Wizualizacje** lub **Inne** (każdy ma inną ikonę)",
      "Możesz tworzyć podfoldery wewnątrz folderów głównych",
      "Wgrywaj pliki do folderów: drag & drop lub kliknij **Dodaj plik**",
      "Opcjonalnie: dodaj plik z ProjectFlow (powiązanie zamiast kopii)",
      "Ukrywaj foldery, których nie chcesz jeszcze pokazywać — ikona **oka** przy nazwie folderu",
      "Wykonawca loguje się i widzi wyłącznie swoje foldery i pliki",
      "Wykonawca może dodawać pinezki i komentarze do plików — widzisz je po swojej stronie",
      "**Czat**: każde przypisanie do projektu ma własny wątek — klikasz ikonę czatu w projekcie wykonawcy",
      "**Archiwizuj** przypisanie gdy projekt z wykonawcą jest zakończony",
    ],
    features: [
      { icon: <FolderOpen size={16} />, label: "Foldery z typami", desc: "Rysunki, Wizualizacje, Inne — każdy typ z inną ikoną; dwa poziomy głębokości (folder + podfolder)" },
      { icon: <Eye size={16} />, label: "Ukrywanie folderów", desc: "Folder niewidoczny dla wykonawcy dopóki nie zmienisz ustawienia widoczności" },
      { icon: <Pin size={16} />, label: "Pinezki wykonawcy", desc: "Komentarze przypisane do konkretnych miejsc na rysunkach i planach" },
      { icon: <ChatBubble size={16} />, label: "Czat", desc: "Bezpośredni czat z wykonawcą w ramach każdego przypisania do projektu" },
      { icon: <ExternalLink size={16} />, label: "Pliki z ProjectFlow", desc: "Linkuj wizualizacje z ProjectFlow bez duplikowania pliku" },
    ],
    featuresTitle: "Kluczowe funkcje",
  },
  {
    title: "8. Kalendarz",
    desc: "Osobisty kalendarz z widokami miesięcznym, tygodniowym i dziennym. Planujesz trzy typy zdarzeń: Wydarzenie (spotkania z klientami, w kolorze niebieskim), Zadanie (praca do wykonania, w kolorze fioletowym) i Przypomnienie (alerty, w kolorze żółtym). Do wydarzeń możesz dodawać uczestników z listy klientów.",
    steps: [
      "Kliknij w dowolny dzień lub godzinę na siatce kalendarza, żeby otworzyć formularz nowego zdarzenia",
      "Wpisz tytuł i wybierz typ: **Wydarzenie** (niebieskie), **Zadanie** (fioletowe) lub **Przypomnienie** (żółte)",
      "Ustaw datę, godzinę rozpoczęcia i zakończenia",
      "Opcjonalnie dodaj lokalizację i opis",
      "Dodaj uczestników: wpisz imię lub email — system podpowiada klientów z bazy, możesz też wpisać ręcznie",
      "Kliknij zdarzenie na kalendarzu, żeby edytować je lub usunąć",
      "Przełączaj widok: **miesięczny**, **tygodniowy** lub **dzienny** — ikony w prawym górnym rogu",
    ],
    features: [
      { icon: <CalendarDays size={16} />, label: "Trzy typy zdarzeń", desc: "Wydarzenie (niebieskie), Zadanie (fioletowe), Przypomnienie (żółte) — każdy z osobnym kolorem na siatce" },
      { icon: <Users size={16} />, label: "Uczestnicy", desc: "Dodaj gości do wydarzeń — wybierz z listy klientów lub wpisz ręcznie email" },
    ],
    featuresTitle: "Dostępne funkcje",
  },
  {
    title: "9. Notatnik",
    desc: "Prywatny notatnik widoczny wyłącznie dla Ciebie. Tworzysz notatki tekstowe z formatowaniem (pogrubienie, listy, checklista) lub szkice rysowane palcem, rysikiem albo myszką. Do każdej notatki możesz dołączać pliki i zdjęcia. Gotowe notatki archiwizujesz — znikają z głównego widoku, ale zostają zachowane.",
    steps: [
      "Kliknij **Nowa notatka** (ikona pióra w nagłówku)",
      "Wpisz tytuł i zacznij pisać — edytor ma pasek formatowania: **pogrubienie**, **kursywa**, **podkreślenie**, **przekreślenie**, **listy**, **lista numerowana**, **checklista**",
      "Aby narysować szkic: kliknij ikonę **szkicownika** w pasku edytora i rysuj palcem, rysikiem lub myszką",
      "Aby dodać załącznik: kliknij ikonę **spinacza** i wgraj plik lub zdjęcie",
      "Notatka zapisuje się automatycznie — nie musisz klikać Zapisz",
      "Wyszukaj notatkę wpisując tekst w pole wyszukiwania na liście po lewej",
      "Sortuj notatki: **od najnowszej** lub **od najstarszej**",
      "Aby archiwizować: otwórz menu notatki i kliknij **Archiwizuj**",
      "Przywróć notatkę z archiwum: przełącz widok na **Archiwum** i kliknij **Przywróć**",
    ],
    features: [
      { icon: <NotebookText size={16} />, label: "Bogaty edytor", desc: "Formatowanie tekstu, listy, checklista — edytor Tiptap z paskiem narzędzi" },
      { icon: <Paperclip size={16} />, label: "Załączniki", desc: "Wgrywanie zdjęć i dokumentów bezpośrednio do notatki" },
      { icon: <CheckSquare size={16} />, label: "Szkicownik", desc: "Rysowanie palcem, rysikiem lub myszką — działa na każdym urządzeniu" },
    ],
    featuresTitle: "Dostępne funkcje",
  },
  {
    title: "10. Dyskusje",
    desc: "Wbudowany czat z klientem. Wątek tworzy się automatycznie po dodaniu klienta — nie ma nic do konfigurowania. Wymieniasz wiadomości tekstowe, przesyłasz zdjęcia i dokumenty, nagrywasz głosówki i odpowiadasz na konkretne wiadomości. Cała historia komunikacji zostaje w jednym miejscu, bez potrzeby maila.",
    steps: [
      "Wątek dyskusji powstaje automatycznie po dodaniu klienta — nie musisz nic konfigurować",
      "Otwórz **Dyskusje** i wybierz klienta z listy po lewej",
      "Napisz wiadomość i wyślij klawiszem **Enter** lub przyciskiem",
      "Kliknij ikonę **spinacza**, żeby wysłać zdjęcie lub dokument jako załącznik",
      "Przytrzymaj ikonę **mikrofonu**, żeby nagrać i wysłać wiadomość głosową",
      "Najedź na wiadomość klienta i kliknij **Odpowiedz** — odpiszesz z cytatem konkretnej wiadomości",
      "Klient odpowiada bezpośrednio ze swojego panelu — wiadomości widzisz w czasie rzeczywistym",
      "Nieprzeczytane wiadomości sygnalizuje badge z liczbą na liście dyskusji",
    ],
    features: [
      { icon: <Paperclip size={16} />, label: "Załączniki", desc: "Wysyłanie zdjęć, dokumentów i innych plików" },
      { icon: <Mic size={16} />, label: "Głosówki", desc: "Nagraj i wyślij wiadomość głosową (przytrzymaj ikonę mikrofonu)" },
      { icon: <CornerDownLeft size={16} />, label: "Odpowiedź z cytatem", desc: "Odpowiedź na konkretną wiadomość z przytoczeniem oryginału" },
    ],
    featuresTitle: "Dostępne funkcje",
  },
  {
    title: "11. Veezard",
    desc: "Wkrótce dostępny w veedeck.",
    steps: [],
  },
];

/* ─── CLIENT PANEL ───────────────────────────────────────────────────────── */

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
    name: "ProjectFlow — wizualizacje",
    icon: <PushPin size={22} />,
    desc: "Klient widzi wszystkie wizualizacje i pliki udostępnione przez projektanta, pogrupowane w pomieszczenia. Może komentować pliki ogólnie lub dodawać pinezki w konkretnych miejscach na renderach, zatwierdzać gotowe elementy i śledzić historię zmian.",
    steps: [
      "Otwiera projekt i przegląda listę pomieszczeń",
      "Wchodzi do pomieszczenia i widzi siatkę wizualizacji i plików",
      "Klika plik, żeby otworzyć go w pełnym widoku",
      "Klika w konkretne miejsce na renderze, żeby dodać **pinezkę** z komentarzem",
      "Klika ikonę czatu, żeby zostawić ogólną wiadomość dotyczącą pliku",
      "**Zatwierdza** render (zielona ikona) lub zgłasza **prośbę o zmiany** z opisem (czerwona ikona)",
      "Odpowiada na odpowiedzi projektanta w wątku komentarza",
      "Przegląda **historię wersji**, jeśli projektant wgrał aktualizację pliku",
    ],
    features: [
      { icon: <Pin size={16} />, label: "Pinezka", desc: "Klik w dowolne miejsce na renderze dodaje komentarz przypięty do tego miejsca" },
      { icon: <ChatBubble size={16} />, label: "Komentarz ogólny", desc: "Wiadomość dotycząca całego pliku — bez przypinania do miejsca" },
      { icon: <Check size={16} />, label: "Akceptacja", desc: "Klient zatwierdza render — projektant widzi status zatwierdzenia" },
      { icon: <History size={16} />, label: "Historia wersji", desc: "Poprzednie wersje pliku dostępne do porównania" },
    ],
  },
  {
    id: "listy",
    name: "Listy zakupowe",
    icon: <LocalMall size={22} />,
    desc: "Klient przegląda zestawienie produktów, mebli i materiałów wybranych przez projektanta. Może sprawdzić szczegóły każdego produktu, otworzyć link do sklepu, zatwierdzić lub odrzucić produkt i zostawić komentarz. Produkty oznaczone jako opcjonalne są widoczne, ale nie wliczają się do sumy kosztów.",
    steps: [
      "Otwiera listę i przegląda sekcje odpowiadające pomieszczeniom",
      "Klika w kafelek produktu, żeby zobaczyć pełne szczegóły (cena, wymiary, czas dostawy, notatka projektanta)",
      "Klika ikonę linku, żeby otworzyć produkt bezpośrednio w sklepie internetowym",
      "**Zatwierdza** produkt (zielona ikona) lub **odrzuca** (czerwona ikona)",
      "Dodaje komentarz lub pytanie do konkretnego produktu",
      "Produkty z etykietą **Opcjonalny** nie są wliczane do sumy — mogą lub nie muszą być kupione",
      "Widzi łączną sumę sekcji i całej listy (bez produktów opcjonalnych)",
    ],
    features: [
      { icon: <Check size={16} />, label: "Zatwierdź produkt", desc: "Klient akceptuje produkt — projektant widzi status zatwierdzenia" },
      { icon: <X size={16} />, label: "Odrzuć produkt", desc: "Klient oznacza produkt do zmiany lub usunięcia" },
      { icon: <Comment size={16} />, label: "Komentarz", desc: "Pytanie lub uwaga do konkretnego produktu" },
      { icon: <ExternalLink size={16} />, label: "Link do sklepu", desc: "Otwiera stronę produktu w sklepie internetowym" },
    ],
  },
  {
    id: "dyskusje",
    name: "Dyskusje",
    icon: <ChatBubble size={22} />,
    desc: "Bezpośredni czat z projektantem. Klient może pisać wiadomości, przesyłać zdjęcia pomieszczeń lub inspiracje, nagrywać głosówki i odpowiadać na konkretne wiadomości projektanta. Wątek tworzy się automatycznie — klient nie musi nic konfigurować.",
    steps: [
      "Otwiera zakładkę **Dyskusje** w swoim panelu",
      "Wpisuje wiadomość i wysyła klawiszem **Enter** lub przyciskiem",
      "Klika ikonę **spinacza**, żeby wysłać zdjęcie lub dokument",
      "Przytrzymuje ikonę **mikrofonu**, żeby nagrać i wysłać głosówkę",
      "Najeżdża na wiadomość projektanta i klika **Odpowiedz** — odpowie z cytatem",
      "Widzi wiadomości projektanta w czasie rzeczywistym",
    ],
    features: [
      { icon: <Paperclip size={16} />, label: "Załącznik", desc: "Wysyłanie zdjęcia, dokumentu lub pliku" },
      { icon: <Mic size={16} />, label: "Głosówka", desc: "Nagrywanie i wysyłanie wiadomości głosowej (przytrzymaj mikrofon)" },
      { icon: <CornerDownLeft size={16} />, label: "Odpowiedź z cytatem", desc: "Odpowiedź na konkretną wiadomość projektanta z przytoczeniem oryginału" },
    ],
  },
];

/* ─── CONTRACTOR PANEL ──────────────────────────────────────────────────── */

const CONTRACTOR_MODULES: ClientModule[] = [
  {
    id: "projekty",
    name: "Moje projekty",
    icon: <FolderOpen size={22} />,
    desc: "Wykonawca widzi listę projektów, do których został przypisany przez projektanta. Każdy projekt zawiera informacje o inwestycji (adres, opis) i strukturę folderów z dokumentacją. Badge przy projekcie sygnalizuje nowe, nieodczytane pliki.",
    steps: [
      "Loguje się do swojego panelu (oddzielny login i hasło, nadane przez projektanta)",
      "Widzi karty przypisanych projektów z nazwą inwestycji i adresem",
      "Otwiera projekt i widzi listę folderów pogrupowanych według typu",
      "**Badge** przy nazwie folderu informuje o liczbie nowych plików",
      "Wchodzi do folderu i przegląda pliki w widoku siatki",
      "Otwiera plik, żeby zobaczyć go w pełnym widoku lub pobrać",
    ],
    features: [
      { icon: <FolderOpen size={16} />, label: "Foldery projektanta", desc: "Struktura folderów tworzona i zarządzana przez projektanta" },
      { icon: <Ruler size={16} />, label: "Typy folderów", desc: "Rysunki (ikona linijki), Wizualizacje (ikona obrazka), Inne (ikona dokumentu)" },
    ],
  },
  {
    id: "pliki",
    name: "Przeglądarka plików",
    icon: <Engineering size={22} />,
    desc: "Wykonawca otwiera plik w przeglądarce wbudowanej w platformę. Może go powiększyć, pobrać lub zostawić komentarz przypisany do konkretnego miejsca na rysunku (pinezka). Projektant widzi te komentarze po swojej stronie.",
    steps: [
      "Otwiera folder i klika w plik",
      "Plik otwiera się w pełnym widoku — może go powiększać i pomniejszać",
      "Klika w konkretne miejsce na rysunku lub planie, żeby dodać **pinezkę** z komentarzem",
      "Klika ikonę czatu, żeby zostawić ogólną uwagę do całego pliku",
      "Odpowiada na odpowiedzi projektanta w wątku pinezki",
      "Pobiera plik klikając ikonę **pobierania** lub otwiera go w nowej karcie",
    ],
    features: [
      { icon: <Pin size={16} />, label: "Pinezka", desc: "Komentarz przypisany do konkretnego miejsca na rysunku lub planie" },
      { icon: <Comment size={16} />, label: "Komentarz ogólny", desc: "Uwaga dotycząca całego pliku — bez przypinania do miejsca" },
      { icon: <ExternalLink size={16} />, label: "Pobierz / otwórz", desc: "Pobieranie pliku na urządzenie lub otwarcie w nowej karcie przeglądarki" },
    ],
  },
  {
    id: "czat",
    name: "Czat z projektantem",
    icon: <ChatBubble size={22} />,
    desc: "Każde przypisanie do projektu ma własny wątek czatu z projektantem. Wykonawca może pisać wiadomości, wysyłać zdjęcia z placu budowy, dokumenty i nagrywać głosówki.",
    steps: [
      "Otwiera projekt i przechodzi do zakładki czatu",
      "Wpisuje wiadomość i wysyła klawiszem **Enter** lub przyciskiem",
      "Klika ikonę **spinacza**, żeby wysłać zdjęcie lub dokument",
      "Przytrzymuje ikonę **mikrofonu**, żeby nagrać i wysłać głosówkę",
      "Odpowiada na konkretną wiadomość projektanta — najeżdża i klika **Odpowiedz**",
      "Widzi wiadomości projektanta w czasie rzeczywistym",
    ],
    features: [
      { icon: <Paperclip size={16} />, label: "Załącznik", desc: "Wysyłanie zdjęcia, dokumentu lub pliku" },
      { icon: <Mic size={16} />, label: "Głosówka", desc: "Nagrywanie i wysyłanie wiadomości głosowej (przytrzymaj mikrofon)" },
      { icon: <CornerDownLeft size={16} />, label: "Odpowiedź z cytatem", desc: "Odpowiedź na konkretną wiadomość projektanta z przytoczeniem oryginału" },
    ],
  },
];

/* ─── BOLD TEXT HELPER ───────────────────────────────────────────────────── */

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

/* ─── DESIGNER MODULE CARD ───────────────────────────────────────────────── */

const DESIGNER_ICONS = [
  <Users size={22} />, <PushPin size={22} />, <LocalMall size={22} />,
  <CheckSquare size={22} />, <ClipboardList size={22} />, <Package size={22} />,
  <Engineering size={22} />, <CalendarDays size={22} />, <NotebookText size={22} />,
  <ChatBubble size={22} />, <VeezardIcon size={22} />,
];

function DesignerModuleCard({ mod, icon }: { mod: DesignerStep; icon: React.ReactNode }) {
  const [activeClientTab, setActiveClientTab] = useState(0);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {icon}
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
        {mod.steps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Jak to zrobić</p>
            <ul className="space-y-1.5">
              {mod.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span><BoldText text={step} /></span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {mod.clientTabs && mod.clientTabs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Zakładki profilu klienta</p>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex overflow-x-auto border-b border-border bg-muted/30 scrollbar-hide">
                {mod.clientTabs.map((ct, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveClientTab(i)}
                    className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border-r border-border last:border-r-0 ${
                      activeClientTab === i
                        ? "bg-background text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ct.name}
                  </button>
                ))}
              </div>
              <ul className="px-4 py-4 space-y-2.5">
                {mod.clientTabs[activeClientTab].items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                    <span><BoldText text={item} /></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {mod.features && mod.features.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{mod.featuresTitle ?? "Dostępne funkcje"}</p>
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
        )}
      </div>
    </div>
  );
}

/* ─── PAGE ───────────────────────────────────────────────────────────────── */

export default function InstrukcjaPage() {
  const [tab, setTab] = useState<"designer" | "client" | "contractor">("designer");
  const [designerIdx, setDesignerIdx] = useState(0);
  const [clientId, setClientId] = useState(CLIENT_MODULES[0].id);
  const [contractorId, setContractorId] = useState(CONTRACTOR_MODULES[0].id);

  function switchPanel(p: "designer" | "client" | "contractor") {
    setTab(p);
    setDesignerIdx(0);
    setClientId(CLIENT_MODULES[0].id);
    setContractorId(CONTRACTOR_MODULES[0].id);
  }

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
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1">
          <button
            onClick={() => switchPanel("designer")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "designer"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Panel projektanta
          </button>
          <button
            onClick={() => switchPanel("client")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "client"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Panel klienta
          </button>
          <button
            onClick={() => switchPanel("contractor")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "contractor"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Panel wykonawcy
          </button>
        </div>

        {/* Module tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {tab === "designer" && DESIGNER_MODULES.map((mod, idx) => (
            <button
              key={idx}
              onClick={() => setDesignerIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                designerIdx === idx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {mod.title}
            </button>
          ))}
          {tab === "client" && CLIENT_MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setClientId(mod.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                clientId === mod.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {mod.name}
            </button>
          ))}
          {tab === "contractor" && CONTRACTOR_MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setContractorId(mod.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                contractorId === mod.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {mod.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Designer panel ── */}
      {tab === "designer" && (
        <DesignerModuleCard
          mod={DESIGNER_MODULES[designerIdx]}
          icon={DESIGNER_ICONS[designerIdx]}
        />
      )}

      {/* ── Contractor panel ── */}
      {tab === "contractor" && (() => {
        const mod = CONTRACTOR_MODULES.find((m) => m.id === contractorId)!;
        return (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                {mod.icon}
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{mod.name}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{mod.desc}</p>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Co widzi i robi wykonawca</p>
                <ul className="space-y-1.5">
                  {mod.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={10} className="text-primary" />
                      </span>
                      <span><BoldText text={step} /></span>
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
        );
      })()}

      {/* ── Client panel ── */}
      {tab === "client" && (() => {
        const mod = CLIENT_MODULES.find((m) => m.id === clientId)!;
        return (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
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
                      <span><BoldText text={step} /></span>
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
        );
      })()}
    </div>
  );
}
