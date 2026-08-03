import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import ClientDetailView from "@/components/projekty/ClientDetailView";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const designerId = getWorkspaceUserId(session as any);
  const { id } = await params;

  const [userSettings, client] = await Promise.all([
    prisma.user.findUnique({ where: { id: designerId }, select: { defaultCurrency: true } }),
    prisma.client.findFirst({
    where: { id, designerId },
    select: {
      id: true,
      name: true,
      description: true,
      accentColor: true,
      startDate: true,
      endDate: true,
      addressStreet: true,
      addressCity: true,
      addressPostalCode: true,
      addressCountry: true,
      hiddenModules: true,
      clientCanUpload: true,
      createdAt: true,
      contacts: {
        orderBy: [{ isMainContact: "desc" }, { order: "asc" }, { createdAt: "asc" }],
        include: {
          user: { select: { id: true, login: true, email: true, firstLoginAt: true } },
          project: { select: { scheduleSharedWithClient: true } },
        },
      },
    },
  }),
  ]);

  if (!client) notFound();

  // Fetch last login date for each contact's user account
  const userIds = client.contacts.filter((c) => c.userId).map((c) => c.userId!);
  const lastLogins = userIds.length > 0
    ? await prisma.loginLog.findMany({
        where: { userId: { in: userIds }, success: true },
        orderBy: { createdAt: "desc" },
        distinct: ["userId"],
        select: { userId: true, createdAt: true },
      })
    : [];
  const lastLoginMap = new Map(lastLogins.map((l) => [l.userId!, l.createdAt.toISOString()]));

  const serialized = {
    id: client.id,
    name: client.name,
    description: client.description ?? null,
    accentColor: client.accentColor ?? null,
    startDate: client.startDate ? client.startDate.toISOString() : null,
    endDate: client.endDate ? client.endDate.toISOString() : null,
    addressStreet: client.addressStreet ?? null,
    addressCity: client.addressCity ?? null,
    addressPostalCode: client.addressPostalCode ?? null,
    addressCountry: client.addressCountry ?? null,
    hiddenModules: client.hiddenModules,
    clientCanUpload: client.clientCanUpload,
    createdAt: client.createdAt.toISOString(),
    contacts: client.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? null,
      description: (c as { description?: string | null }).description ?? null,
      isMainContact: c.isMainContact,
      isDecisionMaker: c.isDecisionMaker,
      createdAt: c.createdAt.toISOString(),
      userId: c.userId ?? null,
      projectId: c.projectId,
      scheduleSharedWithClient: c.project?.scheduleSharedWithClient ?? false,
      lastLoginAt: c.userId ? (lastLoginMap.get(c.userId) ?? null) : null,
      user: c.user
        ? { id: c.user.id, login: c.user.login ?? "", email: c.user.email ?? null, firstLoginAt: c.user.firstLoginAt?.toISOString() ?? null }
        : null,
    })),
  };

  return <ClientDetailView client={serialized} defaultCurrency={userSettings?.defaultCurrency ?? "PLN"} />;
}
