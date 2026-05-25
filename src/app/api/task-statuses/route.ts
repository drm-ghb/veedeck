import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

const DEFAULT_STATUSES = [
  { value: "TODO", label: "Do zrobienia", color: "#6b7280", order: 0 },
  { value: "IN_PROGRESS", label: "W trakcie", color: "#3b82f6", order: 1 },
  { value: "DONE", label: "Zrobione", color: "#22c55e", order: 2 },
];

async function getOrSeedStatuses(ownerId: string) {
  let statuses = await prisma.taskStatusConfig.findMany({
    where: { ownerId },
    orderBy: { order: "asc" },
  });

  if (statuses.length === 0) {
    await prisma.taskStatusConfig.createMany({
      data: DEFAULT_STATUSES.map((s) => ({ ...s, ownerId })),
      skipDuplicates: true,
    });
  } else {
    // Normalize labels of default statuses if they were seeded with old values
    const LABEL_MIGRATIONS: Record<string, string> = { Gotowe: "Zrobione" };
    await Promise.all(
      statuses
        .filter((s) => LABEL_MIGRATIONS[s.label])
        .map((s) =>
          prisma.taskStatusConfig.update({
            where: { id: s.id },
            data: { label: LABEL_MIGRATIONS[s.label] },
          })
        )
    );
  }

  return prisma.taskStatusConfig.findMany({
    where: { ownerId },
    orderBy: { order: "asc" },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = getWorkspaceUserId(session);
  return NextResponse.json(await getOrSeedStatuses(ownerId));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = getWorkspaceUserId(session);

  const { label, color } = await req.json();
  if (!label?.trim()) return NextResponse.json({ error: "Label jest wymagany" }, { status: 400 });

  const existing = await prisma.taskStatusConfig.findMany({ where: { ownerId } });
  const maxOrder = existing.reduce((m, s) => Math.max(m, s.order), -1);

  const base = label.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
  let value = base;
  let i = 1;
  while (existing.some((s) => s.value === value)) value = `${base}_${i++}`;

  const status = await prisma.taskStatusConfig.create({
    data: { value, label: label.trim(), color: color || "#6b7280", order: maxOrder + 1, ownerId },
  });
  return NextResponse.json(status, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  // Batch reorder: { order: [id1, id2, ...] }
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = getWorkspaceUserId(session);

  const { order } = await req.json();
  if (!Array.isArray(order)) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await Promise.all(
    order.map((id: string, index: number) =>
      prisma.taskStatusConfig.updateMany({ where: { id, ownerId }, data: { order: index } })
    )
  );
  return NextResponse.json({ ok: true });
}
