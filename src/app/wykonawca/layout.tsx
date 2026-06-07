import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { Engineering } from "@/components/ui/icons";
import ContractorChatButton from "@/components/wykonawca/ContractorChatButton";
import { ForceLightMode } from "@/components/wykonawca/ForceLightMode";
import NotificationBell from "@/components/dashboard/NotificationBell";
import Image from "next/image";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "contractor") redirect("/login");

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      company: true,
      designer: { select: { fullName: true, name: true, clientLogoUrl: true } },
    },
  });

  const displayName = contractor?.company || contractor?.name || "Wykonawca";
  const designer = contractor?.designer;
  const designerName = designer?.name || designer?.fullName || null;
  const designerLogo = designer?.clientLogoUrl ?? null;

  const assignments = contractor
    ? await prisma.contractorAssignment.findMany({
        where: { contractorId: contractor.id, archived: false },
        include: { project: { select: { title: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <ForceLightMode />
      <nav className="relative z-10 px-4 flex items-center gap-3 py-3 border-b border-border">
        <Link href="/wykonawca" className="flex items-center gap-2 font-semibold text-foreground">
          {designerLogo ? (
            <Image src={designerLogo} alt="Logo" width={28} height={28} className="object-contain rounded" />
          ) : (
            <Engineering size={20} className="text-primary" />
          )}
          <span className="hidden sm:inline">{designerName ?? "Panel wykonawcy"}</span>
          {designerName && (
            <span className="hidden sm:inline text-sm font-normal text-muted-foreground">Panel wykonawcy</span>
          )}
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{displayName}</span>
          <NotificationBell userId={session.user.id!} viewAllHref="/wykonawca" />
          <ContractorChatButton
            contractorUserId={session.user.id!}
            assignments={assignments.map((a) => ({ id: a.id, projectTitle: a.project.title }))}
          />
          <SignOutButton />
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6 bg-background rounded-tl-2xl flex flex-col">
        <div className="flex-1">{children}</div>
        <div className="pt-10 pb-2 flex items-center justify-center gap-1.5 opacity-40 select-none">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <Image src="/veedeck_ikona.png" alt="veedeck" width={16} height={16} className="object-contain" />
          <span className="text-xs text-muted-foreground">veedeck</span>
        </div>
      </main>
    </div>
  );
}
