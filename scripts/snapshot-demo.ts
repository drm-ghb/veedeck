/**
 * scripts/snapshot-demo.ts
 *
 * Exports the current state of the demo account (d.rychlik@veedeck.com) to
 * src/lib/demo-snapshot.json so that the next reset restores this exact state.
 *
 * Usage:
 *   npx tsx scripts/snapshot-demo.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool as never);
const prisma = new PrismaClient({ adapter } as never);
const DEMO_EMAIL = "d.rychlik@veedeck.com";

const DEMO_HELPER_EMAILS = [
  "anna.kowalska@demo.veedeck.com",
  "piotr.wisniewski@demo.veedeck.com",
  "marta.zielinska@demo.veedeck.com",
  "katarzyna.nowak@demo.veedeck.com",
  "tomasz.nowak@demo.veedeck.com",
  "jan.kowalski.klient@demo.veedeck.com",
  "agnieszka.kowalska@demo.veedeck.com",
  "anna.grabowska@demo.veedeck.com",
  "rafal.grabowski@demo.veedeck.com",
  "hydraulik@demo.veedeck.com",
  "elektryk@demo.veedeck.com",
  "malarz@demo.veedeck.com",
];

async function main() {
  const demoUser = await prisma.user.findFirst({
    where: { email: DEMO_EMAIL },
    select: {
      id: true, name: true, fullName: true, email: true, phone: true,
      avatarUrl: true,
    },
  });

  if (!demoUser) throw new Error(`Demo user not found: ${DEMO_EMAIL}`);
  const userId = demoUser.id;

  console.log(`Snapshotting account: ${DEMO_EMAIL} (id=${userId})`);

  // ─── TEAM MEMBERS ──────────────────────────────────────────────────────────
  const teamMembers = await prisma.user.findMany({
    where: { ownerId: userId },
    select: { id: true, email: true, name: true, fullName: true, role: true, phone: true, avatarUrl: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  teamMembers: ${teamMembers.length}`);

  // ─── PERMISSION GROUPS ─────────────────────────────────────────────────────
  const permissionGroups = await prisma.permissionGroup.findMany({
    where: { workspaceId: userId },
    include: {
      members: { select: { userId: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  permissionGroups: ${permissionGroups.length}`);

  // ─── CLIENTS ───────────────────────────────────────────────────────────────
  const clients = await prisma.client.findMany({
    where: { designerId: userId },
    select: { id: true, name: true, description: true, archived: true, addressStreet: true, addressCity: true, addressPostalCode: true, addressCountry: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  clients: ${clients.length}`);

  // ─── PROJECTS ──────────────────────────────────────────────────────────────
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      rooms: {
        include: {
          renders: {
            select: { id: true, name: true, fileUrl: true, fileKey: true, fileType: true, status: true, pinned: true, order: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      clients: {
        select: { name: true, email: true, phone: true, isMainContact: true, userId: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  projects: ${projects.length}`);

  // ─── SHOPPING LISTS ────────────────────────────────────────────────────────
  const shoppingLists = await prisma.shoppingList.findMany({
    where: { userId },
    include: {
      sections: {
        include: {
          products: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  shoppingLists: ${shoppingLists.length}`);

  // ─── CONTRACTORS ───────────────────────────────────────────────────────────
  const contractors = await prisma.contractor.findMany({
    where: { designerId: userId },
    include: {
      assignments: {
        include: {
          folders: {
            include: {
              files: { select: { name: true, fileUrl: true, fileKey: true, fileType: true, renderId: true, uploadedById: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  contractors: ${contractors.length}`);

  // ─── TASKS ─────────────────────────────────────────────────────────────────
  const tasks = await prisma.task.findMany({
    where: { ownerId: userId, parentId: null },
    include: {
      subTasks: {
        select: { title: true, description: true, status: true, priority: true, dueDate: true, assignee: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
      },
      project: { select: { title: true } },
      assignee: { select: { email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  tasks: ${tasks.length}`);

  // ─── CALENDAR EVENTS ───────────────────────────────────────────────────────
  const calendarEvents = await prisma.calendarEvent.findMany({
    where: { userId },
    select: { title: true, description: true, startAt: true, endAt: true, type: true, location: true },
    orderBy: { startAt: "asc" },
  });
  console.log(`  calendarEvents: ${calendarEvents.length}`);

  // ─── NOTES ─────────────────────────────────────────────────────────────────
  const notes = await prisma.note.findMany({
    where: { userId },
    select: { title: true, content: true, archived: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  notes: ${notes.length}`);

  // ─── PRODUCTS (katalog) ────────────────────────────────────────────────────
  const products = await prisma.product.findMany({
    where: { userId },
    select: { name: true, manufacturer: true, category: true, url: true, imageUrl: true, price: true, description: true, supplier: true, dimensions: true, catalogNumber: true, deliveryTime: true, favorite: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  products: ${products.length}`);

  // ─── SURVEYS ───────────────────────────────────────────────────────────────
  const surveys = await prisma.survey.findMany({
    where: { userId },
    include: {
      sections: {
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  surveys: ${surveys.length}`);

  // ─── TASK STATUSES ─────────────────────────────────────────────────────────
  const taskStatuses = await prisma.taskStatusConfig.findMany({
    where: { ownerId: userId },
    select: { value: true, label: true, color: true, order: true },
    orderBy: { order: "asc" },
  });
  console.log(`  taskStatuses: ${taskStatuses.length}`);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    demoEmail: DEMO_EMAIL,
    helperEmails: DEMO_HELPER_EMAILS,
    teamMembers,
    permissionGroups: permissionGroups.map((g) => ({
      id: g.id,
      name: g.name,
      isTemplate: g.isTemplate,
      templateKey: g.templateKey,
      projectScope: g.projectScope,
      permissions: g.permissions,
      memberEmails: g.members
        .map((m) => teamMembers.find((t) => t.id === m.userId)?.email)
        .filter(Boolean),
    })),
    clients,
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      clientName: p.clientName,
      clientEmail: p.clientEmail,
      description: p.description,
      archived: p.archived,
      pinned: p.pinned,
      clientId: p.clientId,
      rooms: p.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        order: r.order,
        renders: r.renders.map((rn) => ({
          id: rn.id,
          name: rn.name,
          fileUrl: rn.fileUrl,
          fileKey: rn.fileKey,
          fileType: rn.fileType,
          status: rn.status,
          pinned: rn.pinned,
          order: rn.order,
        })),
      })),
      projectClients: p.clients.map((c) => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        isMainContact: c.isMainContact,
        userEmail: c.userId
          ? teamMembers.find((m) => m.id === c.userId)?.email ?? null
          : null,
      })),
    })),
    shoppingLists: shoppingLists.map((l) => ({
      id: l.id,
      title: l.title,
      currency: l.currency,
      archived: l.archived,
      clientName: l.clientName,
      clientEmail: l.clientEmail,
      projectId: l.projectId,
      sections: l.sections.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        products: s.products.map((pr) => ({
          id: pr.id,
          name: pr.name,
          manufacturer: pr.manufacturer,
          supplier: pr.supplier,
          color: pr.color,
          dimensions: pr.dimensions,
          link: pr.link,
          imageUrl: pr.imageUrl,
          price: pr.price ? Number(pr.price) : null,
          quantity: pr.quantity,
          unit: pr.unit,
          status: pr.status,
          isOptional: pr.isOptional,
          notes: pr.notes,
          order: pr.order,
        })),
      })),
    })),
    contractors: contractors.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      trade: c.trade,
      email: c.email,
      phone: c.phone,
      notes: c.notes,
      userEmail: c.userId
        ? DEMO_HELPER_EMAILS.find((e) => e.startsWith(c.trade?.toLowerCase()?.split(" ")[0] ?? "")) ?? null
        : null,
      assignments: c.assignments.map((a) => ({
        id: a.id,
        projectId: a.projectId,
        title: a.title,
        archived: a.archived,
        folders: a.folders.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          parentId: f.parentId,
          visible: f.visible,
          files: f.files.map((fi) => ({
            id: fi.id,
            name: fi.name,
            fileUrl: fi.fileUrl,
            fileType: fi.fileType,
            fileSize: fi.fileSize,
            visible: fi.visible,
          })),
        })),
      })),
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      projectTitle: t.project?.title ?? null,
      assigneeEmail: t.assignee?.email ?? null,
      subTasks: t.subTasks.map((s) => ({
        title: s.title,
        description: s.description,
        status: s.status,
        priority: s.priority,
        dueDate: s.dueDate,
      })),
    })),
    calendarEvents: calendarEvents.map((e) => ({
      title: e.title,
      description: e.description,
      startAt: e.startAt,
      endAt: e.endAt,
      type: e.type,
      color: e.color,
      allDay: e.allDay,
      projectTitle: null as string | null, // resolved below
    })),
    notes: notes.map((n) => ({
      title: n.title,
      content: n.content,
      pinned: n.pinned,
      projectTitle: null as string | null, // resolved below
    })),
    products,
    surveys: surveys.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      archived: s.archived,
      sections: s.sections.map((sec) => ({
        title: sec.title,
        description: sec.description,
        order: sec.order,
        questions: sec.questions.map((q) => ({
          text: q.text,
          type: q.type,
          required: q.required,
          options: q.options,
          order: q.order,
        })),
      })),
    })),
    taskStatuses,
  };

  // Resolve projectTitle for calendarEvents and notes
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p.title]));
  snapshot.calendarEvents = calendarEvents.map((e) => ({
    ...e,
    startAt: e.startAt as unknown as Date,
    endAt: e.endAt as unknown as Date,
    projectTitle: e.projectId ? (projectById[e.projectId] ?? null) : null,
  }));
  snapshot.notes = notes.map((n) => ({
    ...n,
    projectTitle: n.projectId ? (projectById[n.projectId] ?? null) : null,
  }));

  const outPath = path.join(process.cwd(), "src/lib/demo-snapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(`\nSnapshot saved to: ${outPath}`);
  console.log("Run 'git add src/lib/demo-snapshot.json && git commit' to persist the snapshot.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
