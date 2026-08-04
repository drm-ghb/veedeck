import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";
import { checkTeamPermission, hasPermission } from "@/lib/permissions";
import { notifyClientListShared } from "@/lib/email";
import { createAccessToken } from "@/lib/access-token";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

async function getOwnedList(id: string, userId: string) {
  return prisma.shoppingList.findFirst({ where: { id, userId } });
}

type MainContact = { id: string; email: string | null; name: string; userId: string | null };

/** Create a User(role:"client") account for a contact that doesn't have one yet, so a magic link can be issued. */
async function createAccountForSharing(params: {
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  email: string;
  designerId: string;
  clientId: string;
  clientName: string;
}): Promise<string> {
  const emailLogin = params.email.trim().toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: emailLogin }, { login: emailLogin }] },
  });

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const randomPassword = crypto.randomBytes(12).toString("base64url");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    const created = await prisma.user.create({
      data: {
        name: params.contactName,
        email: emailLogin,
        login: emailLogin,
        password: hashedPassword,
        role: "client",
        phone: params.contactPhone,
        contactEmail: emailLogin,
      },
    });
    userId = created.id;
  }

  await prisma.projectClient.update({
    where: { id: params.contactId },
    data: { userId, email: emailLogin },
  });

  // The client panel resolves itself via a Project — create a host project if none exists yet.
  const existingProject = await prisma.project.findFirst({
    where: { clientId: params.clientId },
    select: { id: true },
  });
  if (!existingProject) {
    await prisma.project.create({
      data: { title: params.clientName, userId: params.designerId, clientId: params.clientId, isPortalProject: true },
    });
  }

  return userId;
}

/**
 * Resolve who to notify and what link to send when a list is shared.
 * Two contact-resolution paths:
 *  - legacy ProjectFlow project: contact is a ProjectClient row keyed by projectId → bare /client/{id} link
 *    (client already goes through the existing password/session flow; untouched behavior)
 *  - Client-entity list (direct clientId, or a client-portal project auto-created at account setup):
 *    contact is a ProjectClient row keyed by clientId → magic-link token, auto-creating the account if missing
 */
async function resolveShareTarget(
  list: { id: string; name: string; projectId: string | null; clientId: string | null; shareToken: string },
  designerId: string,
): Promise<{ mainContact: MainContact; displayTitle: string; listUrl: string; accountCreated: boolean } | null> {
  if (list.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: list.projectId },
      select: { title: true, clientId: true },
    });
    if (!project) return null;

    const viaProject = await prisma.projectClient.findFirst({
      where: { projectId: list.projectId, isMainContact: true, email: { not: null } },
      select: { id: true, email: true, name: true, userId: true, phone: true },
    });
    if (viaProject?.email) {
      let targetUserId = viaProject.userId;
      let accountCreated = false;
      if (!targetUserId) {
        const emailLogin = viaProject.email.trim().toLowerCase();
        const existingUser = await prisma.user.findFirst({
          where: { OR: [{ email: emailLogin }, { login: emailLogin }] },
        });
        if (existingUser) {
          targetUserId = existingUser.id;
          await prisma.projectClient.update({ where: { id: viaProject.id }, data: { userId: targetUserId } });
        } else {
          const randomPassword = crypto.randomBytes(12).toString("base64url");
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          const created = await prisma.user.create({
            data: {
              name: viaProject.name,
              email: emailLogin,
              login: emailLogin,
              password: hashedPassword,
              role: "client",
              phone: viaProject.phone ?? null,
              contactEmail: emailLogin,
            },
          });
          await prisma.projectClient.update({ where: { id: viaProject.id }, data: { userId: created.id } });
          targetUserId = created.id;
          accountCreated = true;
        }
      }
      const rawToken = await createAccessToken(targetUserId);
      return {
        mainContact: viaProject,
        displayTitle: project.title,
        listUrl: `${APP_URL}/p/${encodeURIComponent(rawToken)}?listId=${list.id}`,
        accountCreated,
      };
    }

    // Client-portal project (auto-created at account setup) — contacts live on the Client entity, not on this project.
    if (!project.clientId) return null;
    return resolveClientEntityShare(project.clientId, project.title, list, designerId);
  }

  if (list.clientId) {
    const client = await prisma.client.findUnique({ where: { id: list.clientId }, select: { name: true } });
    if (!client) return null;
    return resolveClientEntityShare(list.clientId, client.name, list, designerId);
  }

  return null;
}

