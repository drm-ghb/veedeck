import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  // ProjectClient IDs — used for schedule + payments
  const allClientIds = (
    await prisma.projectClient.findMany({
      where: project.clientId ? { clientId: project.clientId } : { projectId },
      select: { id: true },
    })
  ).map((c) => c.id);

  // Client entity IDs — used for surveys
  const userLinks = await prisma.projectClient.findMany({
    where: { userId: session.user.id, clientId: { not: null } },
    select: { clientId: true },
  });
  const clientEntityIds = [
    ...new Set([
      ...(project.clientId ? [project.clientId] : []),
      ...userLinks.map((l) => l.clientId as string),
    ]),
  ];

  const [recentRenders, recentProducts, schedulePhases, payments, surveys] = await Promise.all([
    // 3 most recently added renders in this project
    prisma.render.findMany({
      where: { projectId, archived: false, roomId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true, name: true, fileUrl: true, fileType: true, status: true, createdAt: true,
        room: { select: { id: true, name: true } },
        folder: { select: { id: true } },
      },
    }),

    // 3 most recently added products from lists in this project
    prisma.listProduct.findMany({
      where: { section: { list: { projectId, archived: false } } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true, name: true, imageUrl: true, approval: true, category: true, createdAt: true,
        section: { select: { list: { select: { id: true, name: true } } } },
      },
    }),

    // Schedule phases (only if shared with client)
    project.scheduleSharedWithClient && allClientIds.length > 0
      ? prisma.schedulePhase.findMany({
          where: { clientId: { in: allClientIds }, hidden: false },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: {
            id: true, name: true, done: true,
            items: {
              where: { hidden: false, done: false },
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
              select: { id: true, name: true, endDate: true },
              take: 1,
            },
          },
        })
      : Promise.resolve(null),

    // Payments (only if shared with client)
    project.paymentsSharedWithClient && allClientIds.length > 0
      ? prisma.payment.findMany({
          where: { clientId: { in: allClientIds } },
          select: { id: true, name: true, amount: true, status: true },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve(null),

    // Surveys (only if client has entity IDs to query)
    clientEntityIds.length > 0
      ? prisma.survey.findMany({
          where: { status: "ACTIVE", archived: false, assignedClientId: { in: clientEntityIds } },
          orderBy: { order: "asc" },
          select: {
            id: true, name: true, shareToken: true,
            _count: { select: { questions: true } },
            responses: {
              where: { respondentEmail: session.user.email! },
              select: { completedAt: true, _count: { select: { answers: true } } },
              orderBy: [{ completedAt: "asc" }, { createdAt: "desc" }],
              take: 1,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  // Process schedule: first non-done phase = "current"
  let scheduleSummary = null;
  if (schedulePhases) {
    let foundCurrent = false;
    const phases = schedulePhases.map((p) => {
      const isCurrent = !foundCurrent && !p.done;
      if (isCurrent) foundCurrent = true;
      return {
        id: p.id,
        name: p.name,
        done: p.done,
        isCurrent,
        nextItem:
          isCurrent && p.items[0]
            ? { name: p.items[0].name, endDate: p.items[0].endDate?.toISOString() ?? null }
            : null,
      };
    });
    scheduleSummary = { phases };
  }

  // Process payments: paid total, grand total, first pending
  let paymentsSummary = null;
  if (payments) {
    const paidTotal = payments
      .filter((p) => p.status !== "pending")
      .reduce((s, p) => s + p.amount, 0);
    const grandTotal = payments.reduce((s, p) => s + p.amount, 0);
    const nextPending = payments.find((p) => p.status === "pending");
    paymentsSummary = {
      paidTotal,
      grandTotal,
      nextPayment: nextPending ? { name: nextPending.name, amount: nextPending.amount } : null,
    };
  }

  // Process surveys: only incomplete ones
  let pendingSurveys = null;
  if (surveys) {
    pendingSurveys = surveys
      .map((s) => {
        const response = s.responses[0] ?? null;
        if (response?.completedAt) return null;
        return {
          id: s.id,
          name: s.name,
          shareToken: s.shareToken,
          answeredCount: response?._count.answers ?? 0,
          totalQuestions: s._count.questions,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }

  return NextResponse.json({
    recentRenders: recentRenders.map((r) => ({
      id: r.id,
      name: r.name,
      fileUrl: r.fileUrl,
      fileType: r.fileType,
      status: r.status,
      roomId: r.room!.id,
      roomName: r.room!.name,
      folderId: r.folder?.id ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    recentProducts: recentProducts.map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      approval: p.approval,
      category: p.category,
      listId: p.section.list.id,
      listName: p.section.list.name,
      createdAt: p.createdAt.toISOString(),
    })),
    scheduleSummary,
    paymentsSummary,
    pendingSurveys,
  });
}
