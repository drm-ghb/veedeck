import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const textures = await prisma.texture.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(textures);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { name, category, imageUrl, manufacturer, resolution, scale, finish, isPbr, urlAlbedo, urlNormal, urlRoughness, urlMetallic, urlAo, urlHeight } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  try {
    const texture = await prisma.texture.create({
      data: {
        name: name.trim(),
        category: category?.trim() || null,
        imageUrl: imageUrl || null,
        manufacturer: manufacturer?.trim() || null,
        resolution: resolution?.trim() || null,
        scale: scale?.trim() || null,
        finish: finish?.trim() || null,
        source: "own",
        isPbr: isPbr ?? false,
        urlAlbedo: urlAlbedo || null,
        urlNormal: urlNormal || null,
        urlRoughness: urlRoughness || null,
        urlMetallic: urlMetallic || null,
        urlAo: urlAo || null,
        urlHeight: urlHeight || null,
        userId,
      },
    });
    return NextResponse.json(texture, { status: 201 });
  } catch (err) {
    console.error("[textures POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
