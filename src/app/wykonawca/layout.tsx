import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { Engineering } from "@/components/ui/icons";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "contractor") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, fullName: true, avatarUrl: true },
  });

  const displayName = user?.fullName ?? user?.name ?? "Wykonawca";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <nav className="relative z-10 px-4 flex items-center gap-3 py-3 border-b border-border bg-background">
        <Link href="/wykonawca" className="flex items-center gap-2 font-semibold text-foreground">
          <Engineering size={20} className="text-primary" />
          <span className="hidden sm:inline">Panel wykonawcy</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{firstName}</span>
          <SignOutButton />
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6 bg-background">
        {children}
      </main>
    </div>
  );
}
