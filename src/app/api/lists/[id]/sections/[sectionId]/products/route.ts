import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId } = await params;
  const { order } = await req.json();

  if (!Array.isArray(order)) return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });

  const section = await prisma.listSection.findFirst({
    where: { id: sectionId, listId: id, list: { userId: session.user.id } },
  });
  if (!section) return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });

  await Promise.all(
    (order as string[]).map((productId, index) =>
      prisma.listProduct.update({ where: { id: productId }, data: { order: index } })
    )
  );

  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sectionId } = await params;
  const body = await req.json();
  const { name, url, imageUrl, price, manufacturer, color, dimensions, description, deliveryTime, quantity, category, supplier, catalogNumber, productId: bodyProductId } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  }

  const section = await prisma.listSection.findFirst({
    where: { id: sectionId, listId: id, list: { userId: session.user.id } },
  });

  if (!section) {
    return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });
  }

  const count = await prisma.listProduct.count({ where: { sectionId } });
  const userId = session.user.id;

  // Link to library product only when explicitly added from library tab
  let finalProductId: string | null = null;

  if (bodyProductId) {
    // Adding from library tab — verify ownership and link
    const owned = await prisma.product.findFirst({ where: { id: bodyProductId, userId } });
    if (owned) finalProductId = owned.id;
  } else {
    // Adding via Link or Ręcznie — auto-save to library but do NOT link (no warning icon)
    const exists = await prisma.product.findFirst({
      where: {
        userId,
        OR: [
          { name: { equals: name.trim(), mode: "insensitive" } },
          ...(url?.trim() ? [{ url: url.trim() }] : []),
        ],
      },
    });
    if (!exists) {
      await prisma.product.create({
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
          supplier: supplier || null,
          catalogNumber: catalogNumber || null,
          userId,
        },
      });
    }
  }

  const product = await prisma.listProduct.create({
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
      supplier: supplier || null,
      catalogNumber: catalogNumber || null,
      sectionId,
      order: count,
      productId: finalProductId,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
