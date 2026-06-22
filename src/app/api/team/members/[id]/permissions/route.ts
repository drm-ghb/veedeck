import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

const DEFAULT_PERMISSIONS = {
  hiddenModules: [],
  pfCanUpload: true,
  pfCanDelete: false,
  pfCanManageFolders: false,
  listCanCreate: true,
  listCanDelete: false,
  contrCanCreate: false,
  contrCanEdit: false,
  contrCanDelete: false,
  projCanCreate: false,
  projCanDelete: false,
  allowAllClients: true,
  allowedClientIds: [],
  taskCanCreate: true,
  taskCanDelete: false,
  surveyCanCreate: false,
  surveyCanDelete: false,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const member = await prisma.user.findFirst({ where: { id, ownerId } });
  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const perms = await prisma.teamMemberPermission.findUnique({ where: { memberId: id } });
  return NextResponse.json(perms ?? { memberId: id, ownerId, ...DEFAULT_PERMISSIONS });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const member = await prisma.user.findFirst({ where: { id, ownerId } });
  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const body = await req.json();

  const allowed = [
    "hiddenModules",
    "pfCanUpload", "pfCanDelete", "pfCanManageFolders",
    "listCanCreate", "listCanDelete",
    "contrCanCreate", "contrCanEdit", "contrCanDelete",
    "projCanCreate", "projCanDelete", "allowAllClients", "allowedClientIds",
    "taskCanCreate", "taskCanDelete",
    "surveyCanCreate", "surveyCanDelete",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const perms = await prisma.teamMemberPermission.upsert({
    where: { memberId: id },
    create: { memberId: id, ownerId, ...DEFAULT_PERMISSIONS, ...data },
    update: data,
  });

  return NextResponse.json(perms);
}
