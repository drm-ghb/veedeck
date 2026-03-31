import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Settings } from "lucide-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { prisma } from "@/lib/prisma";

export default async function PlanospaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, email: true },
  });

  const displayName = dbUser?.name || dbUser?.email || null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <nav className="bg-card border-b">
        <div className="container mx-auto px-3 sm:px-6 max-w-6xl flex items-center justify-between py-3 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Image src="/planospace-logo.svg" alt="Planospace" width={28} height={28} className="block dark:hidden" />
            <Image src="/planospace-logo-dark.svg" alt="Planospace" width={28} height={28} className="hidden dark:block" />
            <span className="text-xl font-bold tracking-tight">Planospace</span>
          </div>

          {/* Right: user + settings + logout */}
          <div className="flex items-center gap-3">
            {displayName && (
              <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                {displayName}
              </span>
            )}
            <Link
              href="/settings"
              title="Ustawienia"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted"
            >
              <Settings size={18} />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-3 sm:px-6 max-w-6xl py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}
