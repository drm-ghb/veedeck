import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AI_DAILY_LIMIT = 10;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "find_client",
    description:
      "Finds clients of the current designer by name. Returns matching clients with their IDs. Always call this first before any client-specific query to resolve a client name to an ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Client name or partial name to search (case-insensitive)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_daily_summary",
    description:
      "Returns a summary of ALL client activity across ALL the designer's clients for a given number of hours. Use this when the designer asks for a daily summary, morning briefing, '24h summary', 'co się działo', or any overview of recent activity across multiple clients. Do NOT use find_client + get_client_activity for this — use this tool directly.",
    input_schema: {
      type: "object" as const,
      properties: {
        hours: {
          type: "number",
          description: "Number of hours to look back. Defaults to 24.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_client_activity",
    description:
      "Returns comprehensive activity data for a client across all modules: RenderFlow (render views, client comments on renders), Shopping Lists (changes, product approvals/rejections, client comments on products), Discussions (messages written by client), Surveys (responses), Moodboard (views). Use clientId from find_client.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientId: {
          type: "string",
          description: "Client ID obtained from find_client",
        },
        dateFrom: {
          type: "string",
          description: "Start date YYYY-MM-DD. Defaults to 7 days ago if not provided.",
        },
        dateTo: {
          type: "string",
          description: "End date YYYY-MM-DD. Defaults to today if not provided.",
        },
      },
      required: ["clientId"],
    },
  },
];

async function findClient(name: string, designerId: string) {
  const clients = await prisma.client.findMany({
    where: {
      designerId,
      name: { contains: name, mode: "insensitive" },
      archived: false,
    },
    select: { id: true, name: true },
    take: 10,
  });
  return { clients };
}

