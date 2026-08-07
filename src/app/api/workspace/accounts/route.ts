import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryAccountId: true,
      name: true,
      fullName: true,
      avatarUrl: true,
      clientLogoUrl: true,
      email: true,
    },
  });

  const primaryId = currentUser?.primaryAccountId ?? userId;

  // Get primary account info (may be self)
  const primaryAccount = currentUser?.primaryAccountId
    ? await prisma.user.findUnique({
        where: { id: primaryId },
        select: { id: true, name: true, fullName: true, avatarUrl: true, clientLogoUrl: true, email: true },
      })
    : {
        id: userId,
        name: currentUser?.name ?? null,
        fullName: currentUser?.fullName ?? null,
        avatarUrl: currentUser?.avatarUrl ?? null,
        clientLogoUrl: currentUser?.clientLogoUrl ?? null,
        email: currentUser?.email ?? null,
      };

  // Get all workspace accounts linked to the primary
  const workspaceAccounts = await prisma.user.findMany({
    where: { primaryAccountId: primaryId },
    select: {
      id: true,
      avatarUrl: true,
      owner: { select: { name: true, fullName: true, avatarUrl: true, clientLogoUrl: true } },
    },
  });

  const workspaces = [
    {
      userId: primaryAccount!.id,
      name: primaryAccount!.name || primaryAccount!.fullName || primaryAccount!.email || "Mój workspace",
      avatarUrl: primaryAccount!.clientLogoUrl ?? primaryAccount!.avatarUrl,
      isCurrent: userId === primaryId,
    },
    ...workspaceAccounts.map((wa) => ({
      userId: wa.id,
      name: wa.owner?.name || wa.owner?.fullName || "Workspace",
      avatarUrl: wa.owner?.clientLogoUrl ?? wa.owner?.avatarUrl ?? wa.avatarUrl,
      isCurrent: userId === wa.id,
    })),
  ];

  return NextResponse.json({ workspaces });
}
