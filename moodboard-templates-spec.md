# veedeck — Moduł Moodboard: szablony (brief wdrożeniowy)

Zadanie: wdrożyć 10 szablonów moodboardów (5 siatek klasycznych + 5 kolaży swobodnych) w module Moodboard w veedeck. Definicje szablonów są gotowe w załączonym pliku `templates.ts` — to jedyne źródło prawdy dla układów. Nie zmieniaj współrzędnych bez wyraźnej potrzeby; zostały zaprojektowane tak, żeby nachodzenia i marginesy były spójne.

## 1. Zakres

1. Dodaj `templates.ts` do kodu modułu Moodboard (proponowana lokalizacja: `modules/moodboard/data/templates.ts` — dopasuj do istniejącej struktury projektu).
2. Zaimplementuj galerię wyboru szablonu (grid miniatur z podziałem na kategorie „Siatki" / „Kolaże swobodne").
3. Zaimplementuj renderowanie szablonu na canvasie moodboardu: puste placeholdery zgodne z definicjami slotów.
4. Miniatury w galerii renderuj z tych samych danych co canvas (SVG generowane z `MOODBOARD_TEMPLATES`) — żadnych ręcznie rysowanych PNG, żeby miniatura nigdy nie rozjechała się z układem.

## 2. Model danych — jak interpretować pola

Typy i dane są w `templates.ts`. Kluczowe zasady interpretacji:

- Wszystkie współrzędne (`x`, `y`, `w`, `h`) są znormalizowane do zakresu 0–1 względem wymiarów canvasu. Pozycja px = ułamek × wymiar canvasu w px. Dzięki temu szablon skaluje się do dowolnego rozmiaru i eksportu.
- `aspectRatio` = szerokość / wysokość canvasu. Większość szablonów to portret 3:4 (0.75); wyjątek: `classic-3x3` ma 1.0 (kwadrat, gotowy pod eksport do Instagrama).
- `shape: 'circle'`: `w` to ŚREDNICA jako ułamek SZEROKOŚCI canvasu, `h` jest pomijane. Renderer musi wymusić idealne koło w pikselach (średnica px = w × szerokość canvasu px), inaczej przy proporcji 3:4 koła zrobią się elipsami.
- `rotation`: stopnie, obrót wokół środka slotu (`transform-origin: center`). Występuje tylko w szablonie `polaroids` (±3–5°).
- `z`: kolejność warstw (wyższe = bliżej widza). Krytyczne dla kategorii `freeform` — np. w `central-layers` kafel `top-left` (z=3) leży NA kaflu centralnym (z=2), a `bottom-right` (z=1) POD nim. Sloty bez `z` traktuj jako z=0, remisy rozstrzygaj kolejnością w tablicy.
- `role`:
  - `image` — placeholder na zdjęcie/render (upload, biblioteka projektu lub produkt z Veepick).
  - `swatch` — próbka koloru: wypełnienie jednolitym kolorem + etykieta hex/nazwa. Docelowo z color pickerem; pipeta pobierająca kolor z innego kafla to backlog, nie MVP.
  - `text` — pole tekstowe (tytuł koncepcji / podpis / cytat).
- `label` — dwujęzyczna etykieta roli, wyświetlana w pustym placeholderze. Podłącz pod istniejący mechanizm i18n (veedeck-i18n.js, PL primary / EN dictionary).

## 3. Renderowanie — stany placeholderów

Pusty placeholder:

- Tło `#F2F3F7` (secondary/muted z design systemu), obrys 1px dashed `#C7CAD6`.
- Ikona roli w stylu in-app (inline SVG 24×24, stroke 2, round caps — jak Lucide): `image` → ikona obrazka, `swatch` → kropla/paleta, `text` → litera/kursor.
- Pod ikoną `label` w aktywnym języku (DM Sans, muted `#6B6F80`, ~12–13px w skali 1:1). W slotach zbyt małych na tekst (kropki palety) — sama ikona lub tylko tło.
- Hover: obrys zmienia się na solid indigo `#4F46E5`, tło delikatnie jaśnieje; przejście 120–160ms ease (bez bounce).

Placeholder wypełniony:

