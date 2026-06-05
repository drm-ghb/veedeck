import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// Returns clients with projects + designer info — used by AssignProjectDialog
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);

  const [designer, clients] = await Promise.all([
    prisma.user.findUnique({
      where: { id: designerId },
      select: { fullName: true, name: true, phone: true },
    }),
    prisma.client.findMany({
      where: { designerId, archived: false },
      select: {
        id: true,
        name: true,
        addressStreet: true,
        addressCity: true,
        addressPostalCode: true,
        addressCountry: true,
        contacts: {
          where: { isMainContact: true },
          select: { name: true, phone: true },
          take: 1,
        },
        projects: {
          where: { archived: false },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    designer: {
      name: designer?.fullName || designer?.name || null,
      phone: designer?.phone || null,
    },
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      addressStreet: c.addressStreet,
      addressCity: c.addressCity,
      addressPostalCode: c.addressPostalCode,
      addressCountry: c.addressCountry,
      mainContact: c.contacts[0] ?? null,
      projects: c.projects,
    })),
  });
}
