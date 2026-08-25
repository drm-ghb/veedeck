import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { createAccessToken } from "@/lib/access-token";
import { notifyClientMoodboardShared } from "@/lib/email";
import { pusherServer } from "@/lib/pusher";
import { logActivity } from "@/lib/activity-log";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

type MainContact = { id: string; email: string | null; name: string; userId: string | null; phone?: string | null };

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

async function resolveClientEntityShare(
  clientId: string,
  displayTitle: string,
  moodboard: { id: string; projectId: string | null },
  designerId: string,
): Promise<{ mainContact: MainContact; displayTitle: string; moodboardUrl: string; effectiveClientId: string } | null> {
  const mainContact = await prisma.projectClient.findFirst({
    where: { clientId, isMainContact: true, email: { not: null } },
    select: { id: true, email: true, name: true, userId: true, phone: true },
  });
  if (!mainContact?.email) return null;

  let targetUserId = mainContact.userId;
  if (!targetUserId) {
    targetUserId = await createAccountForSharing({
      contactId: mainContact.id,
      contactName: mainContact.name,
      contactPhone: mainContact.phone ?? null,
      email: mainContact.email,
      designerId,
      clientId,
      clientName: displayTitle,
    });
  }

  // Find portal project for this client to build the moodboard URL
  const portalProject = moodboard.projectId
    ? { id: moodboard.projectId }
    : await prisma.project.findFirst({ where: { clientId }, select: { id: true } });

  const rawToken = await createAccessToken(targetUserId);
  const moodboardUrl = portalProject
    ? `${APP_URL}/p/${encodeURIComponent(rawToken)}?moodboardProjectId=${portalProject.id}`
    : `${APP_URL}/p/${encodeURIComponent(rawToken)}`;

  return { mainContact, displayTitle, moodboardUrl, effectiveClientId: clientId };
}

async function resolveShareTarget(
  moodboard: { id: string; projectId: string | null; clientId: string | null },
  designerId: string,
): Promise<{ mainContact: MainContact; displayTitle: string; moodboardUrl: string; effectiveClientId: string } | null> {
  if (moodboard.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: moodboard.projectId },
      select: { title: true, clientId: true },
    });
    if (!project) return null;

    const viaProject = await prisma.projectClient.findFirst({
      where: { projectId: moodboard.projectId, isMainContact: true, email: { not: null } },
      select: { id: true, email: true, name: true, userId: true, phone: true },
    });
    if (viaProject?.email) {
      let targetUserId = viaProject.userId;
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
        }
      }
      const rawToken = await createAccessToken(targetUserId);
      const moodboardUrl = `${APP_URL}/p/${encodeURIComponent(rawToken)}?moodboardProjectId=${moodboard.projectId}`;
      const effectiveClientId = project.clientId ?? "";
      return { mainContact: viaProject, displayTitle: project.title, moodboardUrl, effectiveClientId };
    }

    // Portal project — contacts live on the Client entity
    if (!project.clientId) return null;
    return resolveClientEntityShare(project.clientId, project.title, moodboard, designerId);
  }

  if (moodboard.clientId) {
    const client = await prisma.client.findUnique({ where: { id: moodboard.clientId }, select: { name: true } });
    if (!client) return null;
    return resolveClientEntityShare(moodboard.clientId, client.name, moodboard, designerId);
  }

  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const moodboard = await prisma.moodboard.findFirst({
    where: { id, userId },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
  });

  if (!moodboard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(moodboard);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const moodboard = await prisma.moodboard.findFirst({ where: { id, userId } });
  if (!moodboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.canvasData !== undefined) data.canvasData = body.canvasData;
  if (body.isSharedWithClient !== undefined) data.isSharedWithClient = body.isSharedWithClient;
  if (body.archived !== undefined) data.archived = body.archived;
  if (body.pinned !== undefined) data.pinned = body.pinned;
  if (body.clientId !== undefined) data.clientId = body.clientId || null;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;

  const updated = await prisma.moodboard.update({ where: { id }, data });

  // 3. Log: share link activation (moodboard)
  if (body.isSharedWithClient === true && !moodboard.isSharedWithClient) {
    logActivity({ level: "info", action: "share.create", message: `Udostępniono moodboard klientowi: ${moodboard.title}`, userId, meta: { moodboardId: id, title: moodboard.title, type: "moodboard" } });
  }

  // Send email when sharing with client (false → true transition)
  if (body.isSharedWithClient === true && !moodboard.isSharedWithClient) {
    try {
      const target = await resolveShareTarget(moodboard, userId);
      if (target) {
        const designer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, fullName: true } });
        const designerName = designer?.fullName || designer?.name || "Projektant";

        // Extra contacts with emailNotifications enabled
        const extraContacts = target.effectiveClientId
          ? await prisma.projectClient.findMany({
              where: {
                clientId: target.effectiveClientId,
                emailNotifications: true,
                userId: { not: null },
                email: { not: null },
                id: { not: target.mainContact.id },
              },
              select: { id: true, name: true, email: true, userId: true },
            })
          : [];

        // Resolve the projectId for in-app notification links
        const notifProjectId = moodboard.projectId
          ?? (await prisma.project.findFirst({ where: { clientId: target.effectiveClientId }, select: { id: true } }))?.id;

        const notifMessage = `${designerName} udostępnił(a) Ci tablicę „${moodboard.title}" w Moodboardy`;
        const notifLink = notifProjectId ? `/client/${notifProjectId}/moodboard` : `/client`;

        // In-app notifications for all contacts with userId
        const contactsToNotify = [
          ...(target.mainContact.userId ? [target.mainContact.userId] : []),
          ...extraContacts.filter(c => c.userId).map(c => c.userId!),
        ];
        for (const contactUserId of contactsToNotify) {
          const notif = await prisma.notification.create({
            data: { userId: contactUserId, message: notifMessage, link: notifLink, type: "info" },
          });
          await pusherServer.trigger(`user-${contactUserId}`, "new-notification", {
            ...notif,
            createdAt: notif.createdAt.toISOString(),
          }).catch(() => {});
        }

        (async () => {
          await notifyClientMoodboardShared({
            clientEmail: target.mainContact.email!,
            clientName: target.mainContact.name,
            moodboardName: moodboard.title,
            designerName,
            projectTitle: target.displayTitle,
            moodboardUrl: target.moodboardUrl,
          }).catch((err) => console.error("[PATCH /api/moodboards] share email (main) error:", err));

          for (const c of extraContacts) {
            const rawToken = await createAccessToken(c.userId!);
            const portalProject = moodboard.projectId
              ? { id: moodboard.projectId }
              : await prisma.project.findFirst({ where: { clientId: target.effectiveClientId }, select: { id: true } });
            const link = portalProject
              ? `${APP_URL}/p/${encodeURIComponent(rawToken)}?moodboardProjectId=${portalProject.id}`
              : `${APP_URL}/p/${encodeURIComponent(rawToken)}`;
            await notifyClientMoodboardShared({
              clientEmail: c.email!,
              clientName: c.name,
              moodboardName: moodboard.title,
              designerName,
              projectTitle: target.displayTitle,
              moodboardUrl: link,
            }).catch((err) => console.error("[PATCH /api/moodboards] share email (extra) error:", err));
          }
        })();
      }
    } catch (err) {
      console.error("[PATCH /api/moodboards] share setup error:", err);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const moodboard = await prisma.moodboard.findFirst({ where: { id, userId } });
  if (!moodboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.moodboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
