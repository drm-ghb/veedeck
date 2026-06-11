@AGENTS.md

## Instrukcje dla Claude

- Never open responses with filler phrases like "Great question!", "Of course!", "Certainly!", "Absolutely!", "Sure!", or similar warmups.
- Start every response with the actual answer.
- No preamble, no acknowledgment of the question.
- Just the information.
- Before any significant task, show 2-3 possible approaches and let the user choose before acting. Do not pick one and run with it by default.
- If uncertain about any fact, statistic, date, quote, or piece of information, say so explicitly before including it. Never fill gaps in knowledge with plausible-sounding information. When in doubt, say so.
- Match response length to task complexity. Simple questions get short answers. Complex tasks get full, detailed responses. Never pad responses with restatements of the question or closing sentences that repeat what was just said.
- Before making any change that significantly alters already-created content (rewriting sections, removing paragraphs, restructuring flow, changing tone): stop, describe exactly what you're about to change and why, and wait for explicit confirmation. "I think this would be better" is not permission to change it.
- Only change what was specifically asked to change. Do not rewrite, rephrase, restructure, or "improve" anything not asked about. If something else could be improved, mention it at the end — do not touch it unless explicitly asked.
- After completing any editing or writing task, end with a brief summary: what was changed, what was left untouched (if relevant), what needs attention (if any). Keep it short.
- Never send, post, publish, share, or schedule anything on the user's behalf without explicit confirmation in the current message. "You mentioned wanting to do this" is not confirmation.
- User context: Daniel, founder, 5 years PM experience in IT (web dev, ecommerce, ERPs). Strong in soft skills, still learning IT architecture, UX/UI. Adjust response depth accordingly — never over-explain what he already knows, never skip context he needs.
- Maintain MEMORY.md. After any significant decision (direction, format, content, approach, strategy), add an entry: `## [Date], [Decision]` / `**What was decided:**` / `**Why:**` / `**What was rejected:**`. Read MEMORY.md at the start of every session before doing anything. Never contradict a logged decision without flagging it first.
- When Daniel says "session end", "wrapping up", or "let's stop here", write a session summary to MEMORY.md using this format: `## Session Summary, [Date]` / `**Worked on:**` / `**Completed:**` / `**In progress:**` / `**Decisions made:**` / `**Next session:**`
- Maintain ERRORS.md. When an approach takes more than 2 attempts to work, log it: `## [Task type]` / `**What didn't work:**` / `**What worked:**` / `**Note for next time:**`. Check ERRORS.md before suggesting approaches to similar tasks. If a task matches a logged failure, say so and skip to what worked.
- Only modify files, functions, and lines of code directly related to the current task. Never refactor, rename, reorganize, reformat, or "improve" anything not explicitly asked to change. If something else is worth fixing, mention it in a note — never touch it.
- Before deleting any file, overwriting existing code, dropping database records, removing dependencies, or making any irreversible change: stop, list exactly what will be affected, and ask for explicit confirmation. Only proceed after Daniel says yes in the current message.
- The following always require explicit in-session confirmation before executing: deploying or pushing to any environment, running migrations or schema changes, sending any email/message/external API call, executing any command with irreversible external side effects. "You mentioned this earlier" is not confirmation. Daniel must say yes in the current message.
- After completing any coding task, always end with: **Files changed:** [list] / **What was modified:** [one line per file] / **Files intentionally not touched:** [if relevant] / **Follow-up needed:** [anything requiring a decision]. Keep it short.
- Ask, don't assume. If something is unclear or underspecified, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements.
- Simplest solution first. Always implement the simplest thing that could work. Do not add abstractions, layers, or flexibility that weren't explicitly requested.
- Flag uncertainty explicitly. If not confident about an approach, a library's behavior, or a technical detail, say so before proceeding.

---


## RenderFlow — projekt

Platforma do zarządzania projektami wnętrzarskimi. Umożliwia projektantom udostępnianie renderów klientom, zbieranie komentarzy/pinezek, zarządzanie listami zakupowymi i akceptację plików przez klientów.

Cztery moduły:
- **RenderFlow** — pokoje z renderami, komentarze/pinezki, wersjonowanie plików
- **Listy** — listy zakupowe z sekcjami i produktami, akceptacja przez klienta
- **Projekty** (dawniej Veedeck) — ogólny widok projektów
- **Wykonawcy** — zarządzanie wykonawcami i udostępnianie im plików projektowych

---

## Moduł Wykonawcy — architektura

### Koncepcja
Projektant zarządza bazą wykonawców (firmy, hydraulicy, malarze itp.) i przypisuje ich do konkretnych projektów. Każdy wykonawca ma własne konto w systemie i loguje się do swojego panelu (`/wykonawca/...`), gdzie widzi tylko swoje foldery i pliki.

