import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, url, imageUrl, price, manufacturer, color, dimensions, description, deliveryTime, quantity, category, supplier, catalogNumber, productId: bodyProductId } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  }

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!list) return NextResponse.json({ error: "Nie znaleziono listy" }, { status: 404 });

  // Find or create the unsorted section for this list
  let unsortedSection = await prisma.listSection.findFirst({
    where: { listId: id, unsorted: true },
  });
  if (!unsortedSection) {
    unsortedSection = await prisma.listSection.create({
      data: { listId: id, name: "__unsorted__", order: -1, unsorted: true },
    });
  }

  const sectionId = unsortedSection.id;
  const userId = session.user.id;

  // Link to library product only when explicitly added from library tab
  let finalProductId: string | null = null;
  if (bodyProductId) {
    const owned = await prisma.product.findFirst({ where: { id: bodyProductId, userId } });
    if (owned) finalProductId = owned.id;
  } else {
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

  const count = await prisma.listProduct.count({ where: { sectionId } });
  const product = await prisma.listProduct.create({
    data: {
      name: name.trim(),
      url: url || null,
      imageUrl: imageUrl || null,
      price: price || null,
      manufacturer: manufacturer || null,
      color: color || null,
      size: size || null,
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
