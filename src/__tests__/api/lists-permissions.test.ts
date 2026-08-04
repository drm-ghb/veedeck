/**
 * Kompleksowe testy uprawnień dla modułu Listy zakupowe.
 *
 * Weryfikuje każdy endpoint pod kątem:
 *  - 401 bez sesji (nieuwierzytelniony)
 *  - 403 dla niewystarczającego poziomu uprawnień
 *  - Przepuszczenia dla właściciela workspace i uprawnionego użytkownika
 *
 * Mapa poziomów uprawnień (moduł "listy"):
 *  - 1 (Podgląd)      : tylko odczyt, bez komentarzy
 *  - 2 (Edycja)       : produkty, sekcje, komentarze, ilość, akceptacja, status
 *  - 3 (Zarządzanie)  : poziom 2 + archiwizacja/usuwanie/rename/budżet/ukryj ceny/udostępnij
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams } from "../helpers";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/pusher", () => ({ pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("@/lib/slug", () => ({ uniqueSlug: vi.fn().mockResolvedValue("lista-slug") }));
vi.mock("@/lib/list-changelog", () => ({ logListChange: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/email-queue", () => ({ queueEmailNotif: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/email", () => ({
  notifyClientListShared: vi.fn().mockResolvedValue(undefined),
  notifyClientDesignerListReply: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/access-token", () => ({ createAccessToken: vi.fn().mockResolvedValue("tok") }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
  hash: vi.fn().mockResolvedValue("hashed"),
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceUserId: vi.fn().mockReturnValue("owner-1"),
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(),
  checkTeamPermission: vi.fn(),
  getAllowedClientIds: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingList: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    listSection: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    listProduct: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    listProductComment: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    listProductReply: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    product: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    project: { findUnique: vi.fn(), findFirst: vi.fn() },
    projectClient: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

// ─── Imports (po mockach) ──────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, checkTeamPermission } from "@/lib/permissions";

import { PATCH as patchList, DELETE as deleteList } from "@/app/api/lists/[id]/route";
import { POST as reorderLists } from "@/app/api/lists/reorder/route";
import { POST as postSection } from "@/app/api/lists/[id]/sections/route";
import { PATCH as patchProduct, DELETE as deleteProduct } from "@/app/api/lists/[id]/sections/[sectionId]/products/[productId]/route";
import { POST as postComment, GET as getComments } from "@/app/api/list-comments/route";
import { DELETE as deleteComment } from "@/app/api/list-comments/[id]/route";
import { POST as postReply } from "@/app/api/list-comments/[id]/replies/route";
import { PATCH as patchReply, DELETE as deleteReply } from "@/app/api/list-comments/[id]/replies/[replyId]/route";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const OWNER_SESSION = { user: { id: "owner-1", email: "owner@test.com" } };
const MEMBER_SESSION = { user: { id: "member-1", email: "member@test.com", ownerId: "owner-1" } };

const MOCK_LIST = {
  id: "list-1",
  name: "Lista mebli",
  slug: "lista-mebli",
  userId: "owner-1",
  archived: false,
  pinned: false,
  shareToken: "share-tok",
  isSharedWithClient: false,
  hidePrices: false,
  budget: null,
  projectId: null,
  clientId: null,
};

const MOCK_PRODUCT = {
  id: "prod-1",
  name: "Szafa",
  sectionId: "sec-1",
  order: 0,
  quantity: 2,
  approval: null,
  orderStatus: null,
  hidden: false,
  optional: false,
  section: { list: { id: "list-1", userId: "owner-1" } },
};

/** Komentarz z zagnieżdżoną strukturą wymaganą przez DELETE/PATCH */
const MOCK_COMMENT_WITH_LIST = {
  id: "cmt-1",
  productId: "prod-1",
  author: "Klient",
  content: "Ładna szafa",
  product: {
    section: {
      list: { id: "list-1", userId: "owner-1" },
    },
  },
};

