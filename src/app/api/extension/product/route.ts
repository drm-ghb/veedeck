import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExtensionKey } from "@/lib/extension-auth";
import { pusherServer } from "@/lib/pusher";

/**
 * POST — add a product to a list section from the extension.
 * Body: { listId, sectionId, name, url, imageUrl, price, supplier,
 *         quantity, description, catalogNumber }
 */
export async function POST(req: NextRequest) {
  const user = await validateExtensionKey(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    listId,
    sectionId,
    name,
    url,
    imageUrl,
    price,
    manufacturer,
    color,
    dimensions,
    category,
    supplier,
    quantity,
    description,
    catalogNumber,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  if (!listId || !sectionId) return NextResponse.json({ error: "Brak listId lub sectionId" }, { status: 400 });

  // Verify ownership — list must belong to the workspace
  const section = await prisma.listSection.findFirst({
    where: {
      id: sectionId,
      listId,
      list: { userId: user.workspaceId },
    },
  });
  if (!section) return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });

  // Duplicate check — same URL or (when no URL) same name in the section
  if (url?.trim()) {
    const duplicate = await prisma.listProduct.findFirst({
      where: { sectionId, url: url.trim() },
    });
    if (duplicate) return NextResponse.json({ error: "Produkt już istnieje w tej sekcji" }, { status: 409 });
  } else {
    const duplicate = await prisma.listProduct.findFirst({
      where: { sectionId, name: { equals: name.trim(), mode: "insensitive" } },
    });
    if (duplicate) return NextResponse.json({ error: "Produkt już istnieje w tej sekcji" }, { status: 409 });
  }

  // Auto-save to product library (no link — same logic as manual/link tab)
  const exists = await prisma.product.findFirst({
    where: {
      userId: user.workspaceId,
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
        supplier: supplier || null,
        quantity: typeof quantity === "number" && quantity >= 1 ? quantity : 1,
        description: description || null,
        catalogNumber: catalogNumber || null,
        userId: user.workspaceId,
      },
    });
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
      dimensions: dimensions || null,
      category: category || null,
      supplier: supplier || null,
      quantity: typeof quantity === "number" && quantity >= 1 ? quantity : 1,
      description: description || null,
      catalogNumber: catalogNumber || null,
      sectionId,
      order: count,
    },
  });

  await pusherServer.trigger(`shopping-list-${listId}`, "product-added", { sectionId });

  return NextResponse.json(product, { status: 201 });
}
