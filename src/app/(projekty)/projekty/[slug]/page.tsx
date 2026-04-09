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
    addressCountry: project.addressCountry ?? null,
    addressCity: project.addressCity ?? null,
    addressPostalCode: project.addressPostalCode ?? null,
    addressStreet: project.addressStreet ?? null,
    hasRenders: project.renders.length > 0,
    hasLists: project.shoppingLists.length > 0,
    clients: project.clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      isMainContact: c.isMainContact,
      createdAt: c.createdAt.toISOString(),
    })),
  };

  return <ProjectDetailView project={serialized} />;
}