### Dwie strony modułu

**Strona projektanta** (`/wykonawcy/...`) — zarządzanie:
- Lista wykonawców: `/wykonawcy` — widok kafelkowy lub listowy, wyszukiwanie, sortowanie
- Profil wykonawcy: `/wykonawcy/[id]` — dane kontaktowe, przypisane projekty (aktywne/archiwalne), zakładanie konta
- Projekt wykonawcy: `/wykonawcy/[id]/projekty/[assignmentId]` — foldery, podfoldery, pliki, przesyłanie plików (drag & drop, dodawanie renderów z ProjectFlow)
- Podgląd pliku przez projektanta: `/wykonawcy/[id]/projekty/[assignmentId]/foldery/[folderId]/pliki/[fileId]`

**Panel wykonawcy** (`/wykonawca/...`) — widok klienta:
- Dashboard: `/wykonawca` — lista przypisanych projektów (karty)
- Projekt: `/wykonawca/projekty/[assignmentId]` — foldery z ikonami wg typu (rysunki/wizualizacje/inne), badge z nieprzeczytanymi
- Folder: `/wykonawca/projekty/[assignmentId]/foldery/[folderId]` — siatka plików
- Plik: `/wykonawca/projekty/[assignmentId]/foldery/[folderId]/pliki/[fileId]` — przeglądarka pliku z pinami i komentarzami

### Modele Prisma

```
Contractor          — wykonawca (powiązany z designerId i opcjonalnie userId)
ContractorAssignment — przypisanie wykonawcy do projektu (zawiera dane inwestycji, chat)
ContractorFolder    — folder w przypisaniu (typ: "rysunki"|"wizualizacje"|inne, parentId dla podfolderów)
ContractorFile      — plik w folderze (upload lub powiązany z Render przez renderId)
ContractorFileComment — komentarz/pin do pliku (posX/posY dla pinów, viewedByDesigner/viewedByContractor)
Discussion          — czat między projektantem a wykonawcą (contractorAssignmentId)
```

### API routes

```
/api/contractors/                          GET (lista), POST (utwórz)
/api/contractors/[id]/                     PATCH (edytuj), DELETE
/api/contractors/[id]/account/             POST (utwórz konto), PATCH (zmień login/hasło), DELETE (odłącz)
/api/contractors/[id]/assignments/         GET, POST (przypisz projekt)
/api/contractors/[id]/assignments/[aId]/   PATCH (archiwizuj), DELETE
/api/contractors/[id]/assignments/[aId]/folders/[fId]/          GET (foldery+pliki), POST (dodaj plik)
/api/contractors/[id]/assignments/[aId]/folders/[fId]/files/    GET
/api/contractors/[id]/assignments/[aId]/folders/[fId]/files/[fileId]/  PATCH, DELETE
/api/contractors/[id]/assignments/[aId]/folders/[fId]/subfolders/      POST

/api/contractor/assignments/               GET (dla zalogowanego wykonawcy — jego projekty)
/api/contractor/assignments/[aId]/         GET (szczegóły projektu dla wykonawcy)
/api/contractor/assignments/[aId]/folders/[fId]/  GET (pliki w folderze dla wykonawcy)

/api/contractor-file-comments/             GET, POST (pin/komentarz)
/api/contractor-file-comments/[id]/        PATCH (przesuń pin), DELETE
/api/contractor-file-comments/[id]/replies/         POST
/api/contractor-file-comments/[id]/replies/[rId]/   PATCH, DELETE
/api/contractor-file-comments/mark-read/   POST
/api/contractor-file-comments/unread-count/ GET

/api/contractor-chat/                      GET (lista dyskusji), POST (wyślij)
/api/contractor-chat/[assignmentId]/       GET (historia czatu)

/api/discussions/                          POST (utwórz)
/api/discussions/[id]/                     GET, PATCH
/api/discussions/[id]/messages/            GET, POST
```

### Autoryzacja

- **Strona projektanta**: sesja `session.user.id` === `contractor.designerId` (standardowa sesja NextAuth)
- **Panel wykonawcy**: sesja `session.user.role === "contractor"` — wykonawca loguje się jak normalny user, ale z `role: "contractor"`, dostaje tylko swoje dane przez `/api/contractor/...`
- Konto wykonawcy tworzy projektant w `/api/contractors/[id]/account` (POST) — generuje login z emaila i hashuje hasło

### Kluczowe detale implementacyjne