async function getClientActivity(
  clientId: string,
  designerId: string,
  dateFrom?: string,
  dateTo?: string
) {
  const clientRecord = await prisma.client.findFirst({
    where: { id: clientId, designerId },
    select: { id: true, name: true },
  });
  if (!clientRecord) return { error: "Klient nie znaleziony lub brak dostępu" };

  const from = dateFrom
    ? new Date(dateFrom)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const to = dateTo ? new Date(dateTo + "T23:59:59.999Z") : new Date();
  const dateFilter = { gte: from, lte: to };

  const projects = await prisma.project.findMany({
    where: { clientId, userId: designerId },
    select: { id: true, title: true },
  });
  const projectIds = projects.map((p) => p.id);

  // Resolve client contact user IDs for discussion message filtering
  const clientContacts = await prisma.projectClient.findMany({
    where: { clientId, userId: { not: null } },
    select: { userId: true },
  });
  const clientUserIds = clientContacts
    .map((c) => c.userId!)
    .filter(Boolean);

  // Queries that require projectIds
  const [clientEvents, renderComments, discussionMessages] =
    projectIds.length > 0
      ? await Promise.all([
          prisma.clientEvent.findMany({
            where: { projectId: { in: projectIds }, createdAt: dateFilter },
            orderBy: { createdAt: "desc" },
            take: 40,
          }),
          prisma.comment.findMany({
            where: {
              render: { projectId: { in: projectIds } },
              fromDesigner: false,
              createdAt: dateFilter,
            },
            select: {
              content: true,
              author: true,
              createdAt: true,
              title: true,
              render: {
                select: { name: true, project: { select: { title: true, id: true } } },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
          prisma.discussionMessage.findMany({
            where: {
              discussion: { projectId: { in: projectIds } },
              OR: [
                { clientEmail: { not: null } },
                ...(clientUserIds.length > 0
                  ? [{ userId: { in: clientUserIds } }]
                  : []),
              ],
              createdAt: dateFilter,
            },
            select: {
              content: true,
              authorName: true,
              createdAt: true,
              discussion: { select: { title: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
          }),
        ])
      : [[], [], []];

  // Queries that go directly through Client
  const [
    listChangeLogs,
    listProductComments,
    listProductReplies,
    surveyResponses,
    sharedMoodboards,
    statusChangeRequests,
    versionRestoreRequests,
  ] = await Promise.all([
      prisma.listChangeLog.findMany({
        where: {
          OR: [
            { list: { clientId } },
            ...(projectIds.length > 0
              ? [{ list: { projectId: { in: projectIds } } }]
              : []),
          ],
          createdAt: dateFilter,
        },
        select: {
          action: true,
          details: true,
          userName: true,
          source: true,
          createdAt: true,
          list: { select: { name: true, slug: true, id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.listProductComment.findMany({
        where: {
          product: {
            section: {
              list: {
                OR: [
                  { clientId },
                  ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
                ],
              },
            },
          },
          createdAt: dateFilter,
        },
        select: {
          content: true,
          author: true,
          createdAt: true,
          product: {
            select: {
              name: true,
              section: { select: { list: { select: { name: true, slug: true, id: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // Replies to product comments
      prisma.listProductReply.findMany({
        where: {
          comment: {
            product: {
              section: {
                list: {
                  OR: [
                    { clientId },
                    ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
                  ],
                },
              },
            },
          },
          createdAt: dateFilter,
        },
        select: {
          content: true,
          author: true,
          createdAt: true,
          comment: {
            select: {
              product: {
                select: {
                  name: true,
                  section: { select: { list: { select: { name: true, slug: true, id: true } } } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.surveyResponse.findMany({
        where: {
          survey: { assignedClientId: clientId, userId: designerId },
          createdAt: dateFilter,
        },
        select: {
          respondentName: true,
          respondentEmail: true,
          completedAt: true,
          createdAt: true,
          survey: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.moodboard.findMany({
        where: {
          clientId,
          userId: designerId,
          isSharedWithClient: true,
          archived: false,
        },
        select: { title: true, updatedAt: true },
      }),
      // Render status change requests (when designer doesn't allow direct status change)
      projectIds.length > 0
        ? prisma.statusChangeRequest.findMany({
            where: { projectId: { in: projectIds }, createdAt: dateFilter },
            select: {
              renderName: true,
              clientName: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      // Version restore requests by client
      projectIds.length > 0
        ? prisma.versionRestoreRequest.findMany({
            where: { projectId: { in: projectIds }, createdAt: dateFilter },
            select: {
              renderName: true,
              clientName: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

  const trunc = (s: string | null | undefined, n = 200) =>
    s ? (s.length > n ? s.slice(0, n) + "…" : s) : null;

  return {
    client: clientRecord,
    period: { from: from.toISOString(), to: to.toISOString() },
    projects: projects.map((p) => p.title),
    renderViews: (clientEvents as any[])
      .filter((e) => e.type === "render_view")
      .map((e) => ({
        clientName: e.clientName,
        renderName: (e.meta as any)?.renderName ?? null,
        link: `/projekty/${e.projectId}`,
        at: e.createdAt,
      })),
    listViews: (clientEvents as any[])
      .filter((e) => e.type === "list_view")
      .map((e) => ({
        clientName: e.clientName,
        listName: (e.meta as any)?.listName ?? null,
        link: (e.meta as any)?.listId ? `/listy-zakupowe/${(e.meta as any).listId}` : null,
        at: e.createdAt,
      })),
    moodboardViews: (clientEvents as any[])
      .filter((e) => e.type === "moodboard_view")
      .map((e) => ({
        clientName: e.clientName,
        moodboardTitle: (e.meta as any)?.moodboardTitle ?? null,
        at: e.createdAt,
      })),
    productApprovals: (clientEvents as any[])
      .filter((e) => e.type === "product_approved" || e.type === "product_rejected")
      .map((e) => ({
        decision: e.type === "product_approved" ? "zaakceptował" : "odrzucił",
        clientName: e.clientName,
        productName: (e.meta as any)?.productName ?? null,
        listName: (e.meta as any)?.listName ?? null,
        link: (e.meta as any)?.listSlug
          ? `/listy-zakupowe/${(e.meta as any).listSlug}`
          : (e.meta as any)?.listId
          ? `/listy-zakupowe/${(e.meta as any).listId}`
          : null,
        at: e.createdAt,
      })),
    renderApprovals: (clientEvents as any[])
      .filter((e) => e.type === "render_accepted" || e.type === "render_rejected")
      .map((e) => ({
        decision: e.type === "render_accepted" ? "zaakceptował render" : "odrzucił render",
        clientName: e.clientName,
        renderName: (e.meta as any)?.renderName ?? null,
        link: `/projekty/${e.projectId}`,
        at: e.createdAt,
      })),
    renderComments: (renderComments as any[]).map((c) => ({
      author: c.author,
      content: trunc(c.content),
      title: c.title,
      renderName: c.render.name,
      projectTitle: c.render.project.title,
      link: `/projekty/${c.render.project.id}`,
      at: c.createdAt,
    })),
    listChangeLogs: listChangeLogs.map((l) => ({
      action: l.action,
      details: trunc(l.details),
      userName: l.userName,
      source: l.source,
      listName: l.list.name,
      link: `/listy-zakupowe/${l.list.slug ?? l.list.id}`,
      at: l.createdAt,
    })),
    listProductComments: listProductComments.map((c) => ({
      author: c.author,
      content: trunc(c.content),
      productName: c.product.name,
      listName: c.product.section.list.name,
      link: `/listy-zakupowe/${c.product.section.list.slug ?? c.product.section.list.id}`,
      at: c.createdAt,
    })),
    listProductReplies: listProductReplies.map((r) => ({
      author: r.author,
      content: trunc(r.content),
      productName: r.comment.product.name,
      listName: r.comment.product.section.list.name,
      link: `/listy-zakupowe/${r.comment.product.section.list.slug ?? r.comment.product.section.list.id}`,
      at: r.createdAt,
    })),
    discussionMessages: (discussionMessages as any[]).map((m) => ({
      author: m.authorName,
      content: trunc(m.content),
      discussionTitle: m.discussion.title,
      at: m.createdAt,
    })),
    surveyResponses: surveyResponses.map((r) => ({
      respondentName: r.respondentName,
      surveyName: r.survey.name,
      completedAt: r.completedAt,
      startedAt: r.createdAt,
    })),
    sharedMoodboards: sharedMoodboards.map((m) => ({
      title: m.title,
      sharedSince: m.updatedAt,
    })),
    renderStatusRequests: statusChangeRequests.map((r) => ({
      renderName: r.renderName,
      clientName: r.clientName,
      requestStatus: r.status,
      at: r.createdAt,
    })),
    versionRestoreRequests: versionRestoreRequests.map((r) => ({
      renderName: r.renderName,
      clientName: r.clientName,
      requestStatus: r.status,
      at: r.createdAt,
    })),
  };
}

async function getDailySummary(designerId: string, hours = 24) {
  const from = new Date(Date.now() - hours * 60 * 60 * 1000);
  const to = new Date();
  const dateFilter = { gte: from, lte: to };

  const clients = await prisma.client.findMany({
    where: { designerId, archived: false },
    select: { id: true, name: true },
  });

  if (clients.length === 0) {
    return { period: { from: from.toISOString(), to: to.toISOString(), hours }, totalClients: 0, clientActivity: [] };
  }

  const clientIds = clients.map((c) => c.id);

  const projects = await prisma.project.findMany({
    where: { userId: designerId, clientId: { in: clientIds } },
    select: { id: true, title: true, clientId: true },
  });
  const projectIds = projects.map((p) => p.id);

  const projectToClientId: Record<string, string | null> = {};
  projects.forEach((p) => { projectToClientId[p.id] = p.clientId ?? null; });

  const clientContactIds = await prisma.projectClient.findMany({
    where: { clientId: { in: clientIds }, userId: { not: null } },
    select: { userId: true, clientId: true },
  });
  const contactUserToClientId: Record<string, string> = {};
  clientContactIds.forEach((c) => { if (c.userId) contactUserToClientId[c.userId] = c.clientId!; });

  const [clientEvents, renderComments, listChangeLogs, listProductComments, discussionMessages] =
    projectIds.length > 0
      ? await Promise.all([
          prisma.clientEvent.findMany({
            where: { projectId: { in: projectIds }, createdAt: dateFilter },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
          prisma.comment.findMany({
            where: { render: { projectId: { in: projectIds } }, fromDesigner: false, createdAt: dateFilter },
            select: { content: true, author: true, createdAt: true, render: { select: { name: true, projectId: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          prisma.listChangeLog.findMany({
            where: {
              OR: [
                { list: { clientId: { in: clientIds } } },
                { list: { projectId: { in: projectIds } } },
              ],
              source: "client",
              createdAt: dateFilter,
            },
            select: { action: true, details: true, userName: true, createdAt: true, list: { select: { name: true, slug: true, id: true, clientId: true, projectId: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          prisma.listProductComment.findMany({
            where: {
              product: { section: { list: { OR: [{ clientId: { in: clientIds } }, { projectId: { in: projectIds } }] } } },
              createdAt: dateFilter,
            },
            select: { content: true, author: true, createdAt: true, product: { select: { name: true, section: { select: { list: { select: { name: true, slug: true, id: true, clientId: true, projectId: true } } } } } } },
            orderBy: { createdAt: "desc" },
            take: 30,
          }),
          prisma.discussionMessage.findMany({
            where: {
              discussion: { projectId: { in: projectIds } },
              OR: [
                { clientEmail: { not: null } },
                ...(Object.keys(contactUserToClientId).length > 0
                  ? [{ userId: { in: Object.keys(contactUserToClientId) } }]
                  : []),
              ],
              createdAt: dateFilter,
            },
            select: { content: true, authorName: true, createdAt: true, discussion: { select: { projectId: true } } },
            orderBy: { createdAt: "desc" },
            take: 30,
          }),
        ])
      : [[], [], [], [], []];

  // Group events by clientId
  type EventEntry = { type: string; [key: string]: unknown };
  const activity: Record<string, { clientName: string; events: EventEntry[] }> = {};
  clients.forEach((c) => { activity[c.id] = { clientName: c.name, events: [] }; });

  const projectTitleMap: Record<string, string> = {};
  projects.forEach((p) => { projectTitleMap[p.id] = p.title; });

  const resolveClientId = (projectId?: string | null, listClientId?: string | null) =>
    listClientId ?? (projectId ? projectToClientId[projectId] : null);

  (clientEvents as any[]).forEach((e) => {
    const cid = projectToClientId[e.projectId];
    if (cid && activity[cid]) {
      const meta = e.meta as any;
      let link: string | null = null;
      if (e.type === "render_view" || e.type === "render_accepted" || e.type === "render_rejected") {
        link = `/projekty/${e.projectId}`;
      } else if (e.type === "list_view" && meta?.listId) {
        link = `/listy-zakupowe/${meta.listId}`;
      } else if ((e.type === "product_approved" || e.type === "product_rejected") && (meta?.listSlug || meta?.listId)) {
        link = `/listy-zakupowe/${meta.listSlug ?? meta.listId}`;
      }
      activity[cid].events.push({ type: e.type, meta: e.meta, clientName: e.clientName, projectTitle: projectTitleMap[e.projectId], link, at: e.createdAt });
    }
  });

  (renderComments as any[]).forEach((c) => {
    const cid = projectToClientId[c.render.projectId];
    if (cid && activity[cid]) {
      activity[cid].events.push({ type: "render_comment", renderName: c.render.name, author: c.author, content: c.content.slice(0, 100), projectTitle: projectTitleMap[c.render.projectId], link: `/projekty/${c.render.projectId}`, at: c.createdAt });
    }
  });

  listChangeLogs.forEach((l) => {
    const cid = resolveClientId(l.list.projectId, l.list.clientId);
    if (cid && activity[cid]) {
      activity[cid].events.push({ type: "list_change", action: l.action, details: l.details?.slice(0, 100), listName: l.list.name, link: `/listy-zakupowe/${l.list.slug ?? l.list.id}`, at: l.createdAt });
    }
  });

  listProductComments.forEach((c) => {
    const list = c.product.section.list;
    const cid = resolveClientId(list.projectId, list.clientId);
    if (cid && activity[cid]) {
      activity[cid].events.push({ type: "list_product_comment", productName: c.product.name, listName: list.name, author: c.author, content: c.content.slice(0, 100), link: `/listy-zakupowe/${list.slug ?? list.id}`, at: c.createdAt });
    }
  });

  (discussionMessages as any[]).forEach((m) => {
    const cid = m.discussion.projectId ? projectToClientId[m.discussion.projectId] : null;
    if (cid && activity[cid]) {
      activity[cid].events.push({ type: "discussion_message", author: m.authorName, content: m.content.slice(0, 100), at: m.createdAt });
    }
  });

  const activeClients = Object.values(activity)
    .filter((c) => c.events.length > 0)
    .sort((a, b) => {
      const latestA = Math.max(...a.events.map((e) => new Date(e.at as string).getTime()));
      const latestB = Math.max(...b.events.map((e) => new Date(e.at as string).getTime()));
      return latestB - latestA;
    });

  return {
    period: { from: from.toISOString(), to: to.toISOString(), hours },
    totalClients: clients.length,
    activeClientsCount: activeClients.length,
    clientActivity: activeClients,
  };
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  designerId: string
): Promise<unknown> {
  if (name === "get_daily_summary") {
    return getDailySummary(designerId, (input.hours as number | undefined) ?? 24);
  }
  if (name === "find_client") {
    return findClient(input.name as string, designerId);
  }
  if (name === "get_client_activity") {
    return getClientActivity(
      input.clientId as string,
      designerId,
      input.dateFrom as string | undefined,
      input.dateTo as string | undefined
    );
  }
  return { error: `Unknown tool: ${name}` };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiQueryCount: true, aiQueryResetAt: true, isAdmin: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.isAdmin) {
    return NextResponse.json({ remaining: 9999, limit: 9999, resetAt: null });
  }

  const now = new Date();
  const limitExpired = user.aiQueryResetAt && user.aiQueryResetAt <= now;
  const currentCount = limitExpired ? 0 : user.aiQueryCount;
  const remaining = Math.max(0, AI_DAILY_LIMIT - currentCount);
  const resetAt =
    currentCount >= AI_DAILY_LIMIT && !limitExpired
      ? user.aiQueryResetAt?.toISOString()
      : null;

  return NextResponse.json({ remaining, limit: AI_DAILY_LIMIT, resetAt });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Brak wiadomości" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiQueryCount: true, aiQueryResetAt: true, isAdmin: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const limitExpired = user.aiQueryResetAt && user.aiQueryResetAt <= now;
  const currentCount = limitExpired ? 0 : user.aiQueryCount;

  if (!user.isAdmin && currentCount >= AI_DAILY_LIMIT) {
    return NextResponse.json(
      { error: "limit", resetAt: user.aiQueryResetAt?.toISOString() },
      { status: 429 }
    );
  }

  const newCount = user.isAdmin ? currentCount : currentCount + 1;
  const newResetAt = user.isAdmin
    ? user.aiQueryResetAt
    : newCount === AI_DAILY_LIMIT
    ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
    : limitExpired
    ? null
    : user.aiQueryResetAt;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { aiQueryCount: newCount, aiQueryResetAt: newResetAt },
  });

  const SYSTEM_PROMPT = readFileSync(
    join(process.cwd(), "ASYSTENT_INSTRUKCJA_veedeck.md"),
    "utf-8"
  );

  const safeMessages: Anthropic.MessageParam[] = messages
    .slice(-10)
    .map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.content).slice(0, 2000),
    }));

  const designerId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let currentMessages: Anthropic.MessageParam[] = safeMessages;
        const MAX_ROUNDS = 4;

        for (let round = 0; round < MAX_ROUNDS; round++) {
          const contentBlocks: Anthropic.ContentBlock[] = [];
          let currentBlock: any = null;
          let blockBuffer = "";
          let stopReason = "";

          const response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: round === 0 ? 800 : 1800,
            system: SYSTEM_PROMPT,
            messages: currentMessages,
            tools: TOOLS,
            stream: true,
          });

          for await (const event of response) {
            if (event.type === "content_block_start") {
              const block = (event as any).content_block;
              if (block.type === "text") {
                currentBlock = { type: "text", text: "" };
              } else if (block.type === "tool_use") {
                currentBlock = { type: "tool_use", id: block.id, name: block.name, input: {} };
              }
              blockBuffer = "";
            } else if (event.type === "content_block_delta") {
              const delta = (event as any).delta;
              if (delta.type === "text_delta" && currentBlock?.type === "text") {
                currentBlock.text += delta.text;
                controller.enqueue(encoder.encode(delta.text));
              } else if (delta.type === "input_json_delta") {
                blockBuffer += delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (currentBlock) {
                if (currentBlock.type === "tool_use") {
                  try {
                    currentBlock.input = JSON.parse(blockBuffer || "{}");
                  } catch {
                    currentBlock.input = {};
                  }
                }
                contentBlocks.push(currentBlock);
                currentBlock = null;
                blockBuffer = "";
              }
            } else if (event.type === "message_delta") {
              stopReason = (event as any).delta.stop_reason ?? "";
            }
          }

          if (stopReason !== "tool_use") break;

          const toolUseBlocks = contentBlocks.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );
          if (toolUseBlocks.length === 0) break;

          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (tool) => ({
              type: "tool_result" as const,
              tool_use_id: tool.id,
              content: JSON.stringify(
                await executeTool(tool.name, tool.input as Record<string, unknown>, designerId)
              ),
            }))
          );

          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: contentBlocks },
            { role: "user" as const, content: toolResults },
          ];
        }
      } catch (err) {
        console.error("[ai-assistant] error:", err);
        controller.enqueue(
          encoder.encode("Przepraszam, wystąpił błąd. Spróbuj ponownie.")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
