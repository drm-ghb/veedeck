import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const { name, url, imageUrl, price, manufacturer, color, size, description, deliveryTime, quantity } = body;

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
      sectionId,
      order: count,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