- **Typy folderów**: `"rysunki"` → ikona linijki, `"wizualizacje"` → ikona obrazka, inne → ikona dokumentu
- **Podfoldery**: `ContractorFolder.parentId` — drzewo dwupoziomowe (główny folder + podfoldery)
- **Pliki z renderów**: `ContractorFile.renderId` — plik może być powiązany z istniejącym renderem z ProjectFlow (kopiuje URL, nie duplikuje pliku)
- **Piny na plikach**: `ContractorFileComment` z `posX/posY` (procenty) — ten sam wzorzec co piny w RenderViewer, ale osobny model
- **Real-time**: Pusher channel `contractor-file-{fileId}` — zdarzenia: `new-comment`, `comment-deleted`, `pin-moved`, `comment-edited`, `comment-reply`, `reply-deleted`
- **Unread count**: osobne pola `viewedByDesigner` / `viewedByContractor` — projektant i wykonawca mają niezależne liczniki
- **Czat**: `Discussion` z `contractorAssignmentId` — jeden czat na przypisanie; używa `DiscussionMessage` i `DiscussionParticipant`
- **Informacje o projekcie**: `ContractorAssignment` zawiera dodatkowe pola: `designerContactName`, `investmentCity`, `investmentStreet`, `projectNotes`, `investorContactName` itp.
- **Widoczność folderów**: `ContractorFolder.visible` — projektant może ukryć folder przed wykonawcą

---

## Stack technologiczny

- **Framework:** Next.js 16.2.1 (App Router)
- **React:** 19.2.4
- **Baza danych:** PostgreSQL przez Prisma 7.x (`prisma db push` zamiast migracji)
- **Auth:** NextAuth v5 beta (`next-auth@^5.0.0-beta.30`)
- **UI dialogi:** `@base-ui/react` — **NIE Radix UI** (zachowanie się różni!)
- **Real-time:** Pusher (websockets)
- **Upload plików:** UploadThing
- **Style:** Tailwind CSS v4
- **Ikony:** Lucide React
- **Powiadomienia toast:** Sonner
- **Drag & drop:** @dnd-kit

---
---

## Komendy

```bash
# Development (uruchamia też prisma db push)
npm run dev

# Build produkcyjny (uruchamia prisma generate)
npm run build

# Testy (Vitest)
npm test               # jednorazowy run
npm run test:watch     # tryb watch
npm run test:coverage  # z pokryciem

# Linting
npm run lint
```

---

## Baza danych (Prisma)

**Workflow:** projekt używa `prisma db push` zamiast migracji — zmiany schematu wchodzą bezpośrednio do bazy.

```bash
# Po zmianie schema.prisma
npx prisma db push      # synchronizuje schemat z bazą
npx prisma generate     # regeneruje klienta Prisma (TypeScript types)
```

**Modele (schema.prisma):**
`User`, `Account`, `Session`, `Project`, `ProjectClient`, `Room`, `Folder`, `Render`, `RenderVersion`, `VersionRestoreRequest`, `Comment`, `Reply`, `Notification`, `ShoppingList`, `ListSection`, `ListProduct`, `ListProductComment`, `ListProductReply`, `StatusChangeRequest`, `LoginLog`, `ActivityLog`

**Zmienne środowiskowe (`.env`):**
```
DATABASE_URL          # PostgreSQL connection string
AUTH_SECRET           # NextAuth secret (openssl rand -base64 32)
PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET / PUSHER_CLUSTER
NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER
UPLOADTHING_TOKEN
```

---

## Struktura projektu

```
src/
  app/
    api/                    # Route Handlers (Next.js)
      auth/register/        # Rejestracja
      comments/             # Komentarze do renderów
      folders/              # Foldery w pokojach
      lists/                # Listy zakupowe + sekcje + produkty
      list-comments/        # Komentarze do produktów na listach
      notifications/        # Powiadomienia
      projects/             # CRUD projektów + klienci
      renders/              # CRUD renderów + wersjonowanie
      rooms/                # CRUD pomieszczeń
      share/[token]/        # Publiczny widok projektu (klient)
      share/list/[token]/   # Publiczny widok listy (klient)
      settings/             # Ustawienia konta
      status-requests/      # Prośby o zmianę statusu
      user/                 # Profil + zmiana hasła
      version-restore-requests/
    (dashboard)/            # Strony zalogowanego projektanta
      projects/[id]/        # Widok projektu (pokoje, rendery)
    share/[token]/          # Publiczny link dla klienta (RenderFlow)
    share/list/[token]/     # Publiczny link dla klienta (lista)
  components/
    dashboard/              # Komponenty projektanta (ProjectCard, RoomView, NavSidebar…)
    render/                 # Komponenty renderów (RenderViewer, FolderCard, FolderMenu…)
    share/                  # Komponenty widoku klienta (ShareSidebar…)
    comment/                # Wątki komentarzy
    listy/                  # Listy zakupowe
    settings/               # Ustawienia
    ui/                     # Prymitywy UI (shadcn-like, ale @base-ui/react)
  lib/
    auth.ts                 # Konfiguracja NextAuth
    prisma.ts               # Singleton klienta Prisma
    pusher.ts               # Klient Pusher (serwer)
    slug.ts                 # uniqueSlug() — generuje unikalny slug
    uploadthing.ts          # Konfiguracja UploadThing
    roomIcons.tsx           # Definicje ikon i typów pomieszczeń
    activity-log.ts         # Logowanie aktywności
  __tests__/
    api/                    # Testy unit API routes (środowisko: node)
    components/             # Testy komponentów UI (środowisko: jsdom)
    helpers.ts              # makeRequest(), makeParams(), SESSION
    setup.ts                # Globalne setupy (jest-dom dla jsdom)
```

