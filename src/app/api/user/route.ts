import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email } = body;

  if (email && email !== session.user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Adres email jest już zajęty" }, { status: 409 });
    }
  }

  const boolFields = [
    "allowDirectStatusChange", "allowClientComments", "allowClientAcceptance",
    "requireClientEmail", "requirePinTitle", "autoClosePinsOnAccept",
    "autoArchiveOnAccept", "hideCommentCount", "notifyClientOnStatusChange",
    "notifyClientOnReply", "allowClientVersionRestore", "showProfileName", "showClientLogo",
  ] as const;
  const stringFields = ["clientWelcomeMessage", "clientLogoUrl", "accentColor", "defaultRenderOrder", "defaultRenderStatus", "navMode"] as const;

  const VALID_COLOR_THEMES = ["champagne", "obsidian", "navy", "plum", "mono"] as const;
  if (body.colorTheme !== undefined && !VALID_COLOR_THEMES.includes(body.colorTheme)) {
    return NextResponse.json({ error: "Nieprawidłowy motyw kolorystyczny" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (body.maxPinsPerRender !== undefined) data.maxPinsPerRender = body.maxPinsPerRender === null ? null : Number(body.maxPinsPerRender);
  for (const f of boolFields) if (body[f] !== undefined) data[f] = body[f];
  for (const f of stringFields) if (body[f] !== undefined) data[f] = body[f] || null;
  if (body.globalHiddenModules !== undefined) data.globalHiddenModules = body.globalHiddenModules;
  if (body.colorTheme !== undefined) data.colorTheme = body.colorTheme;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: data as Parameters<typeof prisma.user.update>[0]["data"],
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(user);
}
