import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

async function getAuthorizedRender(renderId: string, userId: string) {
  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: { project: { select: { userId: true } } },
  });
  if (!render || render.project.userId !== userId) return null;
  return render;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const render = await getAuthorizedRender(id, userId);
  if (!render) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const pins = await prisma.renderProductPin.findMany({
    where: { renderId: id, archivedVersionId: null },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, url: true, price: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pins);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const render = await getAuthorizedRender(id, userId);
  if (!render) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { productId: rawProductId, posX, posY } = await req.json();
  if (!rawProductId || posX == null || posY == null) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  let productId = rawProductId as string;

  // Handle manually-added list products (no catalog link) identified by "lp:" prefix
  if (productId.startsWith("lp:")) {
    const listProductId = productId.slice(3);
    const lp = await prisma.listProduct.findUnique({
      where: { id: listProductId },
      include: { section: { include: { list: { select: { userId: true, projectId: true } } } } },
    });
    if (!lp || lp.section.list.userId !== userId) return NextResponse.json({ error: "Produkt nie istnieje" }, { status: 404 });

    if (lp.productId) {
      // Already linked to catalog product — use it directly
      productId = lp.productId;
    } else {
      // Create a catalog Product from the list product and link back to avoid duplicates
      const created = await prisma.product.create({
        data: { name: lp.name, imageUrl: lp.imageUrl, url: lp.url, price: lp.price, manufacturer: lp.manufacturer, userId },
      });
      await prisma.listProduct.update({ where: { id: listProductId }, data: { productId: created.id } });
      productId = created.id;
    }
  }

  // Verify product belongs to this designer
  const product = await prisma.product.findFirst({ where: { id: productId, userId } });
  if (!product) return NextResponse.json({ error: "Produkt nie istnieje" }, { status: 404 });

  // Anti-collision: min 3% euclidean distance from existing pins
  const existing = await prisma.renderProductPin.findMany({ where: { renderId: id } });
  const tooClose = existing.some((p) => {
    const dx = p.posX - posX;
    const dy = p.posY - posY;
    return Math.sqrt(dx * dx + dy * dy) < 3;
  });
  if (tooClose) {
    return NextResponse.json({ error: "Za blisko innego pinu" }, { status: 409 });
  }

  const pin = await prisma.renderProductPin.create({
    data: { renderId: id, productId, posX, posY },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, url: true, price: true } },
    },
  });

  return NextResponse.json(pin, { status: 201 });
}
