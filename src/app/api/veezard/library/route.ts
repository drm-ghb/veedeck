import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const models = await prisma.model3D.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(models);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { name, category, meshyTaskId, thumbnailUrl, urlGlb, urlObj, urlStl, urlFbx } =
    await req.json();

  if (!name?.trim() || !category?.trim()) {
    return NextResponse.json({ error: "name and category required" }, { status: 400 });
  }

  const model = await prisma.model3D.create({
    data: {
      userId,
      name: name.trim(),
      category: category.trim(),
      meshyTaskId: meshyTaskId ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      urlGlb: urlGlb ?? null,
      urlObj: urlObj ?? null,
      urlStl: urlStl ?? null,
      urlFbx: urlFbx ?? null,
    },
  });

  return NextResponse.json(model, { status: 201 });
}
