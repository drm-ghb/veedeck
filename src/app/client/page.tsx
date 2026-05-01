import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ClientIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "client") redirect("/dashboard");

  const links = await prisma.projectClient.findMany({
    where: { userId: session.user.id },
    include: {
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

  const active = links.filter((l) => !l.project.archived);

  if (active.length === 1) {
    redirect(`/client/${active[0].project.id}`);
  }

  if (active.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground text-sm">Nie masz jeszcze przypisanych projektów.</p>
      </div>
    );
  }

  // Multiple projects — show list
  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold text-center mb-6">Twoje projekty</h1>
        {active.map((l) => (
          <Link
            key={l.project.id}
            href={`/client/${l.project.id}`}
            className="block bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <p className="font-semibold text-foreground">{l.project.title}</p>
            {l.project.user.showProfileName && l.project.user.name && (
              <p className="text-sm text-muted-foreground mt-0.5">{l.project.user.name}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
