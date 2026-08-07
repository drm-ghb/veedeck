import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ listId?: string }>;
}) {
  const { listId } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "client") redirect("/panel-glowny");

  const links = await prisma.projectClient.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { projectId: null },
        { project: { archived: false } },
      ],
    },
    select: {
      clientId: true,
      project: {
        select: {
          id: true,
          title: true,
          archived: true,
          isPortalProject: true,
          user: { select: { name: true, showProfileName: true } },
        },
      },
    },
  });

  // Projects directly linked via ProjectClient
  const directProjects = links
    .filter((l): l is typeof l & { project: NonNullable<typeof l["project"]> } =>
      l.project != null && !l.project.archived
    )
    .map((l) => l.project);

  // Projects linked via Client entity
  const clientIds = [...new Set(links.map((l) => l.clientId).filter((id): id is string => !!id))];
  const clientEntityProjects = clientIds.length > 0
    ? await prisma.project.findMany({
        where: { clientId: { in: clientIds }, archived: false },
        select: { id: true, title: true, isPortalProject: true, user: { select: { name: true, showProfileName: true } } },
      })
    : [];

  // Deduplicate
  const seen = new Map<string, { id: string; title: string; isPortalProject: boolean; user: { name: string | null; showProfileName: boolean } }>();
  for (const p of [...directProjects, ...clientEntityProjects]) seen.set(p.id, p);
  const all = [...seen.values()];

  // If real projects exist, exclude portal-only ones
  const hasRealProject = all.some((p) => !p.isPortalProject);
  const active = hasRealProject ? all.filter((p) => !p.isPortalProject) : all;

  // If client has a project — go straight there
  if (active.length > 0) {
    const suffix = listId ? `?view=list&listId=${listId}` : "";
    redirect(`/client/${active[0].id}${suffix}`);
  }

  // No projects — show empty state
  const cookieStore = await cookies();
  const lang = cookieStore.get("veedeck-lang")?.value === "en" ? "en" : "pl";
  const emptyMsg = lang === "en"
    ? "Your designer hasn't shared any content with you yet. Contact them directly!"
    : "Na ten moment Twój projektant nie udostępnił Ci żadnej zawartości. Skontaktuj się z nim bezpośrednio!";
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm max-w-sm">{emptyMsg}</p>
    </div>
  );
}
