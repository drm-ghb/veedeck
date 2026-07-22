import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExtensionKey } from "@/lib/extension-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateExtensionKey(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isTrialExpired) return NextResponse.json({ error: "Trial wygasł — przejdź na plan płatny" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("listId");
  const sectionId = searchParams.get("sectionId");

  if (!listId || !sectionId) {
    return NextResponse.json({ error: "Brak listId lub sectionId" }, { status: 400 });
  }

  const product = await prisma.listProduct.findFirst({
    where: {
      id,
      sectionId,
      section: { listId, list: { userId: user.workspaceId } },
    },
  });

  if (!product) return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 });

  await prisma.listProduct.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
