import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

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
