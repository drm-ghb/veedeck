import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as PostSection, PATCH as PatchSectionOrder } from "@/app/api/lists/[id]/sections/route";
import { PATCH as PatchSection } from "@/app/api/lists/[id]/sections/[sectionId]/route";
import { POST as PostProduct, PATCH as PatchProductOrder } from "@/app/api/lists/[id]/sections/[sectionId]/products/route";
import { PATCH as PatchProduct, PUT as PutProduct, DELETE as DeleteProduct } from "@/app/api/lists/[id]/sections/[sectionId]/products/[productId]/route";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingList: { findFirst: vi.fn() },
    listSection: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    listProduct: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notification: { create: vi.fn() },
    product: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockList = { id: "list-1", userId: SESSION.user.id };
const mockSection = { id: "sec-1", listId: "list-1", name: "Sypialnia", order: 0 };
const mockProduct = {
  id: "prod-1",
  name: "Szafa",
  sectionId: "sec-1",
  order: 0,
  quantity: 1,
  approval: null,
  hidden: false,
};

beforeEach(() => vi.clearAllMocks());

// ── Sections ──────────────────────────────────────────────────────────────────

describe("POST /api/lists/[id]/sections", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PostSection(makeRequest("POST", { name: "Sypialnia" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak nazwy", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(mockList as any);
    const res = await PostSection(makeRequest("POST", { name: "" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 404 gdy lista nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);
    const res = await PostSection(makeRequest("POST", { name: "Sypialnia" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(404);
  });

  it("tworzy sekcję z poprawnym order", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(mockList as any);
    vi.mocked(prisma.listSection.count).mockResolvedValue(2);
    vi.mocked(prisma.listSection.create).mockResolvedValue({ ...mockSection, order: 2 } as any);

    const res = await PostSection(makeRequest("POST", { name: "Sypialnia" }), makeParams({ id: "list-1" }));
    expect(res.status).toBe(201);
    expect(prisma.listSection.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 2 }) })
    );
  });
});

describe("PATCH /api/lists/[id]/sections (reorder)", () => {
  it("zwraca 400 gdy order nie jest tablicą", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(mockList as any);
    const res = await PatchSectionOrder(
      makeRequest("PATCH", { order: "not-an-array" }),
      makeParams({ id: "list-1" })
    );
    expect(res.status).toBe(400);
  });

  it("zmienia kolejność sekcji", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(mockList as any);
    vi.mocked(prisma.listSection.updateMany).mockResolvedValue({ count: 1 } as any);

    const res = await PatchSectionOrder(
      makeRequest("PATCH", { order: ["sec-2", "sec-1"] }),
      makeParams({ id: "list-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("PATCH /api/lists/[id]/sections/[sectionId]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PatchSection(
      makeRequest("PATCH", { name: "Nowa" }),
      makeParams({ id: "list-1", sectionId: "sec-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy sekcja nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listSection.findFirst).mockResolvedValue(null);
    const res = await PatchSection(
      makeRequest("PATCH", { name: "Nowa" }),
      makeParams({ id: "list-1", sectionId: "sec-1" })
    );
    expect(res.status).toBe(404);
  });

  it("aktualizuje nazwę sekcji", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listSection.findFirst).mockResolvedValue(mockSection as any);
    vi.mocked(prisma.listSection.update).mockResolvedValue({ ...mockSection, name: "Łazienka" } as any);

    const res = await PatchSection(
      makeRequest("PATCH", { name: "Łazienka" }),
      makeParams({ id: "list-1", sectionId: "sec-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Łazienka");
  });
});

// ── Products ──────────────────────────────────────────────────────────────────

describe("POST /api/lists/[id]/sections/[sectionId]/products", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PostProduct(
      makeRequest("POST", { name: "Szafa" }),
      makeParams({ id: "list-1", sectionId: "sec-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak nazwy", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listSection.findFirst).mockResolvedValue(mockSection as any);
    const res = await PostProduct(
      makeRequest("POST", { name: "" }),
      makeParams({ id: "list-1", sectionId: "sec-1" })
    );
    expect(res.status).toBe(400);
  });

  it("tworzy produkt z domyślną ilością 1", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listSection.findFirst).mockResolvedValue(mockSection as any);
    vi.mocked(prisma.listProduct.count).mockResolvedValue(0);
    vi.mocked(prisma.listProduct.create).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockResolvedValue({} as any);

    const res = await PostProduct(
      makeRequest("POST", { name: "Szafa" }),
      makeParams({ id: "list-1", sectionId: "sec-1" })
    );
    expect(res.status).toBe(201);
    expect(prisma.listProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Szafa", quantity: 1 }),
      })
    );
  });

  it("tworzy produkt z podaną ilością", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listSection.findFirst).mockResolvedValue(mockSection as any);
    vi.mocked(prisma.listProduct.count).mockResolvedValue(0);
    vi.mocked(prisma.listProduct.create).mockResolvedValue({ ...mockProduct, quantity: 3 } as any);
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockResolvedValue({} as any);

    await PostProduct(
      makeRequest("POST", { name: "Krzesło", quantity: 3 }),
      makeParams({ id: "list-1", sectionId: "sec-1" })
    );
    expect(prisma.listProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantity: 3 }),
      })
    );
  });
});

describe("PATCH /api/lists/[id]/sections/[sectionId]/products/[productId]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PatchProduct(
      makeRequest("PATCH", { approval: "accepted" }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy produkt nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(null);
    const res = await PatchProduct(
      makeRequest("PATCH", { approval: "accepted" }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(404);
  });

  it("aktualizuje approval produktu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.listProduct.update).mockResolvedValue({ ...mockProduct, approval: "accepted" } as any);

    const res = await PatchProduct(
      makeRequest("PATCH", { approval: "accepted" }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(200);
  });

  it("zwraca 400 przy nieprawidłowej wartości approval", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);

    const res = await PatchProduct(
      makeRequest("PATCH", { approval: "invalid" }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(400);
  });

  it("aktualizuje ilość produktu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.listProduct.update).mockResolvedValue({ ...mockProduct, quantity: 5 } as any);

    const res = await PatchProduct(
      makeRequest("PATCH", { quantity: 5 }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(200);
  });

  it("zwraca 400 przy nieprawidłowej ilości", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);

    const res = await PatchProduct(
      makeRequest("PATCH", { quantity: 0 }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/lists/[id]/sections/[sectionId]/products/[productId]", () => {
  it("zwraca 400 gdy brak nazwy", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);

    const res = await PutProduct(
      makeRequest("PUT", { name: "" }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(400);
  });

  it("aktualizuje dane produktu (PUT)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.listProduct.update).mockResolvedValue({ ...mockProduct, name: "Szafa biała" } as any);

    const res = await PutProduct(
      makeRequest("PUT", { name: "Szafa biała", price: "1200 zł" }),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(200);
    expect(prisma.listProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Szafa biała", price: "1200 zł" }),
      })
    );
  });
});

describe("DELETE /api/lists/[id]/sections/[sectionId]/products/[productId]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DeleteProduct(
      makeRequest("DELETE"),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(401);
  });

  it("usuwa produkt", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.listProduct.findFirst).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.listProduct.delete).mockResolvedValue(mockProduct as any);

    const res = await DeleteProduct(
      makeRequest("DELETE"),
      makeParams({ id: "list-1", sectionId: "sec-1", productId: "prod-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