---

## Ważne zasady i pułapki

### @base-ui/react — NIE Radix UI
Projekt używa `@base-ui/react` dla komponentów Dialog, DropdownMenu itp. — **nie** `@radix-ui`. Zachowanie różni się od standardowych shadcn komponentów:
- `DialogContent` renderuje przycisk zamknięcia jako `<Button>` bez `type="button"`
- **Nie używaj `<form onSubmit>` wewnątrz Dialog** — zdarzenie submit może być przechwycone przez DialogClose
- Zamiast tego używaj `onClick` bezpośrednio na przycisku zapisu (wzorzec z `AddFolderDialog.tsx`)

```tsx
// ❌ Nie działa w @base-ui Dialog
<form onSubmit={handleSubmit}>
  <Button type="submit">Zapisz</Button>
</form>

// ✅ Prawidłowy wzorzec
<Button onClick={handleSubmit}>Zapisz</Button>
<Input onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
```

### uniqueSlug — pułapka w testach
Funkcja `uniqueSlug()` z `@/lib/slug` wywołuje Prisma w pętli do znalezienia unikalnego sluga. W testach **zawsze mockuj** ten moduł, inaczej pętla nieskończona spowoduje OOM:

```typescript
vi.mock("@/lib/slug", () => ({
  uniqueSlug: vi.fn().mockResolvedValue("test-slug"),
}));
```

### Params w Route Handlers (Next.js 16)
`params` jest teraz `Promise` — zawsze `await`:
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // wymagane!
}
```

### Nawigacja po stronie klienta
- `navMode` użytkownika: `"dashboard"` (kafelki) lub `"sidebar"` (pasek boczny)
- Pasek boczny klienta: `ShareSidebar` — używa `usePathname()` do aktywnego stanu, `localStorage("nav-sidebar-collapsed")` do zapamiętania stanu

---

## Testy

### Konfiguracja (vitest.config.ts)
- `environment: "node"` dla testów API
- `jsdom` dla `src/__tests__/components/**` (via `environmentMatchGlobs`)
- `resolve.tsconfigPaths: true` (natywna obsługa aliasów `@/`)

### Wzorzec testów API
```typescript
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { model: { method: vi.fn() } } }));
vi.mock("@/lib/pusher", () => ({ pusherServer: { trigger: vi.fn() } }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// W teście:
vi.mocked(auth).mockResolvedValue(SESSION as any);
vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
```

### Pomocniki testowe (`src/__tests__/helpers.ts`)
```typescript
makeRequest("POST", { body }, { headers })  // tworzy NextRequest
makeParams({ id: "val" })                   // { params: Promise<{id: string}> }
SESSION                                     // { user: { id: "user-1", email: "test@test.com" } }
```

### Aktualny stan testów
**213 testów, 21 plików, 0 failów**
- API routes: 16 plików, 159 testów
- Komponenty UI: 5 plików, 54 testy

---

## Konwencje kodu

- **Język UI:** polski (komunikaty błędów, etykiety, toasty)
- **Język kodu:** angielski (nazwy zmiennych, komentarze techniczne)
- **Autoryzacja API:** zawsze sprawdzaj `session.user.id` i własność zasobu (403 gdy brak dostępu)
- **Statusy HTTP:** 401 (brak sesji), 403 (brak dostępu do zasobu), 404 (nie znaleziono), 410 (wygasł/zarchiwizowany)
- **Komponenty:** `"use client"` tylko gdy potrzebne (hooks, eventy)
- **Ikony:** tylko z `lucide-react`
- **Refreshowanie po mutacji:** `router.refresh()` po API calls w komponentach klienckich

---

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
