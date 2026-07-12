import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

const VALID_APPROVALS = ["accepted", "rejected", null];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; productId: string }> }
) {
  const { token, productId } = await params;
  const { approval, clientName } = await req.json();

  if (!VALID_APPROVALS.includes(approval)) {
    return NextResponse.json({ error: "Nieprawidłowa wartość" }, { status: 400 });
  }

  const product = await prisma.listProduct.findFirst({
    where: {
      id: productId,
      section: { list: { shareToken: token, archived: false } },
    },
    include: {
      section: {
        include: {
          list: { select: { id: true, name: true, slug: true, userId: true, projectId: true } },
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 });
  }

  await prisma.listProduct.update({
    where: { id: productId },
    data: { approval },
  });

  const list = product.section.list;

  try {
    await pusherServer.trigger(`shopping-list-${list.id}`, "approval-change", {
      productId,
      approval,
    });
  } catch (e) {
    console.error("[approval] pusher trigger failed:", e);
  }

  if (approval !== null && list.projectId) {
    await prisma.clientEvent.create({
      data: {
        projectId: list.projectId,
        type: approval === "accepted" ? "product_approved" : "product_rejected",
        clientName: clientName ?? null,
        meta: { productId, productName: product.name, listId: list.id, listName: list.name, listSlug: list.slug ?? list.id },
      },
    }).catch(() => {});
  }

  if (approval !== null && clientName) {
    try {
      const label = approval === "accepted" ? "zaakceptował(a)" : "odrzucił(a)";
      const listPath = list.slug ?? list.id;
      const notification = await prisma.notification.create({
        data: {
          userId: list.userId,
          message: `${clientName} ${label} produkt „${product.name}" na liście „${list.name}"`,
          link: `/listy-zakupowe/${listPath}`,
          type: "list_approval",
        },
      });
      await pusherServer.trigger(`user-${list.userId}`, "new-notification", notification);
    } catch (e) {
      console.error("[approval] notification failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
