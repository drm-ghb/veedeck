import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  // Advanced search with filters
  const action = req.nextUrl.searchParams.get("action");
  if (action === "search") {
    const query = req.nextUrl.searchParams.get("query")?.trim() || "";
    const categoriesParam = req.nextUrl.searchParams.getAll("categories[]");
    const manufacturersParam = req.nextUrl.searchParams.getAll("manufacturers[]");
    const colorsParam = req.nextUrl.searchParams.getAll("colors[]");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 100);
    const skip = Math.max(parseInt(req.nextUrl.searchParams.get("skip") || "0"), 0);

    try {
      const whereConditions: any = { userId };

      if (query) {
        whereConditions.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { catalogNumber: { contains: query, mode: "insensitive" } },
        ];
      }

      if (categoriesParam.length > 0) {
        whereConditions.category = { in: categoriesParam };
      }

      if (manufacturersParam.length > 0) {
        whereConditions.manufacturer = { in: manufacturersParam };
      }

      if (colorsParam.length > 0) {
        whereConditions.color = { in: colorsParam };
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: whereConditions,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
        }),
        prisma.product.count({ where: whereConditions }),
      ]);

      return NextResponse.json({
        products,
        total,
        hasMore: skip + limit < total,
      });
    } catch (err) {
      console.error("[GET /api/products?action=search]", err);
      return NextResponse.json({ error: "Błąd serwera", detail: String(err) }, { status: 500 });
    }
  }

  // Get available filters
  if (action === "filters") {
    try {
      const categories = await prisma.product.findMany({
        where: { userId },
        select: { category: true },
        distinct: ["category"],
      });

      const manufacturers = await prisma.product.findMany({
        where: { userId },
        select: { manufacturer: true },
        distinct: ["manufacturer"],
      });

      const colors = await prisma.product.findMany({
        where: { userId },
        select: { color: true },
        distinct: ["color"],
      });

      return NextResponse.json({
        categories: categories
          .map((p) => p.category)
          .filter((v) => v !== null && v !== "")
          .sort(),
        manufacturers: manufacturers
          .map((p) => p.manufacturer)
          .filter((v) => v !== null && v !== "")
          .sort(),
        colors: colors
          .map((p) => p.color)
          .filter((v) => v !== null && v !== "")
          .sort(),
      });
    } catch (err) {
      console.error("[GET /api/products?action=filters]", err);
      return NextResponse.json({ error: "Błąd serwera", detail: String(err) }, { status: 500 });
    }
  }

  // Original GET - list all products
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const products = await prisma.product.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { manufacturer: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const body = await req.json();
  const { name, url, imageUrl, price, manufacturer, color, dimensions, description, deliveryTime, quantity, category } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      url: url || null,
      imageUrl: imageUrl || null,
      price: price || null,
      manufacturer: manufacturer || null,
      color: color || null,
      dimensions: dimensions || null,
      description: description || null,
      deliveryTime: deliveryTime || null,
      quantity: typeof quantity === "number" && quantity >= 1 ? quantity : 1,
      category: category || null,
      userId,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
