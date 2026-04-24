import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjectDetailView from "@/components/projekty/ProjectDetailView";

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;

  // Look up by slug first, fall back to id for backward compatibility
  const project = await prisma.project.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ slug }, { id: slug }],
    },
    include: {
      clients: { orderBy: { createdAt: "asc" } },
      renders: { where: { archived: false }, select: { id: true }, take: 1 },
      shoppingLists: { where: { archived: false }, select: { id: true }, take: 1 },
    },
  });

  if (!project) notFound();

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
    clients: project.clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? null,
      isMainContact: c.isMainContact,
      createdAt: c.createdAt.toISOString(),
      startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
      endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
    })),
  };

  return <ProjectDetailView project={serialized} />;
}
