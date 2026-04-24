import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId },
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
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const existing = await prisma.project.findFirst({
    where: { id, userId },
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

  // Cascade archive/restore
  if (typeof body.archived === "boolean" && body.archived !== existing.archived) {
    await prisma.$transaction([
      prisma.project.update({ where: { id }, data: { archived: body.archived } }),
      prisma.room.updateMany({ where: { projectId: id }, data: { archived: body.archived } }),
      prisma.render.updateMany({ where: { projectId: id }, data: { archived: body.archived } }),
      prisma.shoppingList.updateMany({ where: { projectId: id }, data: { archived: body.archived } }),
    ]);
    return NextResponse.json({ success: true });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.title !== undefined && {
        slug: await uniqueSlug(body.title, (s) =>
          prisma.project.findFirst({ where: { slug: s, id: { not: id } } }).then(Boolean)
        ),
      }),
      ...(body.clientName !== undefined && { clientName: body.clientName || null }),
      ...(body.clientEmail !== undefined && { clientEmail: body.clientEmail || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.sharePassword !== undefined && { sharePassword: body.sharePassword || null }),
      ...(body.shareExpiresAt !== undefined && { shareExpiresAt: body.shareExpiresAt ? new Date(body.shareExpiresAt) : null }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
      ...(body.hiddenModules !== undefined && { hiddenModules: body.hiddenModules }),
      ...(body.addressCountry !== undefined && { addressCountry: body.addressCountry || null }),
      ...(body.addressCity !== undefined && { addressCity: body.addressCity || null }),
      ...(body.addressPostalCode !== undefined && { addressPostalCode: body.addressPostalCode || null }),
      ...(body.addressStreet !== undefined && { addressStreet: body.addressStreet || null }),
      ...(body.clientCanUpload !== undefined && { clientCanUpload: body.clientCanUpload }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
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
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  await prisma.project.deleteMany({
    where: { id, userId },
  });

  return NextResponse.json({ success: true });
}
