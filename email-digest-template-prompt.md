# Prompt: HTML Email Template — Digest Powiadomień veedeck

## Kontekst

Tworzę szablon HTML dla maila zbiorczego (digest) wysyłanego do projektantów wnętrz korzystających z aplikacji SaaS **veedeck**. Mail zastępuje wiele osobnych powiadomień jednym zbiorczym e-mailem, wysyłanym w wybranym przez usera interwale (15 min – raz dziennie).

Aplikacja jest po polsku. Projektant to osoba z branży projektowania wnętrz. Mail ma wyglądać profesjonalnie, minimalistycznie, designersko — zgodnie z estetyką branży.

---

## Czego potrzebuję

Zaprojektuj **jeden kompletny szablon HTML e-mail** (inline CSS, kompatybilny z Gmail, Outlook, Apple Mail) dla maila z podsumowaniem powiadomień.

---

## Struktura maila

### 1. Nagłówek
- Logo veedeck (placeholder: tekst "veedeck" lub slot na `<img>`)
- Temat maila (nie widoczny w treści, ale do opisania): `Masz {N} nowych powiadomień w veedeck`

### 2. Hero
- Tytuł: **"Podsumowanie powiadomień"**
- Podtytuł: `"Oto co wydarzyło się od ostatniego podsumowania:"`

### 3. Lista zdarzeń

Każde zdarzenie to jeden **kafelek / wiersz** w mailu. Może ich być od 1 do ~20. Każdy element zawiera:

- **Etykieta** — krótki label z typem zdarzenia (np. "Nowy pin", "Komentarz do produktu") — może mieć kolor lub ikonę
- **Opis** — tekst z kontekstem: kto, co, gdzie (bold na tytułach projektów/list)
- **Treść** (opcjonalna) — fragment wiadomości/komentarza (typy: pin, comment, list_comment)
- **Przycisk / link** "Przejdź →" lub "Zobacz" — link do konkretnego miejsca w aplikacji

#### Typy zdarzeń do pokazania w szablonie (pokaż każdy przynajmniej raz):

| Typ | Etykieta | Przykładowy opis |
|---|---|---|
| `pin` | Nowy pin | Anna K. · Salon · **Projekt Kowalski** — "Czy możemy zmienić kolor ściany?" |
| `comment` | Nowa wiadomość | Marek B. · Kuchnia · **Projekt Nowak** — "Kiedy będą gotowe kolejne rendery?" |
| `list_comment` | Komentarz do produktu | Julia W. · Sofa Malmo · **Lista Salon** — "Czy mają to w kolorze szarym?" |
| `product_approved` | Zatwierdzono produkt | Anna K. zaakceptowała **Lampa Nordlux** na liście **Lista Sypialnia** |
| `product_rejected` | Odrzucono produkt | Marek B. odrzucił **Krzesło Hay** na liście **Lista Jadalnia** |
| `status_request` | Prośba o status | Anna K. prosi o zmianę statusu **Wizualizacja 3** w projekcie **Projekt Kowalski** |
| `version_request` | Przywrócenie wersji | Marek B. prosi o przywrócenie wersji 2 pliku **Rzut parteru** |
| `survey_submitted` | Wypełniono ankietę | Anna K. wypełniła ankietę **Brief projektowy — Nowakowie** |

### 4. Stopka
- Tekst: "Zarządzaj powiadomieniami" — link do `/ustawienia/powiadomienia`
- Tekst: "Częstotliwość: co 30 minut" (dynamiczna wartość)
- Drobny tekst prawny / info o mailu
- Logo / "Powered by veedeck"

---

## Wytyczne designu

- **Styl:** minimalistyczny, designerski, profesjonalny — pasujący do branży projektowania wnętrz
- **Paleta:** biały/jasnoszary background, ciemny tekst, jeden kolor akcentu (fioletowy: `#4F46E5` lub neutralny ciemny)
- **Typografia:** bezszeryfowa, czytelna, hierarchia przez rozmiar i grubość
- **Etykiety typów:** mogą być kolorowe pille/badge lub neutralne z ikonką emoji
- **Oddzielenie elementów:** delikatne obramowanie lub separator między zdarzeniami
- **Mobile-friendly:** responsive, max-width 600px, działa na małych ekranach

---

## Wymagania techniczne

- Wszystkie style jako **inline CSS** (wymagane dla klientów pocztowych)
- Kompatybilność: Gmail (web + mobile), Outlook 2016+, Apple Mail, Samsung Mail
- Brak zewnętrznych fontów (użyj system fonts: `-apple-system, Arial, sans-serif`)
- Obrazki opcjonalne — nie polegaj na nich; tekst musi działać bez obrazków
- Szerokość: max 600px, wyśrodkowany
- Ciemny motyw: opcjonalnie `@media (prefers-color-scheme: dark)` w `<style>`

---

## Output

Jeden kompletny plik HTML z przykładowymi danymi (wszystkie 8 typów zdarzeń). Kod gotowy do wycięcia i użycia jako szablon — z placeholder'ami oznaczonymi komentarzami `<!-- PLACEHOLDER -->` tam gdzie wstawiane będą dynamiczne dane.
