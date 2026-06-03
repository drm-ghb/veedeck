import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjectDetailView from "@/components/projekty/ProjectDetailView";

export default async function KlientDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;

  const project = await prisma.project.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ slug }, { id: slug }],
    },
    include: {
      clients: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, login: true } } },
      },
      renders: { where: { archived: false }, select: { id: true }, take: 1 },
      shoppingLists: { where: { archived: false }, select: { id: true }, take: 1 },
    },
  });

  if (!project) notFound();

  // Redirect to client-based URL for clean naming
  if (project.clientId) {
    redirect(`/klienci/klient/${project.clientId}`);
  }

  // Fetch client entity name + other projects
  const clientEntity = project.clientId
    ? await prisma.client.findUnique({
        where: { id: project.clientId },
        select: {
          name: true,
          projects: {
            where: { archived: false, NOT: { id: project.id } },
            select: { id: true, title: true, slug: true },
            orderBy: { createdAt: "desc" },
          },
        },
      })
    : null;

  const clientProjects = clientEntity?.projects ?? [];

  // When project has a Client entity, fetch all shared contacts from that entity
  const sharedContacts = project.clientId
    ? await prisma.projectClient.findMany({
        where: { clientId: project.clientId },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, login: true } } },
      })
    : null;

  const contacts = sharedContacts ?? project.clients;

  const serialized = {
    id: project.id,
    slug: project.slug,
    title: project.title,
    description: project.description,
    shareToken: project.shareToken,
    sharePassword: project.sharePassword,
    shareExpiresAt: project.shareExpiresAt ? project.shareExpiresAt.toISOString() : null,
    createdAt: project.createdAt.toISOString(),
    hiddenModules: project.hiddenModules,
    clientCanUpload: project.clientCanUpload,
    addressCountry: project.addressCountry ?? null,
    addressCity: project.addressCity ?? null,
    addressPostalCode: project.addressPostalCode ?? null,
    addressStreet: project.addressStreet ?? null,
    hasRenders: project.renders.length > 0,
    hasLists: project.shoppingLists.length > 0,
    startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : null,
    endDate: project.endDate ? project.endDate.toISOString().slice(0, 10) : null,
    paymentsSharedWithClient: project.paymentsSharedWithClient,
    scheduleSharedWithClient: project.scheduleSharedWithClient,
    clientId: project.clientId ?? null,
    clientEntityId: clientEntity ? project.clientId : null,
    clientName: clientEntity?.name ?? project.clientName ?? null,
    clientProjects: clientProjects.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
    clients: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? null,
      isMainContact: c.isMainContact,
      createdAt: c.createdAt.toISOString(),
      startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
      endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
      userId: c.userId ?? null,
      user: c.user ? { id: c.user.id, login: c.user.login ?? "" } : null,
    })),
  };

  return <ProjectDetailView project={serialized} />;
}
