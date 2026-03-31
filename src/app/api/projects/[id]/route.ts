import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      renders: {
        include: { _count: { select: { comments: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const body = await req.json();

  // If addModule is requested, add it to the modules array (avoid duplicates)
  // If removeModule is requested, filter it out
  let modulesUpdate: object | undefined;
  if (body.addModule) {
    if (!existing.modules.includes(body.addModule)) {
      modulesUpdate = { modules: { set: [...existing.modules, body.addModule] } };
    }
  } else if (body.removeModule) {
    modulesUpdate = { modules: { set: existing.modules.filter((m) => m !== body.removeModule) } };
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.clientName !== undefined && { clientName: body.clientName || null }),
      ...(body.clientEmail !== undefined && { clientEmail: body.clientEmail || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.archived !== undefined && { archived: body.archived }),
      ...(body.sharePassword !== undefined && { sharePassword: body.sharePassword || null }),
      ...(body.shareExpiresAt !== undefined && { shareExpiresAt: body.shareExpiresAt ? new Date(body.shareExpiresAt) : null }),
      ...modulesUpdate,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.project.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
