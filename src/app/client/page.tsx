import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogOut } from "@/components/ui/icons";

export default async function ClientIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "client") redirect("/panel-glowny");

  const links = await prisma.projectClient.findMany({
    where: { userId: session.user.id },
    select: {
      clientId: true,
      project: {
        select: {
          id: true,
          title: true,
          archived: true,
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
        select: { id: true, title: true, user: { select: { name: true, showProfileName: true } } },
      })
    : [];

  // Deduplicate
  const seen = new Map<string, { id: string; title: string; user: { name: string | null; showProfileName: boolean } }>();
  for (const p of [...directProjects, ...clientEntityProjects]) seen.set(p.id, p);
  const active = [...seen.values()];

  if (active.length === 0) {
    const logoutForm = (
      <form action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}>
        <button
          type="submit"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={16} />
          Wyloguj
        </button>
      </form>
    );
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <p className="text-muted-foreground text-sm">Nie masz jeszcze przypisanych projektów.</p>
        {logoutForm}
      </div>
    );
  }

  redirect(`/client/${active[0].id}`);
}
