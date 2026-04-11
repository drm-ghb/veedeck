@AGENTS.md

## RenderFlow — projekt

Platforma do zarządzania projektami wnętrzarskimi. Umożliwia projektantom udostępnianie renderów klientom, zbieranie komentarzy/pinezek, zarządzanie listami zakupowymi i akceptację plików przez klientów.

Trzy moduły:
- **RenderFlow** — pokoje z renderami, komentarze/pinezki, wersjonowanie plików1
- **Listy** — listy zakupowe z sekcjami i produktami, akceptacja przez klienta
- **Projekty** (dawniej Veedeck) — ogólny widok projektów

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
