import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExtensionKey } from "@/lib/extension-auth";
import { pusherServer } from "@/lib/pusher";
import { UTApi } from "uploadthing/server";

async function reuploadImage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; veedeck-bot/1.0)" },
  });
  if (!res.ok) return url;
  const blob = await res.blob();
  const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const file = new File([blob], `product-${Date.now()}.${ext}`, { type: blob.type });
  const utapi = new UTApi();
  const result = await utapi.uploadFiles(file);
  return result.data?.url ?? url;
}

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
    note,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  if (!listId || !sectionId) return NextResponse.json({ error: "Brak listId lub sectionId" }, { status: 400 });

  // Re-upload external image to UploadThing to avoid hotlink protection
  let finalImageUrl = imageUrl || null;
  if (imageUrl) {
    try {
      finalImageUrl = await reuploadImage(imageUrl);
    } catch {
      // fallback to original URL
    }
  }

  // Verify ownership — list must belong to the workspace
  const section = await prisma.listSection.findFirst({
    where: {
      id: sectionId,
      listId,
      list: { userId: user.workspaceId },
    },
  });
  if (!section) return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });

  // Auto-save to product library (no link — same logic as manual/link tab)
  const exists = await prisma.product.findFirst({
    where: {
      userId: user.workspaceId,
      OR: [
        { name: { equals: name.trim(), mode: "insensitive" } },
        ...(url?.trim() ? [{ url: url.trim() }] : []),
      ],
    },
    select: { id: true, category: true },
  });
  if (!exists) {
    await prisma.product.create({
      data: {
        name: name.trim(),
        url: url || null,
        imageUrl: finalImageUrl,
        price: price || null,
        manufacturer: manufacturer || null,
        color: color || null,
        category: category || null,
        supplier: supplier || null,
        quantity: typeof quantity === "number" && quantity >= 1 ? quantity : 1,
        description: description || null,
        catalogNumber: catalogNumber || null,
        userId: user.workspaceId,
      },
    });
  } else if (category && !exists.category) {
    await prisma.product.update({
      where: { id: exists.id },
      data: { category },
    });
  }

  const count = await prisma.listProduct.count({ where: { sectionId } });

  const product = await prisma.listProduct.create({
    data: {
      name: name.trim(),
      url: url || null,
      imageUrl: finalImageUrl,
      price: price || null,
      manufacturer: manufacturer || null,
      color: color || null,
      dimensions: dimensions || null,
      category: category || null,
      supplier: supplier || null,
      quantity: typeof quantity === "number" && quantity >= 1 ? quantity : 1,
      description: description || null,
      catalogNumber: catalogNumber || null,
      note: note || null,
      sectionId,
      order: count,
    },
  });

  await pusherServer.trigger(`shopping-list-${listId}`, "product-added", { sectionId });

  return NextResponse.json(product, { status: 201 });
}