async function resolveClientEntityShare(
  clientId: string,
  displayTitle: string,
  list: { id: string; name: string; shareToken: string },
  designerId: string,
): Promise<{ mainContact: MainContact; displayTitle: string; listUrl: string; accountCreated: boolean } | null> {
  const mainContact = await prisma.projectClient.findFirst({
    where: { clientId, isMainContact: true, email: { not: null } },
    select: { id: true, email: true, name: true, userId: true, phone: true },
  });
  if (!mainContact?.email) return null;

  let targetUserId = mainContact.userId;
  let accountCreated = false;
  if (!targetUserId) {
    targetUserId = await createAccountForSharing({
      contactId: mainContact.id,
      contactName: mainContact.name,
      contactPhone: mainContact.phone,
      email: mainContact.email,
      designerId,
      clientId,
      clientName: displayTitle,
    });
    accountCreated = true;
  }

  const rawToken = await createAccessToken(targetUserId);
  return {
    mainContact,
    displayTitle,
    listUrl: `${APP_URL}/p/${encodeURIComponent(rawToken)}?listId=${list.id}`,
    accountCreated,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const list = await prisma.shoppingList.findFirst({
    where: { id, userId },
    select: { id: true, name: true, shareToken: true, projectId: true, clientId: true },
  });
  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const target = await resolveShareTarget(list, userId);
  if (!target) return NextResponse.json({ error: "Brak klienta przypisanego do listy" }, { status: 404 });

  return NextResponse.json({ url: target.listUrl });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await hasPermission(session, "listy", 2)) return NextResponse.json({ error: "Brak uprawnień do edycji listy" }, { status: 403 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const list = await getOwnedList(id, userId);
  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    data.name = body.name.trim();
    data.slug = await uniqueSlug(body.name.trim(), (s) =>
      prisma.shoppingList.findFirst({ where: { slug: s, id: { not: id } } }).then(Boolean)
    );
  }
  if (body.archived !== undefined) data.archived = body.archived;
  if (body.pinned !== undefined) data.pinned = body.pinned;
  if (body.projectId !== undefined) data.projectId = body.projectId ?? null;
  if (body.clientId !== undefined) data.clientId = body.clientId ?? null;
  if (body.budget !== undefined) data.budget = body.budget !== null ? parseFloat(body.budget) : null;
  if (body.hidePrices !== undefined) data.hidePrices = Boolean(body.hidePrices);
  if (body.isSharedWithClient !== undefined) data.isSharedWithClient = Boolean(body.isSharedWithClient);

  const updated = await prisma.shoppingList.update({ where: { id }, data });

  // Send email when sharing with client (false → true transition)
  let accountCreated = false;
  if (body.isSharedWithClient === true && !list.isSharedWithClient) {
    try {
      const target = await resolveShareTarget(updated, userId);
      if (target) {
        accountCreated = target.accountCreated;
        const designer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, fullName: true } });
        const designerName = designer?.fullName || designer?.name || "Projektant";

        // Resolve effectiveClientId for multi-contact notification lookup
        let effectiveClientId: string | null = updated.clientId ?? null;
        if (!effectiveClientId && updated.projectId) {
          const proj = await prisma.project.findUnique({ where: { id: updated.projectId }, select: { clientId: true } });
          effectiveClientId = proj?.clientId ?? null;
        }

        // Find all other contacts with emailNotifications enabled
        const extraContacts = effectiveClientId
          ? await prisma.projectClient.findMany({
              where: {
                clientId: effectiveClientId,
                emailNotifications: true,
                userId: { not: null },
                email: { not: null },
                id: { not: target.mainContact.id },
              },
              select: { id: true, name: true, email: true, userId: true },
            })
          : [];

        // Fire-and-forget — account/token setup above is already done, response doesn't need to wait on SMTP.
        (async () => {
          await notifyClientListShared({
            clientEmail: target.mainContact.email!,
            clientName: target.mainContact.name,
            listName: list.name,
            designerName,
            projectTitle: target.displayTitle,
            listUrl: target.listUrl,
          }).catch((err) => console.error("[PATCH /api/lists] share email (main) error:", err));

          for (const c of extraContacts) {
            const rawToken = await createAccessToken(c.userId!);
            const link = `${APP_URL}/p/${encodeURIComponent(rawToken)}?listId=${updated.id}`;
            await notifyClientListShared({
              clientEmail: c.email!,
              clientName: c.name,
              listName: list.name,
              designerName,
              projectTitle: target.displayTitle,
              listUrl: link,
            }).catch((err) => console.error("[PATCH /api/lists] share email (extra) error:", err));
          }
        })();
      }
    } catch (err) {
      console.error("[PATCH /api/lists] share setup error:", err);
    }
  }

  return NextResponse.json({ ...updated, accountCreated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkTeamPermission(session, "listCanDelete")) {
    return NextResponse.json({ error: "Brak uprawnień do usuwania list" }, { status: 403 });
  }
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const list = await getOwnedList(id, userId);
  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.shoppingList.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
