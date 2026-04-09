import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedProduct(id: string, userId: string) {
  return prisma.product.findFirst({ where: { id, userId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await getOwnedProduct(id, session.user.id);
  if (!product) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const body = await req.json();
  const { name, url, imageUrl, price, manufacturer, color, dimensions, description, deliveryTime, quantity, category } = body;

  if (name !== undefined && !name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });

  const productData = {
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(url !== undefined ? { url: url || null } : {}),
    ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
    ...(price !== undefined ? { price: price || null } : {}),
    ...(manufacturer !== undefined ? { manufacturer: manufacturer || null } : {}),
    ...(color !== undefined ? { color: color || null } : {}),
    ...(dimensions !== undefined ? { dimensions: dimensions || null } : {}),
    ...(description !== undefined ? { description: description || null } : {}),
    ...(deliveryTime !== undefined ? { deliveryTime: deliveryTime || null } : {}),
    ...(quantity !== undefined ? { quantity: typeof quantity === "number" && quantity >= 1 ? quantity : 1 } : {}),
    ...(category !== undefined ? { category: category || null } : {}),
  };

  try {
    const updated = await prisma.product.update({ where: { id }, data: productData });

    // Sync fields (except quantity) to all linked ListProducts
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { quantity: _qty, ...listProductData } = productData;
    if (Object.keys(listProductData).length > 0) {
      await prisma.listProduct.updateMany({
        where: { productId: id },
        data: listProductData,
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/products/[id]]", err);
    return NextResponse.json({ error: "Błąd serwera", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await getOwnedProduct(id, session.user.id);
  if (!product) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