- `image`: object-fit cover, przycięcie do kształtu slotu (koło = border-radius 50% / clip-path).
- `swatch`: pełne wypełnienie kolorem; hex pokazuj w tooltipie lub małej etykiecie na hover, nie na stałe.
- `text`: edycja inline. Domyślny font dla tytułów/podpisów: Caveat (już obecny w brandzie — moduł Notatnik) jako styl „script", z możliwością przełączenia na DM Sans. To treść użytkownika, nie UI — dlatego Caveat jest tu dopuszczalny.

Zaokrąglenia kafli: 8px na canvasie w skali bazowej (skalowane proporcjonalnie przy zoomie); kropki palety zawsze idealne koła. Cień kafli w szablonach `freeform`: miękki, o dużym promieniu, tintowany ink — `0 8px 24px rgba(30, 27, 75, 0.10)` — nigdy twardy szary 1–2px. W szablonie `polaroids` dodatkowo biała ramka ~4–6px wokół zdjęcia (efekt polaroidu), cień j.w.

## 4. Zachowanie edytora

Po wybraniu szablonu sloty stają się zwykłymi obiektami na canvasie — użytkownik może je przesuwać, skalować i usuwać (szablon to punkt startowy, nie klatka).

- Kategoria `grid`: snap-to-grid włączony, wyrównanie do sąsiadów.
- Kategoria `freeform`: snap-to-grid WYŁĄCZONY, ale włączone smart guides (przyciąganie do krawędzi i środków innych kafli oraz do marginesów canvasu, z wizualną linią pomocniczą). Bez tego plansze użytkowników szybko robią się chaotyczne.
- Warstwy: menu kontekstowe „Przenieś na wierzch / Przenieś pod spód / Wyżej / Niżej" (aktualizuje `z`).
- Rotacja: uchwyt rotacji na zaznaczeniu; przy rotacji przytrzymanie Shift skokuje co 15°.

## 5. Zgodność z design systemem veedeck

- Akcent wyłącznie indigo `#4F46E5` (zaznaczenia, aktywne obrysy, przyciski). Ink `#24252B`, muted `#6B6F80`, powierzchnie `#FFFFFF` / `#F2F3F7`.
- Typografia UI: DM Sans (body), Inter 600/700 (nagłówki galerii szablonów, tight tracking).
- Nazwy i opisy szablonów w galerii: bierz z `name`/`description` w danych (PL/EN przez i18n).
- Corner radius UI: 10px kontrolki, 14–18px karty miniatur w galerii.
- Motion: 120–240ms ease, bez spring/bounce.
- Żadnych emoji w UI galerii.

## 6. Kryteria akceptacji

1. Galeria pokazuje 10 szablonów w dwóch sekcjach (Siatki / Kolaże swobodne), miniatury generowane z danych.
2. Wybranie szablonu tworzy na canvasie komplet placeholderów zgodny ze slotami (pozycje, proporcje, rotacje, z-index).
3. Koła są kołami w px niezależnie od proporcji canvasu.
4. W `central-layers` kafel górny-lewy zasłania centralny, a dolny-prawy jest pod nim (test z-index).
5. W `polaroids` rotacje są widoczne, a kafle mają białą ramkę i miękki cień.
6. `classic-3x3` renderuje się na kwadratowym canvasie; pozostałe na 3:4.
7. Zmiana języka PL↔EN podmienia nazwy szablonów i etykiety pustych slotów.
8. Puste placeholdery spełniają stany z sekcji 3 (default / hover), wypełnione — cover/clip zgodnie z rolą.
9. Snap: włączony dla `grid`, wyłączony dla `freeform` (smart guides aktywne w obu).
10. Eksport planszy (jeśli moduł ma już eksport) zachowuje układ 1:1 z canvasem — współrzędne znormalizowane skalują się bezstratnie.

## 7. Poza zakresem (backlog, nie implementuj teraz)

- Pipeta koloru: automatyczne pobieranie dominującego koloru ze zdjęcia produktu (integracja z Veepick).
- Etykiety ról edytowalne przez użytkownika per slot.
- Własne szablony użytkownika (zapis aktualnego układu jako szablon).
