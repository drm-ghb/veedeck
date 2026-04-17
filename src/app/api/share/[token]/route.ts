import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      user: {
        select: {
          name: true,
          allowDirectStatusChange: true,
          allowClientComments: true,
          allowClientAcceptance: true,
          requireClientEmail: true,
          hideCommentCount: true,
          clientWelcomeMessage: true,
          clientLogoUrl: true,
          accentColor: true,
          defaultRenderOrder: true,
          notifyClientOnStatusChange: true,
          notifyClientOnReply: true,
          allowClientVersionRestore: true,
          showProfileName: true,
          navMode: true,
        },
      },
      shoppingLists: {
        where: { archived: false },
        select: { id: true, name: true, shareToken: true },
      },
      rooms: {
        where: { archived: false },
        orderBy: { order: "asc" },
        include: {
          folders: {
            where: { archived: false },
            orderBy: { order: "asc" },
            select: { id: true, name: true, pinned: true },
          },
          renders: {
            where: { archived: false },
            orderBy: { order: "asc" },
            include: {
              comments: {
                where: { isInternal: false },
                orderBy: { createdAt: "asc" },
                include: { replies: { orderBy: { createdAt: "asc" } } },
              },
              versions: {
                orderBy: { archivedAt: "desc" },
                select: { id: true, fileUrl: true, versionNumber: true, archivedAt: true },
              },
              folder: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  if (project.archived) {
    return NextResponse.json({ error: "Projekt zarchiwizowany", expired: true }, { status: 410 });
  }

  // Check link expiry
  if (project.shareExpiresAt && new Date() > new Date(project.shareExpiresAt)) {
    return NextResponse.json({ error: "Link wygasł", expired: true }, { status: 410 });
  }

  // Check share password
  const providedPassword = req.headers.get("x-share-password");
  if (project.sharePassword) {
    if (!providedPassword || providedPassword !== project.sharePassword) {
      return NextResponse.json({ error: "Wymagane hasło", passwordRequired: true }, { status: 401 });
    }
  }

  // Check module visibility
  if (project.hiddenModules.includes("renderflow")) {
    return NextResponse.json({ error: "Brak dostępu", moduleHidden: true }, { status: 403 });
  }

  const { user, sharePassword, shareExpiresAt, ...rest } = project;
  const { name, showProfileName, ...userSettings } = user;
  return NextResponse.json({
    ...rest,
    ...userSettings,
    designerName: showProfileName ? name : null,
    hasPassword: !!project.sharePassword,
    shareExpiresAt: project.shareExpiresAt?.toISOString() ?? null,
  });
}
