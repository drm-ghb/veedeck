import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function findProduct(productId: string, sectionId: string, listId: string, userId: string) {
  return prisma.listProduct.findFirst({
    where: {
      id: productId,
      sectionId,
      section: { listId, list: { userId } },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string; productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId, productId } = await params;
  const { quantity } = await req.json();

  if (typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "Nieprawidłowa ilość" }, { status: 400 });
  }

  const product = await findProduct(productId, sectionId, id, session.user.id);
  if (!product) return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 });

  const updated = await prisma.listProduct.update({
    where: { id: productId },
    data: { quantity },
  });

  return NextResponse.json(updated);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string; productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId, productId } = await params;
  const body = await req.json();
  const { name, url, imageUrl, price, manufacturer, color, size, description, deliveryTime } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });

  const product = await findProduct(productId, sectionId, id, session.user.id);
  if (!product) return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 });

  const updated = await prisma.listProduct.update({
    where: { id: productId },
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
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string; productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId, productId } = await params;

  const product = await findProduct(productId, sectionId, id, session.user.id);
  if (!product) return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 });

  await prisma.listProduct.delete({ where: { id: productId } });

  return NextResponse.json({ ok: true });
}
