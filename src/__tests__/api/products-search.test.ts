import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/products/route";
import { makeRequest, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock("@/lib/workspace", () => ({
  getWorkspaceUserId: vi.fn((session) => session.user.id),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockProducts = [
  {
    id: "prod-1",
    name: "Lampa sufitowa",
    category: "Oświetlenie",
    manufacturer: "IKEA",
    color: "Biały",
    price: "299 PLN",
    description: "Nowoczesna lampa sufitowa",
    catalogNumber: "JAXAL-1",
    imageUrl: "https://example.com/lamp.jpg",
    supplier: "IKEA",
    url: "https://ikea.pl/product",
    dimensions: "30x30 cm",
    deliveryTime: "3-5 dni",
    quantity: 1,
    createdAt: new Date("2024-01-01"),
    userId: SESSION.user.id,
  },
  {
    id: "prod-2",
    name: "Biurko drewniane",
    category: "Meble",
    manufacturer: "NOWY STYL",
    color: "Wenge",
    price: "899 PLN",
    description: "Solidne biurko drewniane",
    catalogNumber: "DESK-2",
    imageUrl: "https://example.com/desk.jpg",
    supplier: "NOWY STYL",
    url: "https://nowystyl.pl/product",
    dimensions: "120x60 cm",
    deliveryTime: "7-10 dni",
    quantity: 1,
    createdAt: new Date("2024-01-02"),
    userId: SESSION.user.id,
  },
];

beforeEach(() => vi.clearAllMocks());

describe("GET /api/products?action=search", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("zwraca wszystkie produkty użytkownika bez filtrów", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
    vi.mocked(prisma.product.count).mockResolvedValue(2);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "search");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.hasMore).toBe(false);
  });

  it("wyszukuje produkty po tekście", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const filtered = mockProducts.slice(0, 1);
    vi.mocked(prisma.product.findMany).mockResolvedValue(filtered as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "search");
    req.nextUrl.searchParams.append("query", "lampa");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
    expect(body.products[0].name).toBe("Lampa sufitowa");
  });

  it("filtruje produkty po kategorii", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const filtered = mockProducts.slice(1, 2);
    vi.mocked(prisma.product.findMany).mockResolvedValue(filtered as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "search");
    req.nextUrl.searchParams.append("categories[]", "Meble");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
    expect(body.products[0].category).toBe("Meble");
  });

  it("filtruje produkty po producencie", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const filtered = mockProducts.slice(0, 1);
    vi.mocked(prisma.product.findMany).mockResolvedValue(filtered as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "search");
    req.nextUrl.searchParams.append("manufacturers[]", "IKEA");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
    expect(body.products[0].manufacturer).toBe("IKEA");
  });

  it("filtruje produkty po kolorze", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const filtered = mockProducts.slice(1, 2);
    vi.mocked(prisma.product.findMany).mockResolvedValue(filtered as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "search");
    req.nextUrl.searchParams.append("colors[]", "Wenge");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
    expect(body.products[0].color).toBe("Wenge");
  });

  it("kombinuje wiele filtrów", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const filtered = mockProducts.slice(0, 1);
    vi.mocked(prisma.product.findMany).mockResolvedValue(filtered as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "search");
    req.nextUrl.searchParams.append("query", "lampa");
    req.nextUrl.searchParams.append("categories[]", "Oświetlenie");
    req.nextUrl.searchParams.append("manufacturers[]", "IKEA");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
  });

  it("obsługuje limit i pagination", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
    vi.mocked(prisma.product.count).mockResolvedValue(5);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "search");
    req.nextUrl.searchParams.append("limit", "2");
    req.nextUrl.searchParams.append("skip", "0");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasMore).toBe(true);
  });

  it("limituję limit do max 100", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.product.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "search");
    req.nextUrl.searchParams.append("limit", "500");
    const res = await GET(req);

    expect(res.status).toBe(200);
    // Verify prisma was called with max limit of 100
    expect(vi.mocked(prisma.product.findMany).mock.calls[0][0].take).toBe(100);
  });
});

describe("GET /api/products?action=filters", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "filters");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("zwraca dostępne kategorie, producentów i kolory", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    
    // Mock distinct queries
    vi.mocked(prisma.product.findMany)
      .mockResolvedValueOnce([
        { category: "Oświetlenie" },
        { category: "Meble" },
        { category: null },
      ] as any)
      .mockResolvedValueOnce([
        { manufacturer: "IKEA" },
        { manufacturer: "NOWY STYL" },
      ] as any)
      .mockResolvedValueOnce([
        { color: "Biały" },
        { color: "Wenge" },
      ] as any);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "filters");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toEqual(["Meble", "Oświetlenie"]);
    expect(body.manufacturers).toEqual(["IKEA", "NOWY STYL"]);
    expect(body.colors).toEqual(["Biały", "Wenge"]);
  });

  it("filtruje NULL i puste wartości oraz sortuje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    
    vi.mocked(prisma.product.findMany)
      .mockResolvedValueOnce([
        { category: "Z" },
        { category: "A" },
        { category: null },
        { category: "" },
      ] as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("action", "filters");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toEqual(["A", "Z"]);
    expect(body.manufacturers).toEqual([]);
    expect(body.colors).toEqual([]);
  });
});

describe("GET /api/products (original - list all)", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("zwraca wszystkie produkty użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("wyszukuje po staremu parametrze q", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const filtered = mockProducts.slice(0, 1);
    vi.mocked(prisma.product.findMany).mockResolvedValue(filtered as any);

    const req = makeRequest("GET");
    req.nextUrl.searchParams.append("q", "lampa");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});
