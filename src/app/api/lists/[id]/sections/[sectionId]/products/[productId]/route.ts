import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";
import { logListChange } from "@/lib/list-changelog";

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
  const body = await req.json();

  const product = await findProduct(productId, sectionId, id, getWorkspaceUserId(session));
  if (!product) return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 });

  try {
    if (body.approval !== undefined) {
      if (!["accepted", "rejected", null].includes(body.approval)) {
        return NextResponse.json({ error: "Nieprawidłowa wartość" }, { status: 400 });
      }
      const updated = await prisma.listProduct.update({
        where: { id: productId },
        data: { approval: body.approval },
      });
      pusherServer.trigger(`shopping-list-${id}`, "approval-change", {
        productId,
        approval: body.approval,
      }).catch((e) => console.error("[approval] pusher trigger failed:", e));
      const approvalLabel = body.approval === "accepted" ? "zaakceptował produkt" : body.approval === "rejected" ? "odrzucił produkt" : "cofnął decyzję o produkcie";
      await logListChange({ listId: id, userId: session.user.id, userName: session.user.name ?? session.user.email ?? "Projektant", action: approvalLabel, details: product.name });
      return NextResponse.json(updated);
    }

    if (body.orderStatus !== undefined) {
      const valid = [null, "do_wyceny", "w_wycenie", "zamowione", "do_reklamacji"];
      if (!valid.includes(body.orderStatus)) {
        return NextResponse.json({ error: "Nieprawidłowa wartość" }, { status: 400 });
      }
      const updated = await prisma.listProduct.update({
        where: { id: productId },
        data: { orderStatus: body.orderStatus },
      });
      const statusLabels: Record<string, string> = { do_wyceny: "Do wyceny", w_wycenie: "W wycenie", zamowione: "Zamówione", do_reklamacji: "Do reklamacji" };
      const statusLabel = body.orderStatus ? statusLabels[body.orderStatus] ?? body.orderStatus : "brak";
      await logListChange({ listId: id, userId: session.user.id, userName: session.user.name ?? session.user.email ?? "Projektant", action: "Zmieniono status zamówienia", details: `${product.name} → ${statusLabel}` });
      return NextResponse.json(updated);
    }

    if (body.hidden !== undefined) {
      if (typeof body.hidden !== "boolean") {
        return NextResponse.json({ error: "Nieprawidłowa wartość" }, { status: 400 });
      }
      const updated = await prisma.listProduct.update({
        where: { id: productId },
        data: { hidden: body.hidden },
      });
      return NextResponse.json(updated);
    }

    if (body.optional !== undefined) {
      if (typeof body.optional !== "boolean") {
        return NextResponse.json({ error: "Nieprawidłowa wartość" }, { status: 400 });
      }
      const updated = await prisma.listProduct.update({
        where: { id: productId },
        data: { optional: body.optional },
      });
      return NextResponse.json(updated);
    }

    if (body.quantity !== undefined) {
      if (typeof body.quantity !== "number" || body.quantity < 1) {
        return NextResponse.json({ error: "Nieprawidłowa ilość" }, { status: 400 });
      }
      const updated = await prisma.listProduct.update({
        where: { id: productId },
        data: { quantity: body.quantity },
      });
      return NextResponse.json(updated);
    }

    if (body.parentProductId !== undefined) {
      let sectionMove: { sectionId: string; order: number } | undefined;
      if (body.parentProductId && body.newSectionId && body.newSectionId !== sectionId) {
        const targetSection = await prisma.listSection.findFirst({
          where: { id: body.newSectionId, listId: id, list: { userId: getWorkspaceUserId(session) } },
        });
        if (!targetSection) return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });
        const agg = await prisma.listProduct.aggregate({ where: { sectionId: body.newSectionId }, _max: { order: true } });
        sectionMove = { sectionId: body.newSectionId, order: (agg._max.order ?? -1) + 1 };
      }
      const updated = await prisma.listProduct.update({
        where: { id: productId },
        data: {
          parentProductId: body.parentProductId ?? null,
          optional: body.parentProductId ? true : false,
          ...(sectionMove ?? {}),
        },
      });
      return NextResponse.json(updated);
    }

    if (body.sectionId !== undefined) {
      const targetSection = await prisma.listSection.findFirst({
        where: { id: body.sectionId, listId: id, list: { userId: session.user.id } },
      });
      if (!targetSection) return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });

      const agg = await prisma.listProduct.aggregate({
        where: { sectionId: body.sectionId },
        _max: { order: true },
      });
      const newOrder = (agg._max.order ?? -1) + 1;

      const updated = await prisma.listProduct.update({
        where: { id: productId },
        data: { sectionId: body.sectionId, order: newOrder },
      });
      return NextResponse.json(updated);
    }
  } catch (err) {
    console.error("[PATCH product] error:", err);
    return NextResponse.json({ error: "Błąd serwera", detail: String(err) }, { status: 500 });
  }

  // Inline field updates (single field patches from product tile)
  const patchableFields = ["category", "color", "dimensions", "manufacturer", "supplier", "deliveryTime", "catalogNumber", "price", "name", "note"] as const;
  const patchField = patchableFields.find((f) => body[f] !== undefined);
  if (patchField) {
    try {
      const updated = await prisma.listProduct.update({
        where: { id: productId },
        data: { [patchField]: body[patchField] || null },
      });
      const fieldLabels: Record<string, string> = { price: "cenę", name: "nazwę", color: "kolor", dimensions: "wymiary", manufacturer: "producenta", supplier: "dostawcę", deliveryTime: "czas dostawy", catalogNumber: "nr katalogowy", category: "kategorię", note: "notatkę" };
      const fieldLabel = fieldLabels[patchField] ?? patchField;
      await logListChange({ listId: id, userId: session.user.id, userName: session.user.name ?? session.user.email ?? "Projektant", action: `Zmieniono ${fieldLabel}`, details: `${product.name}${body[patchField] ? ` → ${body[patchField]}` : ""}` });
      return NextResponse.json(updated);
    } catch (err) {
      return NextResponse.json({ error: "Błąd aktualizacji pola", detail: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Brak danych do aktualizacji" }, { status: 400 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string; productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId, productId } = await params;
  const body = await req.json();
  const { name, url, imageUrl, price, manufacturer, color, dimensions, description, deliveryTime, category, supplier, catalogNumber, note } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });

  const product = await findProduct(productId, sectionId, id, getWorkspaceUserId(session));
  if (!product) return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 });

  const sharedData = {
    name: name.trim(),
    url: url || null,
    imageUrl: imageUrl || null,
    price: price || null,
    manufacturer: manufacturer || null,
    color: color || null,
    dimensions: dimensions || null,
    description: description || null,
    deliveryTime: deliveryTime || null,
    category: category || null,
    supplier: supplier || null,
    catalogNumber: catalogNumber || null,
    note: note || null,
  };

  const updated = await prisma.listProduct.update({
    where: { id: productId },
    data: sharedData,
  });

  // Sync to library product if linked
  if (updated.productId) {
    await prisma.product.update({
      where: { id: updated.productId },
      data: sharedData,
    });
  }

  await logListChange({ listId: id, userId: session.user.id, userName: session.user.name ?? session.user.email ?? "Projektant", action: "Edytowano produkt", details: updated.name });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string; productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId, productId } = await params;

  const product = await findProduct(productId, sectionId, id, getWorkspaceUserId(session));
  if (!product) return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 });

  await prisma.listProduct.delete({ where: { id: productId } });

  await logListChange({ listId: id, userId: session.user.id, userName: session.user.name ?? session.user.email ?? "Projektant", action: "Usunięto produkt", details: product.name });

  return NextResponse.json({ ok: true });
}
