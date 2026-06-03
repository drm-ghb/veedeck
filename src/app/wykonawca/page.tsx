import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Engineering } from "@/components/ui/icons";

export default async function ContractorHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
  });

  if (!contractor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Engineering size={48} className="text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">Nie masz przypisanych projektów</p>
        <p className="text-sm text-muted-foreground/60">Skontaktuj się z projektantem, aby uzyskać dostęp do projektów.</p>
      </div>
    );
  }

  const assignments = await prisma.contractorAssignment.findMany({
    where: { contractorId: contractor.id, archived: false },
    include: {
      project: { select: { id: true, title: true } },
      contractor: { include: { designer: { select: { name: true, fullName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Engineering size={48} className="text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">Nie masz przypisanych projektów</p>
        <p className="text-sm text-muted-foreground/60">Skontaktuj się z projektantem, aby uzyskać dostęp do projektów.</p>
      </div>
    );
  }

  if (assignments.length === 1) {
    redirect(`/wykonawca/projekty/${assignments[0].id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Moje projekty</h1>
      <div className="grid gap-3">
        {assignments.map((a) => {
          const designerName = a.contractor.designer.fullName ?? a.contractor.designer.name ?? "Projektant";
          return (
            <Link key={a.id} href={`/wykonawca/projekty/${a.id}`}>
              <Card className="hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">{a.project.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{designerName}</p>
                  <p className="text-xs text-muted-foreground">
                    Przypisano: {new Date(a.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
