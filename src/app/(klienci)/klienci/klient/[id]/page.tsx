import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import ProjectDetailView from "@/components/projekty/ProjectDetailView";
import ClientDetailView from "@/components/projekty/ClientDetailView";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const designerId = getWorkspaceUserId(session as any);
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, designerId },
    select: {
      id: true,
      name: true,
      projects: {
        where: { archived: false },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, slug: true },
      },
    },
  });

  if (!client) notFound();

  // If no projects, show simple no-project view
  const firstProject = client.projects[0];
  if (!firstProject) {
    return (
      <ClientDetailView
        client={{ id: client.id, name: client.name, createdAt: new Date().toISOString(), projects: [] }}
      />
    );
  }

  // Fetch full project data for ProjectDetailView
  const project = await prisma.project.findFirst({
    where: { id: firstProject.id, userId: session.user.id },
    include: {
      renders: { where: { archived: false }, select: { id: true }, take: 1 },
      shoppingLists: { where: { archived: false }, select: { id: true }, take: 1 },
    },
  });

  if (!project) notFound();

  const sharedContacts = await prisma.projectClient.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, login: true } } },
  });

  const clientProjects = client.projects
    .filter((p) => p.id !== firstProject.id)
    .map((p) => ({ id: p.id, title: p.title, slug: p.slug }));

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
    clientName: client.name,
    clientEntityId: client.id,
    clientProjects,
    clients: sharedContacts.map((c) => ({
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
