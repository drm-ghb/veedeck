# Veedeck

Aplikacja webowa do zarządzania feedbackiem na wizualizacjach 3D. Projektant wgrywa rendery, organizuje je w projekty i pomieszczenia, a następnie udostępnia link klientowi. Klient przegląda pliki, dodaje komentarze z pinami bezpośrednio na renderze i zmienia statusy plików — wszystko w czasie rzeczywistym dzięki Pusherowi.

---

## Spis treści

- [Stos technologiczny](#stos-technologiczny)
- [Architektura projektu](#architektura-projektu)
- [Schemat bazy danych](#schemat-bazy-danych)
- [Instalacja i konfiguracja](#instalacja-i-konfiguracja)
- [Zmienne środowiskowe](#zmienne-środowiskowe)
- [Funkcje aplikacji](#funkcje-aplikacji)
  - [Uwierzytelnianie](#1-uwierzytelnianie)
  - [Projekty](#2-projekty)
  - [Pomieszczenia](#3-pomieszczenia)
  - [Rendery i przesyłanie plików](#4-rendery-i-przesyłanie-plików)
  - [Podgląd renderu (RenderViewer)](#5-podgląd-renderu-renderviewer)
  - [Komentarze z pinami](#6-komentarze-z-pinami)
  - [Statusy plików](#7-statusy-plików)
  - [Link udostępniania dla klienta](#8-link-udostępniania-dla-klienta)
  - [Prośba o zmianę statusu](#9-prośba-o-zmianę-statusu)
  - [Powiadomienia](#10-powiadomienia)
  - [Komunikacja w czasie rzeczywistym](#11-komunikacja-w-czasie-rzeczywistym)
  - [Motyw interfejsu](#12-motyw-interfejsu)
- [Struktura katalogów](#struktura-katalogów)
- [API — przegląd endpointów](#api--przegląd-endpointów)

---

## Stos technologiczny

| Warstwa | Technologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Język | TypeScript |
| Stylowanie | Tailwind CSS |
| Komponenty UI | shadcn/ui |
| Baza danych | PostgreSQL (Railway) |
| ORM | Prisma 7 z adapterem `@prisma/adapter-pg` |
| Uwierzytelnianie | NextAuth.js v5 (Auth.js) — strategia JWT |
| Przesyłanie plików | UploadThing (maks. 16 MB, do 10 plików naraz) |
| Komunikacja real-time | Pusher (kanały: `render-*`, `user-*`, `share-*`) |
| Ikony | Lucide React |
| Powiadomienia toast | Sonner |
| Fonty | Inter + DM Sans (Google Fonts) |

---

## Architektura projektu

Aplikacja jest podzielona na dwa główne konteksty użytkowników:

**Projektant** — zalogowany użytkownik, który:
- zarządza projektami, pomieszczeniami i renderami przez panel (`/dashboard`)
- przegląda i ocenia komentarze klientów
- zmienia statusy plików i rozpatruje prośby o zmianę statusu
- dostęp chroniony sesją JWT

**Klient** — niezalogowany użytkownik, który:
- wchodzi przez unikalny link udostępniania (`/share/[token]`)
- przegląda rendery przypisane do projektu
- dodaje komentarze z pinami
- akceptuje pliki i wysyła prośby o zmianę statusu
- identyfikowany tylko imieniem przechowywanym w `localStorage`

Obie strony komunikują się z tą samą bazą danych przez API REST i otrzymują aktualizacje w czasie rzeczywistym przez Pushera.

---

## Schemat bazy danych

```
User
  ├── projects[]       → Project
  └── notifications[]  → Notification

Project
  ├── rooms[]          → Room
  └── renders[]        → Render

Room
  └── renders[]        → Render

Render
  └── comments[]       → Comment
                            └── replies[] → Reply

StatusChangeRequest    (prośby klientów o zmianę statusu)
Notification           (powiadomienia dla projektanta)
```

### Modele Prisma

**User** — dane konta: `id`, `name`, `email`, `password` (bcrypt), `image`

**Project** — projekt: `title`, `clientName`, `clientEmail`, `description`, `shareToken` (unikalny token udostępniania), `archived`

**Room** — pomieszczenie w projekcie: `name`, `type` (enum: TOALETA, WC, SALON, KUCHNIA, SYPIALNIA, INNE), `icon`, `order`, `archived`

**Render** — plik wizualizacji: `name`, `fileUrl`, `fileKey`, `order`, `archived`, `status` (enum: REVIEW, ACCEPTED), relacja do `Room` (opcjonalna)

**Comment** — komentarz z pinem: `content`, `title`, `posX`, `posY` (pozycja pinu w % szerokości/wysokości obrazu), `status` (NEW, IN_PROGRESS, DONE), `author`

**Reply** — odpowiedź na komentarz: `content`, `author`

**Notification** — powiadomienie dla projektanta: `message`, `link`, `read`, `type` (`info` lub `status_request`), `requestId`, `projectId`, `projectTitle`

**StatusChangeRequest** — prośba klienta o zmianę statusu renderu: `renderId`, `renderName`, `clientName`, `projectId`, `shareToken`, `status` (PENDING, CONFIRMED, REJECTED)

---

## Instalacja i konfiguracja

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/drm-ghb/RenderFlow.git
cd RenderFlow

# 2. Zainstaluj zależności
npm install

# 3. Utwórz plik zmiennych środowiskowych
cp .env.example .env.local
# (uzupełnij wartości — patrz sekcja poniżej)

# 4. Zsynchronizuj schemat z bazą danych
npx prisma db push

# 5. Wygeneruj klienta Prisma
npx prisma generate

# 6. Uruchom serwer deweloperski
npm run dev
```

Aplikacja dostępna pod adresem: [http://localhost:3000](http://localhost:3000)

---

## Zmienne środowiskowe

Utwórz plik `.env.local` w katalogu głównym projektu:

```env
# Baza danych PostgreSQL
DATABASE_URL="postgresql://user:password@host:port/dbname"

# NextAuth — sekret sesji (dowolny losowy ciąg znaków)
AUTH_SECRET="twoj-tajny-klucz-min-32-znaki"

# Pusher — komunikacja real-time
# https://pusher.com → utwórz aplikację → dane z zakładki "App Keys"
PUSHER_APP_ID="twoje-app-id"
PUSHER_KEY="twoj-klucz"
PUSHER_SECRET="twoj-sekret"
PUSHER_CLUSTER="eu"
NEXT_PUBLIC_PUSHER_KEY="twoj-klucz"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"

# UploadThing — przesyłanie plików
# https://uploadthing.com → utwórz aplikację
UPLOADTHING_TOKEN="twoj-token"
```

> **Uwaga:** Plik `.env.local` jest wykluczony z repozytorium przez `.gitignore`. Nigdy nie commituj danych dostępowych.

---

## Funkcje aplikacji

### 1. Uwierzytelnianie

**Pliki:** `src/lib/auth.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/api/auth/`

Aplikacja używa **NextAuth.js v5** z strategią sesji JWT i dostawcą `CredentialsProvider`. Hasła są hashowane algorytmem **bcrypt** przed zapisem do bazy.

**Rejestracja** (`POST /api/auth/register`):
- Sprawdza czy email jest już zajęty
- Hashuje hasło przez `bcrypt.hash(password, 10)`
- Tworzy rekord `User` w bazie

**Logowanie** (`POST /api/auth/[...nextauth]`):
- Weryfikuje email i hasło przez `bcrypt.compare`
- Przy poprawnych danych tworzy token JWT zawierający `id` użytkownika
- Sesja przechowywana w ciasteczku HTTP-only

**Ochrona tras:** Layout dashboardu (`src/app/(dashboard)/layout.tsx`) wywołuje `auth()` przy każdym żądaniu — brak sesji przekierowuje na `/login`.

---

### 2. Projekty

**Pliki:** `src/components/dashboard/ProjectsView.tsx`, `src/components/dashboard/ProjectView.tsx`, `src/components/dashboard/NewProjectDialog.tsx`, `src/components/dashboard/EditProjectDialog.tsx`, `src/components/dashboard/ProjectMenu.tsx`, `src/app/api/projects/`

Projekt to główny kontener organizujący pracę z klientem. Zawiera pomieszczenia i rendery.

**Tworzenie projektu** — dialog `NewProjectDialog` zbiera: tytuł (wymagany), nazwa klienta, email klienta, opis. Po zapisaniu wysyła `POST /api/projects`.

**Lista projektów** — `ProjectsView` pobiera projekty przez `GET /api/projects`. Dostępne dwa tryby widoku: **kafelki** (ProjectCard z miniaturą i metadanymi) i **lista** (tabela). Przełącznik trybu widoku zapisuje preferencję w stanie komponentu.

**Edycja projektu** — `EditProjectDialog` wysyła `PATCH /api/projects/[id]` z dowolnym podzbiorem pól (tytuł, klient, opis).

**Archiwizacja** — projekt można zarchiwizować przez `PATCH /api/projects/[id]` z `{ archived: true }`. Zarchiwizowane projekty ukrywane są domyślnie w widoku.

**Usuwanie** — `DELETE /api/projects/[id]` usuwa projekt kaskadowo (w tym pomieszczenia, rendery i komentarze) dzięki relacjom Prisma z `onDelete: Cascade`.

**Link udostępniania** — każdy projekt ma unikalny `shareToken` generowany przez `cuid()`. Dialog `ShareDialog` wyświetla gotowy link (`/share/[token]`), a `CopyLinkButton` kopiuje go do schowka.

---

### 3. Pomieszczenia

**Pliki:** `src/components/dashboard/AddRoomDialog.tsx`, `src/components/dashboard/EditRoomDialog.tsx`, `src/components/dashboard/RoomMenu.tsx`, `src/components/dashboard/RoomCard.tsx`, `src/app/api/rooms/`

Pomieszczenia grupują rendery wewnątrz projektu (np. Kuchnia, Salon, Sypialnia). Każde pomieszczenie ma przypisany typ z enum `RoomType` oraz opcjonalną ikonę.

**Tworzenie pomieszczenia** — `AddRoomDialog` wysyła `POST /api/rooms` z polami: `projectId`, `name`, `type`, `icon`. Pole `order` jest ustawiane automatycznie na liczbę istniejących pomieszczeń.

**Typy pomieszczeń** — zdefiniowane w enum Prisma: `TOALETA`, `WC`, `SALON`, `KUCHNIA`, `SYPIALNIA`, `INNE`. Każdemu typowi przypisana jest ikona Lucide React przez `src/lib/roomIcons.tsx`.

**Edycja** — `EditRoomDialog` wysyła `PATCH /api/rooms/[id]` aktualizując nazwę, typ lub ikonę.

**Archiwizacja i usuwanie** — analogicznie do projektów; usunięcie pomieszczenia kaskadowo usuwa powiązane rendery i komentarze.

**Widok kafelki / lista** — `ProjectView` oferuje przełącznik trybu wyświetlania pomieszczeń. W trybie listy widoczna jest ikona, nazwa i liczba renderów.

---

### 4. Rendery i przesyłanie plików

**Pliki:** `src/components/render/RenderUploader.tsx`, `src/components/render/RoomView.tsx`, `src/components/render/RenderThumbnail.tsx`, `src/components/render/RenderMenu.tsx`, `src/app/api/renders/`

Render to pojedynczy plik wizualizacji (obraz) przypisany do projektu i opcjonalnie do pomieszczenia.

**Wgrywanie plików** — komponent `RenderUploader` używa hooka `useUploadThing("renderUploader")` z biblioteki UploadThing. Obsługuje:
- przeciąganie i upuszczanie plików (drag & drop)
- wybór przez kliknięcie
- wiele plików jednocześnie (do 10, maks. 16 MB każdy)
- pasek postępu dla każdego pliku z osobna

Po zakończeniu uploadu UploadThing zwraca `fileUrl` i `fileKey`. Komponent wysyła `POST /api/renders` rejestrując render w bazie danych.

**Usuwanie pliku** — `DELETE /api/renders/[id]` usuwa rekord z bazy. Plik na serwerze UploadThing można usunąć przez ich API (opcjonalne).

**Zmiana nazwy** — `PATCH /api/renders/[id]` z polem `name`.

**Widok pomieszczeń** — `RoomView` wyświetla rendery w siatce kafelków lub liście z miniaturą, nazwą, liczbą komentarzy i statusem. Dostępny przełącznik trybu widoku.

---

### 5. Podgląd renderu (RenderViewer)

**Plik:** `src/components/render/RenderViewer.tsx`

Główny komponent aplikacji — pełnoekranowy podgląd renderu z narzędziami do pracy. Używany zarówno przez projektanta (`/projects/[id]/renders/[renderId]`) jak i klienta (widok `render` w `/share/[token]`).

**Nagłówek** zawiera:
- przycisk **Wróć** — projektant wraca do folderu pomieszczenia, klient do listy renderów w pomieszczeniu
- **nazwa pomieszczenia** (pogrubiona) i nazwa renderu (szara) pod nią
- liczniki statusów komentarzy: `to do`, `in progress`, `done`
- przełącznik statusu renderu (projektant) lub przycisk akceptacji (klient)
- przycisk **Podgląd** — otwiera lightbox
- przycisk **Dodaj pin** — przełącza tryb dodawania pinów
- przycisk **Lista** — pokazuje/ukrywa panel komentarzy

**Panel miniatur** (lewy) — widoczny gdy pomieszczenie zawiera więcej niż jeden render. Pozwala przeskakiwać między renderami bez powrotu do listy. Aktywny render wyróżniony niebieską ramką.

**Obszar obrazu** — kliknięcie w trybie `view` otwiera lightbox; w trybie `pin` umieszcza nowy pin na klikniętej pozycji (współrzędne zapisywane w % szerokości/wysokości).

**Panel komentarzy** (prawy) — lista wszystkich pinów z tytułem, statusem, autorem, datą i liczbą odpowiedzi. Kliknięcie pinu przenosi do jego popupu na obrazie.

**Lightbox** — pełnoekranowy podgląd z możliwością:
- zoomu kółkiem myszy (zakres 25%–500%)
- zoomu przyciskami +/–
- resetu zoomu do 100%
- wyświetlenia pinów na powiększonym obrazie
- przejścia do trybu dodawania pinu bez zamykania lightboxa

---

### 6. Komentarze z pinami

**Pliki:** `src/app/api/comments/route.ts`, `src/app/api/comments/[id]/route.ts`, `src/app/api/comments/[id]/replies/route.ts`

System komentarzy pozwala precyzyjnie wskazywać miejsca na renderze wymagające zmiany.

**Dodawanie pinu:**
1. Użytkownik klika przycisk **Dodaj pin** (tryb `pin`)
2. Kliknięcie na obraz tworzy tymczasowy niebieski pin animowany pulsem
3. Pojawia się popup z formularzem: tytuł (opcjonalny) i treść (wymagana)
4. Po zapisaniu — `POST /api/comments` — pin staje się numerowanym kołem kolorem odpowiadającym statusowi

**Kolory pinów:**
- 🔴 Czerwony — `NEW` (nowy)
- 🟡 Żółty — `IN_PROGRESS` (w trakcie)
- 🟢 Zielony — `DONE` (gotowe)

**Popup wątku** — kliknięcie istniejącego pinu otwiera popup z oryginalnym komentarzem, odpowiedziami chronologicznie i formularzem odpowiedzi. Projektant widzi dodatkowo przyciski zmiany statusu (NEW / IN_PROGRESS / DONE) i przycisk usunięcia.

**Odpowiedzi** — `POST /api/comments/[id]/replies` zapisuje odpowiedź z imieniem autora i datą. Odpowiedź można usunąć przez `DELETE /api/comments/[id]/replies/[replyId]` — endpoint rozgłasza zdarzenie `reply-deleted` przez Pushera.

**Aktualizacja statusu** — `PATCH /api/comments/[id]` z polem `status`. Po zmianie Pusher rozgłasza zdarzenie `comment-updated` do wszystkich połączonych klientów oglądających ten render.

**Usuwanie** — `DELETE /api/comments/[id]` usuwa komentarz z replikami kaskadowo. Pusher rozgłasza `comment-deleted`.

**Synchronizacja real-time** — komponent `RenderViewer` subskrybuje kanał `render-${renderId}` i nasłuchuje zdarzeń:
- `new-comment` — dodaje pin na obrazie
- `comment-updated` — aktualizuje status i treść
- `comment-deleted` — usuwa pin

---

### 7. Statusy plików

**Plik:** `src/app/api/renders/[id]/route.ts`

Każdy render posiada status wyrażony enumem `RenderStatus`:

| Status | Znaczenie | Kolor |
|---|---|---|
| `REVIEW` | Do weryfikacji — plik czeka na ocenę | Niebieski |
| `ACCEPTED` | Zaakceptowany — klient zatwierdził plik | Zielony |

**Projektant** — widzi w nagłówku `RenderViewer` przełącznik segmentowy z dwoma opcjami. Kliknięcie dowolnej opcji wysyła `PATCH /api/renders/[id]` z nowym statusem.

**Klient** — widzi przycisk **Zaakceptuj** gdy status to `REVIEW`. Po kliknięciu wysyła `PATCH /api/share/[token]/renders/[renderId]` (endpoint niewymagający logowania, walidowany tokenem). Gdy status to `ACCEPTED` — klient widzi zieloną etykietę i link **Poproś o zmianę**.

---

### 8. Link udostępniania dla klienta

**Pliki:** `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/route.ts`

Projektant generuje unikalny link (`/share/[token]`) i wysyła go klientowi. Link nie wymaga zakładania konta.

**Identyfikacja klienta** — przy pierwszym wejściu na stronę wyświetlany jest formularz z polem na imię. Imię zapisywane jest w `localStorage` pod kluczem `renderflow-author` i używane jako autor komentarzy oraz nazwa nadawcy próśb.

**Nawigacja klienta** — trzypoziomowa struktura SPA (Single Page Application) zarządzana stanem `view`:
1. **Widok pomieszczeń** (`rooms`) — siatka pomieszczeń z ikoną, nazwą i liczbą renderów
2. **Widok pomieszczenia** (`room`) — siatka renderów z miniaturą, statusem i liczbą komentarzy
3. **Widok renderu** (`render`) — pełnoekranowy `RenderViewer`

**Dane projektu** — `GET /api/share/[token]` zwraca pełną strukturę projektu: pomieszczenia z renderami, renderami z komentarzami i odpowiedziami. Walidacja polega tylko na istnieniu tokenu.

**Real-time dla klienta** — strona subskrybuje kanał Pusher `share-${token}` i nasłuchuje zdarzenia `status-request-resolved` — po rozpatrzeniu prośby przez projektanta klient natychmiast widzi wynik przez toast.

---

### 9. Prośba o zmianę statusu

**Pliki:** `src/app/api/share/[token]/renders/[renderId]/status-request/route.ts`, `src/app/api/status-requests/[id]/route.ts`

Gdy klient zaakceptuje render i zechce go cofnąć do weryfikacji, nie może tego zrobić bezpośrednio — musi wysłać prośbę do projektanta.

**Przepływ:**

```
Klient klika "Poproś o zmianę"
        ↓
POST /api/share/[token]/renders/[renderId]/status-request
  → tworzy StatusChangeRequest (status: PENDING)
  → tworzy Notification dla projektanta (type: "status_request")
  → Pusher trigger → kanał user-{userId} → zdarzenie "new-notification"
        ↓
Projektant widzi powiadomienie w dzwonku/zakładce Powiadomienia
z przyciskami "Potwierdź" i "Odrzuć"
        ↓
PATCH /api/status-requests/[id] z { action: "confirm" | "reject" }
  → aktualizuje StatusChangeRequest.status
  → jeśli "confirm": ustawia render.status = "REVIEW"
  → Pusher trigger → kanał share-{token} → zdarzenie "status-request-resolved"
        ↓
Klient otrzymuje toast z informacją o decyzji projektanta
```

**Zabezpieczenia:**
- Prośba może być złożona tylko raz na render naraz (przycisk znika po kliknięciu, pojawia się dopiero po decyzji)
- Projektant musi być właścicielem projektu aby rozpatrzyć prośbę
- Jeśli prośba już rozpatrzona (`status !== "PENDING"`) — API zwraca 409

---

### 10. Powiadomienia

**Pliki:** `src/components/dashboard/NotificationBell.tsx`, `src/app/(dashboard)/notifications/NotificationsClient.tsx`, `src/app/api/notifications/`

System powiadomień informuje projektanta o aktywności klientów.

**Typy powiadomień:**
- `info` — nowy komentarz klienta na renderze (generowany przy `POST /api/comments`)
- `status_request` — prośba klienta o zmianę statusu

**Dzwonek powiadomień** (`NotificationBell`) — ikona w nawigacji z czerwoną odznaką licznika nieprzeczytanych. Subskrybuje kanał Pusher `user-${userId}` i dynamicznie aktualizuje licznik bez przeładowania strony.

**Strona powiadomień** (`/notifications`):
- Lista wszystkich powiadomień posortowanych chronologicznie
- **Filtry projektów** — gdy powiadomień jest z wielu projektów, pojawiają się przyciski filtrowania z licznikiem nieprzeczytanych
- **Zaznaczanie** — checkbox przy każdym powiadomieniu + "Zaznacz wszystkie"
- **Operacje zbiorcze** — oznacz zaznaczone jako przeczytane / nieprzeczytane (`PATCH /api/notifications`)
- **Akcje dla próśb o zmianę statusu** — bezpośrednio w powiadomieniu przyciski **Potwierdź** i **Odrzuć** (tylko dla `type: "status_request"` i dopóki prośba nie rozpatrzona)
- Link **"Zobacz"** przenosi do konkretnego renderu i oznacza powiadomienie jako przeczytane

---

### 11. Komunikacja w czasie rzeczywistym

**Plik:** `src/lib/pusher.ts`

Aplikacja używa Pushera do natychmiastowej synchronizacji stanu między wieloma przeglądarkami.

**Kanały i zdarzenia:**

| Kanał | Zdarzenie | Kierunek | Opis |
|---|---|---|---|
| `render-{renderId}` | `new-comment` | serwer → klienci | Nowy komentarz dodany przez kogokolwiek |
| `render-{renderId}` | `comment-updated` | serwer → klienci | Zmiana statusu komentarza |
| `render-{renderId}` | `comment-deleted` | serwer → klienci | Usunięcie komentarza |
| `render-{renderId}` | `comment-reply` | serwer → klienci | Nowa odpowiedź na komentarz |
| `render-{renderId}` | `reply-deleted` | serwer → klienci | Usunięcie odpowiedzi na komentarz |
| `user-{userId}` | `new-notification` | serwer → projektant | Nowe powiadomienie (komentarz, prośba) |
| `share-{token}` | `status-request-resolved` | serwer → klient | Decyzja projektanta o prośbie statusu |

**Konfiguracja:** `pusherServer` (Node.js SDK) używany w route handlerach do rozgłaszania zdarzeń. `pusherClient` (przeglądarkowy SDK) subskrybuje kanały w komponentach klienckich przez `useEffect`.

---

### 12. Motyw interfejsu

**Pliki:** `src/lib/theme.tsx`, `src/components/dashboard/SettingsButton.tsx`

Aplikacja obsługuje trzy tryby kolorystyczne: jasny, ciemny i systemowy.

**ThemeProvider** (`src/lib/theme.tsx`) — opakowuje całą aplikację i zarządza stanem motywu. Preferencja przechowywana jest w `localStorage` pod kluczem `renderflow-theme`. W trybie `system` motyw reaguje dynamicznie na zmianę preferencji systemowych przez `matchMedia`.

**SettingsButton** (`src/components/dashboard/SettingsButton.tsx`) — przycisk z ikoną koła zębatego w nawigacji dashboardu. Po kliknięciu otwiera panel z trzema opcjami:
- **Jasny** (ikona słońca)
- **Ciemny** (ikona księżyca)
- **Systemowy** (ikona monitora)

Aktywna opcja wyróżniona kolorem primary. Panel zamyka się po kliknięciu poza nim.

**Logo** — `public/logo-dark.svg` — wariant logo dla ciemnego tła, używany w nawigacji gdy aktywny jest motyw ciemny.

---

## Struktura katalogów

```
public/
└── logo-dark.svg                  # Logo do ciemnego motywu

src/
├── app/
│   ├── (auth)/                    # Trasy publiczne: logowanie i rejestracja
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/               # Trasy chronione sesją (layout z nawigacją)
│   │   ├── layout.tsx             # Nawigacja projektanta + ochrona auth
│   │   ├── dashboard/page.tsx     # Lista projektów
│   │   ├── notifications/         # Powiadomienia
│   │   └── projects/[id]/
│   │       ├── page.tsx           # Widok projektu (pomieszczenia)
│   │       ├── renders/[renderId]/page.tsx   # Podgląd renderu (projektant)
│   │       └── rooms/[roomId]/page.tsx       # Widok pomieszczenia z renderami
│   ├── api/                       # Route Handlers (API REST)
│   │   ├── auth/                  # NextAuth + rejestracja
│   │   ├── comments/              # CRUD komentarzy i odpowiedzi
│   │   ├── notifications/         # CRUD powiadomień
│   │   ├── projects/              # CRUD projektów
│   │   ├── renders/               # CRUD renderów
│   │   ├── rooms/                 # CRUD pomieszczeń
│   │   ├── share/[token]/         # API dla klienta (bez auth)
│   │   ├── status-requests/       # Rozpatrywanie próśb o zmianę statusu
│   │   └── uploadthing/           # Endpoint przesyłania plików
│   ├── share/[token]/page.tsx     # Widok klienta (SPA)
│   └── layout.tsx                 # Root layout (fonty, Toaster)
├── components/
│   ├── dashboard/                 # Komponenty panelu projektanta
│   │   └── SettingsButton.tsx     # Przycisk ustawień z przełącznikiem motywu
│   └── render/                    # Komponenty podglądu renderów
│       ├── RenderViewer.tsx       # Główny komponent podglądu (projektant + klient)
│       ├── RenderUploader.tsx     # Upload plików
│       ├── RoomView.tsx           # Lista renderów w pomieszczeniu
│       └── RenderThumbnail.tsx    # Miniatura renderu
└── lib/
    ├── auth.ts                    # Konfiguracja NextAuth
    ├── prisma.ts                  # Singleton klienta Prisma (z adapterem PrismaPg)
    ├── pusher.ts                  # Konfiguracja Pusher (server + client)
    ├── uploadthing.ts             # Konfiguracja FileRouter UploadThing
    ├── roomIcons.tsx              # Mapowanie typów pomieszczeń na ikony Lucide
    ├── theme.tsx                  # ThemeProvider i hook useTheme (dark/light/system)
    └── utils.ts                   # Pomocnicze funkcje (cn — merge klas Tailwind)
```

---

## API — przegląd endpointów

### Autoryzowane (wymagają sesji JWT)

| Metoda | Endpoint | Opis |
|---|---|---|
| `GET` | `/api/projects` | Lista projektów zalogowanego użytkownika |
| `POST` | `/api/projects` | Utwórz nowy projekt |
| `GET` | `/api/projects/[id]` | Szczegóły projektu z renderami |
| `PATCH` | `/api/projects/[id]` | Edytuj / archiwizuj projekt |
| `DELETE` | `/api/projects/[id]` | Usuń projekt kaskadowo |
| `POST` | `/api/rooms` | Utwórz pomieszczenie |
| `PATCH` | `/api/rooms/[id]` | Edytuj pomieszczenie |
| `DELETE` | `/api/rooms/[id]` | Usuń pomieszczenie |
| `POST` | `/api/renders` | Zarejestruj render po uploadzie |
| `PATCH` | `/api/renders/[id]` | Zmień nazwę / status / archiwizuj render |
| `DELETE` | `/api/renders/[id]` | Usuń render |
| `POST` | `/api/comments` | Dodaj komentarz z pinem |
| `PATCH` | `/api/comments/[id]` | Zmień status komentarza |
| `DELETE` | `/api/comments/[id]` | Usuń komentarz |
| `POST` | `/api/comments/[id]/replies` | Dodaj odpowiedź na komentarz |
| `DELETE` | `/api/comments/[id]/replies/[replyId]` | Usuń odpowiedź na komentarz |
| `GET` | `/api/notifications` | Lista powiadomień |
| `PATCH` | `/api/notifications` | Oznacz wiele jako przeczytane/nieprzeczytane |
| `PATCH` | `/api/notifications/[id]` | Oznacz jedno powiadomienie |
| `PATCH` | `/api/status-requests/[id]` | Potwierdź lub odrzuć prośbę o zmianę statusu |

### Publiczne (walidacja tokenem, bez sesji)

| Metoda | Endpoint | Opis |
|---|---|---|
| `GET` | `/api/share/[token]` | Dane projektu dla klienta |
| `PATCH` | `/api/share/[token]/renders/[renderId]` | Zmiana statusu renderu przez klienta |
| `POST` | `/api/share/[token]/renders/[renderId]/status-request` | Złóż prośbę o zmianę statusu |
| `GET/POST` | `/api/uploadthing` | Obsługa przesyłania plików (UploadThing) |
| `POST` | `/api/auth/register` | Rejestracja nowego konta |
