import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getWorkspaceUserId(session as any);
  const { id: clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, designerId: userId },
    select: {
      id: true,
      contacts: { select: { email: true, name: true } },
    },
  });
  if (!client) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const projects = await prisma.project.findMany({
    where: { clientId, userId },
    select: { id: true },
  });

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return NextResponse.json({ events: [] });

  const clientEmails = client.contacts
    .map((c) => c.email)
    .filter((e): e is string => !!e);

  const [
    comments,
    listComments,
    statusRequests,
    versionRequests,
    surveyResponses,
    loginLogs,
    clientEvents,
  ] = await Promise.all([
    prisma.comment.findMany({
      where: {
        fromDesigner: false,
        isInternal: false,
        isAiSummary: false,
        render: { projectId: { in: projectIds } },
      },
      select: {
        id: true,
        content: true,
        author: true,
        posX: true,
        posY: true,
        createdAt: true,
        renderId: true,
        render: { select: { name: true, projectId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),

    prisma.listProductComment.findMany({
      where: {
        product: {
          section: {
            list: { projectId: { in: projectIds }, archived: false },
          },
        },
      },
      select: {
        id: true,
        content: true,
        author: true,
        createdAt: true,
        productId: true,
        product: {
          select: {
            name: true,
            section: { select: { list: { select: { id: true, name: true, slug: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),

    prisma.statusChangeRequest.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, renderName: true, clientName: true, createdAt: true, renderId: true, status: true, projectId: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    prisma.versionRestoreRequest.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, renderName: true, clientName: true, createdAt: true, renderId: true, status: true, projectId: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    prisma.surveyResponse.findMany({
      where: {
        completedAt: { not: null },
        survey: { projectId: { in: projectIds } },
      },
      select: {
        id: true,
        respondentEmail: true,
        respondentName: true,
        completedAt: true,
        surveyId: true,
        survey: { select: { name: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 100,
    }),

    clientEmails.length > 0
      ? prisma.loginLog.findMany({
          where: { email: { in: clientEmails }, success: true },
          select: { id: true, email: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),

    prisma.clientEvent.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        id: true,
        type: true,
        clientEmail: true,
        clientName: true,
        meta: true,
        createdAt: true,
        projectId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  type HistoryEvent = {
    id: string;
    type: string;
    date: string;
    label: string;
    detail: string | null;
    actor: string | null;
    link: string | null;
    meta: Record<string, unknown>;
  };

  const events: HistoryEvent[] = [];

  for (const c of comments) {
    const isPin = c.posX !== null;
    events.push({
      id: `comment-${c.id}`,
      type: isPin ? "pin" : "chat_comment",
      date: c.createdAt.toISOString(),
      label: isPin ? `Pin na pliku „${c.render.name}"` : `Komentarz do pliku „${c.render.name}"`,
      detail: c.content,
      actor: c.author,
      link: `/projekty/${c.render.projectId}/renders/${c.renderId}`,
      meta: { renderId: c.renderId, renderName: c.render.name },
    });
  }

  for (const lc of listComments) {
    const list = lc.product.section.list;
    const listPath = list.slug ?? list.id;
    events.push({
      id: `list-comment-${lc.id}`,
      type: "list_comment",
      date: lc.createdAt.toISOString(),
      label: `Komentarz do produktu „${lc.product.name}"`,
      detail: lc.content,
      actor: lc.author,
      link: `/listy-zakupowe/${listPath}?product=${lc.productId}`,
      meta: { listId: list.id, listName: list.name, productId: lc.productId, productName: lc.product.name },
    });
  }

  for (const sr of statusRequests) {
    events.push({
      id: `status-req-${sr.id}`,
      type: "status_request",
      date: sr.createdAt.toISOString(),
      label: `Prośba o weryfikację pliku „${sr.renderName}"`,
      detail: null,
      actor: sr.clientName,
      link: `/projekty/${sr.projectId}/renders/${sr.renderId}`,
      meta: { renderId: sr.renderId, renderName: sr.renderName, status: sr.status },
    });
  }

  for (const vr of versionRequests) {
    events.push({
      id: `version-req-${vr.id}`,
      type: "version_request",
      date: vr.createdAt.toISOString(),
      label: `Prośba o przywrócenie wersji pliku „${vr.renderName}"`,
      detail: null,
      actor: vr.clientName,
      link: `/projekty/${vr.projectId}/renders/${vr.renderId}`,
      meta: { renderId: vr.renderId, renderName: vr.renderName, status: vr.status },
    });
  }

  for (const resp of surveyResponses) {
    if (!resp.completedAt) continue;
    events.push({
      id: `survey-${resp.id}`,
      type: "survey_response",
      date: resp.completedAt.toISOString(),
      label: `Wypełnił(a) ankietę „${resp.survey.name}"`,
      detail: null,
      actor: resp.respondentName ?? resp.respondentEmail,
      link: `/ankiety/${resp.surveyId}/odpowiedzi`,
      meta: { surveyId: resp.surveyId, surveyName: resp.survey.name },
    });
  }

  for (const log of loginLogs) {
    const contactName = client.contacts.find((c) => c.email === log.email)?.name ?? null;
    events.push({
      id: `login-${log.id}`,
      type: "login",
      date: log.createdAt.toISOString(),
      label: "Logowanie do panelu klienta",
      detail: null,
      actor: contactName ?? log.email,
      link: null,
      meta: { email: log.email },
    });
  }

  for (const ev of clientEvents) {
    const meta = (ev.meta ?? {}) as Record<string, unknown>;
    const actor = ev.clientName ?? ev.clientEmail ?? null;
    if (ev.type === "render_view") {
      events.push({
        id: `ev-${ev.id}`,
        type: "render_view",
        date: ev.createdAt.toISOString(),
        label: `Wyświetlił(a) plik „${meta.renderName ?? meta.renderId}"`,
        detail: null,
        actor,
        link: meta.renderId ? `/projekty/${ev.projectId}/renders/${meta.renderId}` : null,
        meta,
      });
    } else if (ev.type === "list_view") {
      events.push({
        id: `ev-${ev.id}`,
        type: "list_view",
        date: ev.createdAt.toISOString(),
        label: `Wyświetlił(a) listę „${meta.listName ?? meta.listId}"`,
        detail: null,
        actor,
        link: null,
        meta,
      });
    } else if (ev.type === "product_approved") {
      const listPath = meta.listSlug ?? meta.listId;
      events.push({
        id: `ev-${ev.id}`,
        type: "product_approved",
        date: ev.createdAt.toISOString(),
        label: `Zaakceptował(a) produkt „${meta.productName}"`,
        detail: null,
        actor,
        link: listPath ? `/listy-zakupowe/${listPath}?product=${meta.productId}` : null,
        meta,
      });
    } else if (ev.type === "product_rejected") {
      const listPath = meta.listSlug ?? meta.listId;
      events.push({
        id: `ev-${ev.id}`,
        type: "product_rejected",
        date: ev.createdAt.toISOString(),
        label: `Odrzucił(a) produkt „${meta.productName}"`,
        detail: null,
        actor,
        link: listPath ? `/listy-zakupowe/${listPath}?product=${meta.productId}` : null,
        meta,
      });
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ events });
}