/** Komentarz z innym właścicielem listy (nie owner-1) */
const MOCK_COMMENT_OTHER_OWNER = {
  ...MOCK_COMMENT_WITH_LIST,
  product: {
    section: {
      list: { id: "list-1", userId: "other-owner" },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  // domyślnie brak uprawnień — każdy test nadpisuje tylko to co potrzebuje
  vi.mocked(hasPermission).mockResolvedValue(false);
  vi.mocked(checkTeamPermission).mockResolvedValue(false);
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/lists/[id]  — wymaga poziomu 3 (Zarządzanie)
// ══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/lists/[id] — wymaga poziomu 3", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await patchList(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla poziomu 1 (Podgląd)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false); // poziom 1, nie spełnia wymogu 3
    const res = await patchList(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 403 dla poziomu 2 (Edycja) — zarządzanie jest poza zakresem", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false); // ma 2, wymaga 3
    const res = await patchList(makeRequest("PATCH", { archived: true }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(403);
  });

  it("przepuszcza właściciela workspace (poziom 3 = true)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(MOCK_LIST as any);
    vi.mocked(prisma.shoppingList.update).mockResolvedValue({ ...MOCK_LIST, archived: true } as any);
    const res = await patchList(makeRequest("PATCH", { archived: true }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(200);
  });

  it("przepuszcza członka zespołu z poziomem 3", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true); // ma poziom 3
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(MOCK_LIST as any);
    vi.mocked(prisma.shoppingList.update).mockResolvedValue({ ...MOCK_LIST, pinned: true } as any);
    const res = await patchList(makeRequest("PATCH", { pinned: true }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(200);
  });

  it("sprawdza że hasPermission jest wywołane z modułem 'listy' i poziomem 3", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    await patchList(makeRequest("PATCH", { name: "Test" }), makeParams({ id: "list-1" }));
    expect(vi.mocked(hasPermission)).toHaveBeenCalledWith(MEMBER_SESSION, "listy", 3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/lists/[id]  — wymaga uprawnienia listCanDelete
// ══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/lists/[id] — wymaga listCanDelete", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await deleteList(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy listCanDelete = false", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(false);
    const res = await deleteList(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(403);
  });

  it("przepuszcza gdy listCanDelete = true i lista istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(true);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(MOCK_LIST as any);
    vi.mocked(prisma.shoppingList.delete).mockResolvedValue(MOCK_LIST as any);
    const res = await deleteList(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(200);
  });

  it("zwraca 404 gdy lista nie należy do workspace", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(true);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);
    const res = await deleteList(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/lists/reorder  — wymaga poziomu 3 (Zarządzanie)
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/lists/reorder — wymaga poziomu 3", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await reorderLists(makeRequest("POST", { ids: ["list-1", "list-2"] }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla poziomu 1 (Podgląd)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await reorderLists(makeRequest("POST", { ids: ["list-1"] }));
    expect(res.status).toBe(403);
  });

  it("zwraca 403 dla poziomu 2 (Edycja)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false); // ma 2, wymaga 3
    const res = await reorderLists(makeRequest("POST", { ids: ["list-1"] }));
    expect(res.status).toBe(403);
  });

  it("przepuszcza właściciela z poziomem 3 i poprawnym właścicielem listy", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.shoppingList.findUnique).mockResolvedValue({ userId: "owner-1" } as any);
    vi.mocked(prisma.shoppingList.update).mockResolvedValue(MOCK_LIST as any);
    const res = await reorderLists(makeRequest("POST", { ids: ["list-1", "list-2"] }));
    expect(res.status).toBe(200);
  });

  it("zwraca 400 gdy ids nie jest tablicą", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    const res = await reorderLists(makeRequest("POST", { ids: "niepoprawne" }));
    expect(res.status).toBe(400);
  });

  it("sprawdza że hasPermission jest wywołane z poziomem 3", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    await reorderLists(makeRequest("POST", { ids: [] }));
    expect(vi.mocked(hasPermission)).toHaveBeenCalledWith(MEMBER_SESSION, "listy", 3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/lists/[id]/sections  — wymaga poziomu 2 (Edycja)
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/lists/[id]/sections — wymaga poziomu 2", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await postSection(makeRequest("POST", { name: "Sypialnia" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla poziomu 1 (Podgląd)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false); // poziom 1, wymaga 2
    const res = await postSection(makeRequest("POST", { name: "Sypialnia" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(403);
  });

  it("przepuszcza poziom 2 (Edycja)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(MOCK_LIST as any);
    vi.mocked(prisma.listSection.count).mockResolvedValue(0);
    vi.mocked(prisma.listSection.create).mockResolvedValue({ id: "sec-1", name: "Sypialnia", order: 0 } as any);
    const res = await postSection(makeRequest("POST", { name: "Sypialnia" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(201);
  });

  it("sprawdza że hasPermission jest wywołane z poziomem 2", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    await postSection(makeRequest("POST", { name: "X" }), makeParams({ id: "list-1" }));
    expect(vi.mocked(hasPermission)).toHaveBeenCalledWith(MEMBER_SESSION, "listy", 2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/lists/[id]/sections/[sectionId]/products/[productId] — poziom 2
// ══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/lists/[id]/sections/[sectionId]/products/[productId] — wymaga poziomu 2", () => {
  const params = makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" });

  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await patchProduct(makeRequest("PATCH", { quantity: 3 }), params);
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla poziomu 1 (Podgląd) — zmiana ilości", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await patchProduct(makeRequest("PATCH", { quantity: 3 }), params);
    expect(res.status).toBe(403);
  });

  it("zwraca 403 dla poziomu 1 — zmiana akceptacji", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await patchProduct(makeRequest("PATCH", { approval: "accepted" }), params);
    expect(res.status).toBe(403);
  });

  it("zwraca 403 dla poziomu 1 — zmiana statusu zamówienia", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await patchProduct(makeRequest("PATCH", { orderStatus: "zamowione" }), params);
    expect(res.status).toBe(403);
  });

  it("przepuszcza poziom 2 — zmiana ilości", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(MOCK_PRODUCT as any);
    vi.mocked(prisma.listProduct.update).mockResolvedValue({ ...MOCK_PRODUCT, quantity: 3 } as any);
    const res = await patchProduct(makeRequest("PATCH", { quantity: 3 }), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quantity).toBe(3);
  });

  it("przepuszcza poziom 2 — zmiana akceptacji na accepted", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(MOCK_PRODUCT as any);
    vi.mocked(prisma.listProduct.update).mockResolvedValue({ ...MOCK_PRODUCT, approval: "accepted" } as any);
    const res = await patchProduct(makeRequest("PATCH", { approval: "accepted" }), params);
    expect(res.status).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/lists/[id]/sections/[sectionId]/products/[productId] — poziom 2
// ══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/lists/[id]/sections/[sectionId]/products/[productId] — wymaga poziomu 2", () => {
  const params = makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" });

  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await deleteProduct(makeRequest("DELETE"), params);
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla poziomu 1 (Podgląd)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await deleteProduct(makeRequest("DELETE"), params);
    expect(res.status).toBe(403);
  });

  it("przepuszcza poziom 2 i usuwa produkt", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(MOCK_PRODUCT as any);
    vi.mocked(prisma.listProduct.delete).mockResolvedValue(MOCK_PRODUCT as any);
    const res = await deleteProduct(makeRequest("DELETE"), params);
    expect(res.status).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/list-comments  — publiczny endpoint (brak auth wymagane)
// ══════════════════════════════════════════════════════════════════════════════

describe("GET /api/list-comments — publiczny odczyt", () => {
  it("zwraca 400 gdy brak productId", async () => {
    const res = await getComments(makeRequest("GET") as any);
    expect(res.status).toBe(400);
  });

  it("zwraca komentarze bez wymogu sesji", async () => {
    vi.mocked(prisma.listProductComment.findMany).mockResolvedValue([
      { id: "c1", content: "OK", author: "Jan", replies: [] } as any,
    ]);
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest("http://localhost/api/list-comments?productId=prod-1");
    const res = await getComments(nextReq);
    expect(res.status).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/list-comments  — poziom 2 dla auth; listShareToken dla publicznych
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/list-comments — poziom 2 dla auth, shareToken dla publicznych", () => {
  it("zwraca 401 gdy brak sesji i brak listShareToken", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await postComment(makeRequest("POST", {
      productId: "prod-1",
      content: "Komentarz",
      author: "Jan",
      // brak listShareToken
    }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla uwierzytelnionego z poziomem 1 (Podgląd)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false); // poziom 1
    const res = await postComment(makeRequest("POST", {
      productId: "prod-1",
      content: "Komentarz",
      author: "Jan",
    }));
    expect(res.status).toBe(403);
  });

  it("sprawdza że hasPermission jest wywołane z poziomem 2 dla auth usera", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    await postComment(makeRequest("POST", {
      productId: "prod-1",
      content: "Komentarz",
      author: "Jan",
    }));
    expect(vi.mocked(hasPermission)).toHaveBeenCalledWith(MEMBER_SESSION, "listy", 2);
  });

  it("przepuszcza uwierzytelnionego z poziomem 2 (Edycja)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProductComment.create).mockResolvedValue({
      id: "c1", productId: "prod-1", content: "Komentarz", author: "Jan", replies: [],
    } as any);
    vi.mocked(prisma.listProduct.findUnique).mockResolvedValue(null); // brak produktu → pomija notifikację
    const res = await postComment(makeRequest("POST", {
      productId: "prod-1",
      content: "Komentarz",
      author: "Jan",
    }));
    expect(res.status).toBe(201);
  });

  it("przepuszcza nieuwierzytelnionego z poprawnym listShareToken (klient z linku publicznego)", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(prisma.listProductComment.create).mockResolvedValue({
      id: "c1", productId: "prod-1", content: "Komentarz", author: "Klient", replies: [],
    } as any);
    vi.mocked(prisma.listProduct.findUnique).mockResolvedValue(null);
    const res = await postComment(makeRequest("POST", {
      productId: "prod-1",
      content: "Komentarz",
      author: "Klient",
      listShareToken: "share-tok",
    }));
    expect(res.status).toBe(201);
  });

  it("przepuszcza właściciela workspace (zawsze ma dostęp)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProductComment.create).mockResolvedValue({
      id: "c2", productId: "prod-1", content: "OK", author: "Projektant", replies: [],
    } as any);
    vi.mocked(prisma.listProduct.findUnique).mockResolvedValue(null);
    const res = await postComment(makeRequest("POST", {
      productId: "prod-1",
      content: "OK",
      author: "Projektant",
    }));
    expect(res.status).toBe(201);
  });

  it("zwraca 400 gdy brakuje wymaganych pól (productId/content/author)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    const res = await postComment(makeRequest("POST", {
      productId: "prod-1",
      content: "",
      author: "Jan",
    }));
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/list-comments/[id]  — auth + (właściciel listy LUB poziom 2)
// ══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/list-comments/[id] — auth + właściciel lub poziom 2", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await deleteComment(makeRequest("DELETE"), makeParams({ id: "cmt-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy user nie jest właścicielem listy i nie ma poziomu 2", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false); // poziom 1
    // komentarz należy do listy innego właściciela
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_OTHER_OWNER as any);
    const res = await deleteComment(makeRequest("DELETE"), makeParams({ id: "cmt-1" }));
    expect(res.status).toBe(403);
  });

  it("przepuszcza właściciela listy (isOwner = true) nawet bez hasPermission", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false); // nie sprawdzane — isOwner wystarczy
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_WITH_LIST as any);
    vi.mocked(prisma.listProductComment.delete).mockResolvedValue(MOCK_COMMENT_WITH_LIST as any);
    const res = await deleteComment(makeRequest("DELETE"), makeParams({ id: "cmt-1" }));
    expect(res.status).toBe(200);
  });

  it("przepuszcza członka z poziomem 2 (nie jest właścicielem listy, ale ma uprawnienie)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true); // poziom 2
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_OTHER_OWNER as any);
    vi.mocked(prisma.listProductComment.delete).mockResolvedValue(MOCK_COMMENT_WITH_LIST as any);
    const res = await deleteComment(makeRequest("DELETE"), makeParams({ id: "cmt-1" }));
    expect(res.status).toBe(200);
  });

  it("zwraca 404 gdy komentarz nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(null);
    const res = await deleteComment(makeRequest("DELETE"), makeParams({ id: "cmt-1" }));
    expect(res.status).toBe(404);
  });

  it("sprawdza że hasPermission jest wywołane z poziomem 2", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_OTHER_OWNER as any);
    await deleteComment(makeRequest("DELETE"), makeParams({ id: "cmt-1" }));
    expect(vi.mocked(hasPermission)).toHaveBeenCalledWith(MEMBER_SESSION, "listy", 2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/list-comments/[id]/replies  — poziom 2 dla auth; shareToken dla pub
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/list-comments/[id]/replies — poziom 2 dla auth, shareToken dla pub", () => {
  it("zwraca 401 gdy brak sesji i brak listShareToken", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await postReply(makeRequest("POST", { content: "OK", author: "Jan" }), makeParams({ id: "cmt-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla uwierzytelnionego z poziomem 1", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await postReply(
      makeRequest("POST", { content: "OK", author: "Jan" }),
      makeParams({ id: "cmt-1" }),
    );
    expect(res.status).toBe(403);
  });

  it("przepuszcza nieuwierzytelnionego z listShareToken", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue({ id: "cmt-1", productId: "prod-1" } as any);
    vi.mocked(prisma.listProductReply.create).mockResolvedValue({ id: "r1", content: "OK", author: "Klient", commentId: "cmt-1", createdAt: new Date() } as any);
    vi.mocked(prisma.listProduct.findUnique).mockResolvedValue(null);
    const res = await postReply(
      makeRequest("POST", { content: "OK", author: "Klient", listShareToken: "share-tok" }),
      makeParams({ id: "cmt-1" }),
    );
    expect(res.status).toBe(201);
  });

  it("przepuszcza poziom 2 (uwierzytelniony)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue({ id: "cmt-1", productId: "prod-1" } as any);
    vi.mocked(prisma.listProductReply.create).mockResolvedValue({ id: "r1", content: "OK", author: "Jan", commentId: "cmt-1", createdAt: new Date() } as any);
    vi.mocked(prisma.listProduct.findUnique).mockResolvedValue(null);
    const res = await postReply(
      makeRequest("POST", { content: "OK", author: "Jan" }),
      makeParams({ id: "cmt-1" }),
    );
    expect(res.status).toBe(201);
  });

  it("sprawdza że hasPermission wywołane z poziomem 2", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    await postReply(
      makeRequest("POST", { content: "OK", author: "Jan" }),
      makeParams({ id: "cmt-1" }),
    );
    expect(vi.mocked(hasPermission)).toHaveBeenCalledWith(MEMBER_SESSION, "listy", 2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/list-comments/[id]/replies/[replyId] — auth + właściciel lub poz 2
// ══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/list-comments/[id]/replies/[replyId] — auth + właściciel lub poziom 2", () => {
  const params = makeParams({ id: "cmt-1", replyId: "r-1" });

  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await patchReply(makeRequest("PATCH", { content: "Edytowana" }), params);
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy nie właściciel i poziom 1", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_OTHER_OWNER as any);
    const res = await patchReply(makeRequest("PATCH", { content: "Edytowana" }), params);
    expect(res.status).toBe(403);
  });

  it("przepuszcza właściciela listy (isOwner = true)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_WITH_LIST as any);
    vi.mocked(prisma.listProductReply.update).mockResolvedValue({ id: "r-1", content: "Edytowana", author: "Proj" } as any);
    const res = await patchReply(makeRequest("PATCH", { viewedByDesigner: true }), params);
    expect(res.status).toBe(200);
  });

  it("przepuszcza poziom 2 (nie właściciel listy, ale ma uprawnienie)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_OTHER_OWNER as any);
    vi.mocked(prisma.listProductReply.update).mockResolvedValue({ id: "r-1", content: "Edytowana", author: "Jan" } as any);
    const res = await patchReply(makeRequest("PATCH", { content: "Edytowana" }), params);
    expect(res.status).toBe(200);
  });

  it("zwraca 404 gdy komentarz nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(null);
    const res = await patchReply(makeRequest("PATCH", { content: "X" }), params);
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/list-comments/[id]/replies/[replyId] — auth + właściciel lub poz 2
// ══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/list-comments/[id]/replies/[replyId] — auth + właściciel lub poziom 2", () => {
  const params = makeParams({ id: "cmt-1", replyId: "r-1" });

  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await deleteReply(makeRequest("DELETE"), params);
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy nie właściciel i poziom 1", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_OTHER_OWNER as any);
    const res = await deleteReply(makeRequest("DELETE"), params);
    expect(res.status).toBe(403);
  });

  it("przepuszcza właściciela listy (isOwner = true)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_WITH_LIST as any);
    vi.mocked(prisma.listProductReply.delete).mockResolvedValue({ id: "r-1" } as any);
    const res = await deleteReply(makeRequest("DELETE"), params);
    expect(res.status).toBe(200);
  });

  it("przepuszcza poziom 2 (nie właściciel listy, ale ma uprawnienie)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_OTHER_OWNER as any);
    vi.mocked(prisma.listProductReply.delete).mockResolvedValue({ id: "r-1" } as any);
    const res = await deleteReply(makeRequest("DELETE"), params);
    expect(res.status).toBe(200);
  });

  it("zwraca 404 gdy komentarz nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(null);
    const res = await deleteReply(makeRequest("DELETE"), params);
    expect(res.status).toBe(404);
  });

  it("sprawdza że hasPermission wywołane z poziomem 2", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_OTHER_OWNER as any);
    await deleteReply(makeRequest("DELETE"), params);
    expect(vi.mocked(hasPermission)).toHaveBeenCalledWith(MEMBER_SESSION, "listy", 2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Scenariusz E2E: Użytkownik z poziomem 1 (Podgląd) — nie może nic edytować
// ══════════════════════════════════════════════════════════════════════════════

describe("Scenariusz: poziom 1 (Podgląd) — blokada wszystkich mutacji", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(false);
    vi.mocked(checkTeamPermission).mockResolvedValue(false);
  });

  it("blokuje PATCH listy (zarządzanie)", async () => {
    const res = await patchList(makeRequest("PATCH", { archived: true }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(403);
  });

  it("blokuje DELETE listy", async () => {
    const res = await deleteList(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(403);
  });

  it("blokuje POST reorder list", async () => {
    const res = await reorderLists(makeRequest("POST", { ids: ["list-1"] }));
    expect(res.status).toBe(403);
  });

  it("blokuje POST sekcji", async () => {
    const res = await postSection(makeRequest("POST", { name: "Sypialnia" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(403);
  });

  it("blokuje PATCH produktu (zmiana ilości)", async () => {
    const res = await patchProduct(
      makeRequest("PATCH", { quantity: 5 }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" }),
    );
    expect(res.status).toBe(403);
  });

  it("blokuje DELETE produktu", async () => {
    const res = await deleteProduct(
      makeRequest("DELETE"),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" }),
    );
    expect(res.status).toBe(403);
  });

  it("blokuje POST komentarza (poziom 1 nie może pisać komentarzy)", async () => {
    const res = await postComment(makeRequest("POST", {
      productId: "prod-1",
      content: "Komentarz",
      author: "Jan",
    }));
    expect(res.status).toBe(403);
  });

  it("blokuje POST odpowiedzi", async () => {
    const res = await postReply(
      makeRequest("POST", { content: "Odpowiedź", author: "Jan" }),
      makeParams({ id: "cmt-1" }),
    );
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Scenariusz E2E: Właściciel workspace — ma dostęp do wszystkiego
// ══════════════════════════════════════════════════════════════════════════════

describe("Scenariusz: właściciel workspace — pełny dostęp", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(checkTeamPermission).mockResolvedValue(true);
  });

  it("może PATCH listy (poziom 3)", async () => {
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(MOCK_LIST as any);
    vi.mocked(prisma.shoppingList.update).mockResolvedValue(MOCK_LIST as any);
    const res = await patchList(makeRequest("PATCH", { pinned: true }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(200);
  });

  it("może DELETE listy", async () => {
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(MOCK_LIST as any);
    vi.mocked(prisma.shoppingList.delete).mockResolvedValue(MOCK_LIST as any);
    const res = await deleteList(makeRequest("DELETE"), makeParams({ id: "list-1" }));
    expect(res.status).toBe(200);
  });

  it("może POST sekcji", async () => {
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(MOCK_LIST as any);
    vi.mocked(prisma.listSection.count).mockResolvedValue(0);
    vi.mocked(prisma.listSection.create).mockResolvedValue({ id: "sec-1", name: "Sypialnia", order: 0 } as any);
    const res = await postSection(makeRequest("POST", { name: "Sypialnia" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(201);
  });

  it("może DELETE komentarza (jest właścicielem listy)", async () => {
    vi.mocked(prisma.listProductComment.findUnique).mockResolvedValue(MOCK_COMMENT_WITH_LIST as any);
    vi.mocked(prisma.listProductComment.delete).mockResolvedValue(MOCK_COMMENT_WITH_LIST as any);
    const res = await deleteComment(makeRequest("DELETE"), makeParams({ id: "cmt-1" }));
    expect(res.status).toBe(200);
  });
});
