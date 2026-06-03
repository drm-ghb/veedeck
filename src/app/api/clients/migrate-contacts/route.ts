import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// POST /api/clients/migrate-contacts
// Pass 1 migration: populates ProjectClient.clientId from ProjectClient.projectId → project.clientId
// Run after "prisma db push" that adds the clientId column (nullable).
// After this runs, do a second "prisma db push" to drop projectId and make clientId required.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  // Find all ProjectClient records owned by this designer that still have no clientId
  const contacts = await prisma.projectClient.findMany({
    where: {
      clientId: null,
      project: { userId },
    },
    select: { id: true, project: { select: { id: true, clientId: true, clientName: true } } },
  });

  let migrated = 0;
  let skipped = 0;
  let clientsCreated = 0;

  for (const contact of contacts) {
    const project = contact.project;
    if (!project) { skipped++; continue; }

    let clientEntityId = project.clientId;

    if (!clientEntityId) {
      const name = project.clientName?.trim();
      if (!name) { skipped++; continue; }

      let client = await prisma.client.findFirst({
        where: { designerId: userId, name },
      });
      if (!client) {
        client = await prisma.client.create({
          data: { designerId: userId, name },
        });
        clientsCreated++;
      }
      clientEntityId = client.id;

      await prisma.project.update({
        where: { id: project.id },
        data: { clientId: clientEntityId },
      });
    }

    await prisma.projectClient.update({
      where: { id: contact.id },
      data: { clientId: clientEntityId },
    });
    migrated++;
  }

  return NextResponse.json({ migrated, skipped, clientsCreated });
}
