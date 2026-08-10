import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET() {
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
  const { name, category, thumbnailUrl, urlGlb, urlFbx, urlObj, linkedProductId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });

  const ext = urlGlb ? "glb" : urlFbx ? "fbx" : urlObj ? "obj" : null;

  const model = await prisma.model3D.create({
    data: {
      name: name.trim(),
      category: category?.trim() || "Inne",
      thumbnailUrl: thumbnailUrl || null,
      urlGlb: urlGlb || null,
      urlFbx: urlFbx || null,
      urlObj: urlObj || null,
      linkedProductId: linkedProductId || null,
      userId,
    },
  });
  return NextResponse.json({ ...model, ext }, { status: 201 });
}
