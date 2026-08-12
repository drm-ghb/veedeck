# Do wdrożenia — link aktywacyjny i udostępnianie list klientom

Stan na: 2026-08-01. Kontekst: naprawa mechanizmu udostępniania list zakupowych klientom, żeby działał tym samym mechanizmem co link aktywacyjny (`/p/{token}` → auto-logowanie → panel klienta).

Decyzja architektoniczna towarzysząca: panel klienta zostaje pod `/client/[projectId]` (Wariant A) — patrz [MEMORY.md](MEMORY.md).

---

## Już wdrożone (na dysku, czeka na potwierdzenie uruchomienia/testów)

1. **`src/app/api/client/[projectId]/lists/[listId]/route.ts`** — endpoint otwierający listę w panelu klienta dopasowany, żeby działał też dla list podpiętych przez `clientId`, nie tylko `projectId`. Bez tego lista pojawiała się w sidebarze, ale kliknięcie dawało 404.

2. **`src/app/(listy)/listy-zakupowe/[slug]/page.tsx`** — `clientName` i `clientHasAccount` liczone też z danych klienta przez projekt-host (`Project.client.contacts`), nie tylko z `ProjectClient.projectId`. Bez tego przycisk „Udostępnij klientowi" był zablokowany dla klientów bez prawdziwego projektu w ProjectFlow.

3. **`src/app/api/lists/[id]/route.ts`** — przy udostępnieniu listy klientowi bez konta: auto-tworzenie konta (`User role:"client"`), generowanie `AccessToken`, wysyłka linku `/p/{token}?listId=...` zamiast starego, zepsutego `/share/list/{token}?cn=...`. Zwraca `accountCreated` w odpowiedzi PATCH (potrzebne do punktu 6 niżej).

---

## Do zrobienia

4. **Ujednolicić `resolveShareTarget`** (w `api/lists/[id]/route.ts`) — usunąć goły link `/client/{projectId}?view=list` dla list podpiętych pod prawdziwy projekt ProjectFlow. Dziś tylko ścieżka klient/projekt-host idzie przez token; ścieżka „prawdziwy projekt" nadal wysyła link bez auto-logowania — czyli ten sam objaw co na starcie problemu, w innej gałęzi kodu. Docelowo: zawsze `/p/{token}?listId=...`, niezależnie od tego, czy kontakt jest podpięty przez `projectId` czy `clientId`.

5. **Przycisk „Kopiuj link"** w `src/components/listy/ListDetail.tsx:1192` (`copyClientLink()`) — nadal buduje `/share/list/{shareToken}` (stary, zepsuty adres, bez tokena, bez sesji) dla list bez projektu. Naprawiony jest tylko mail; ręczne kopiowanie linku wciąż odtwarza pierwotny bug. Wymaga nowego (lub rozszerzonego) endpointu zwracającego aktywny token przez `getActiveAccessToken()` (już istnieje w `src/lib/access-token.ts`) zamiast budowania URL-a czysto po stronie klienta.

6. **Toast rozróżniający wynik udostępnienia** w `ListDetail.tsx` — po PATCH odczytać `accountCreated` z odpowiedzi i pokazać „Utworzono konto klienta i udostępniono listę" zamiast zwykłego „Udostępniono klientowi", gdy konto zostało założone przy okazji. Ustalone wcześniej jako wariant A+toast.

7. **`src/app/share/list/[token]/page.tsx:70`** — zalogowany klient z listą podpiętą przez `clientId` (bez projektu) nie jest przekierowywany do `/client/{id}`, bo warunek sprawdza tylko `list.project`. Skutek: klient już zalogowany, klikający stary/zakładkowy link `/share/list/...`, nadal ląduje bez sidebara i navbaru.

8. **`robots.txt` / `src/app/robots.ts`** — dodać `Disallow: /p/`. W projekcie nie ma obecnie żadnego robots.txt. Zalecenie z analizy bezpieczeństwa Capability URL i z pierwotnego briefu (Faza 4 hardening).

9. **Decyzja produktowa: co dalej z `/share/list/[token]` i `?cn=` w `ClientNameGate.tsx`.** Po punkcie 4 ta ścieżka przestaje być używana przez nowe udostępnienia, ale stare, już wysłane maile z tym wzorcem linku nadal by tam trafiały. Do ustalenia: zostawić jako fallback dla starych linków, czy aktywnie wygaszać (np. przekierowanie na komunikat „ten link wygasł, poproś o nowy").

---

## Przegląd bezpieczeństwa (na podstawie dostarczonej analizy Magic Link / Capability URL)

Klasyfikacja: `/p/{token}` to **Capability URL** (długożyjący, wielorazowy, kontrola przez cofnięcie), nie klasyczny Magic Link logowania (5–15 min, single-use). Oceniane względem właściwej checklisty.

**Już spełnione (zweryfikowane w kodzie):**
- Entropia tokena: 256 bitów (`crypto.randomBytes(32)`, `access-token.ts:24`) — dwa razy więcej niż minimum 128 bitów.
- Przechowywanie: tylko `sha256(token)` w bazie, surowy token nigdy nie trafia do DB.
- CSPRNG (`crypto.randomBytes`, nie `Math.random()`).
- `Referrer-Policy: strict-origin-when-cross-origin` — ustawione globalnie w `next.config.ts:12`.
- Szybka konsumpcja + przekierowanie na czysty URL (`/p/[token]/page.tsx` → `router.replace()`).
- Brak logowania surowych tokenów w `console.error`.
- Odporność na „zużycie" przez skanery poczty — token jest wielorazowy z założenia.

**Świadomie odrzucone (sprzeczne z wymaganiami produktowymi, nie przeoczenie):**
- Device binding — złamałby wymaganie, że link ma działać na dowolnym urządzeniu klienta (telefon, inny IP niż nadawca).
- Krótkie wygasanie / single-use — sprzeczne z „bezterminowo, wielorazowo, kontrola przez cofnięcie", ustalonym na starcie tej pracy.
- PIN domyślnie — pole `pinFailures` już zascaffoldowane w schemacie na przyszłość (np. kosztorysy), nieużywane dziś.

**Jedyny konkretny punkt akcji z analizy:** `robots.txt` z `Disallow: /p/` — patrz punkt 8 wyżej (to samo zadanie, nie duplikat pracy).
