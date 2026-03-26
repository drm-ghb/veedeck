import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, Settings } from "lucide-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-card border-b">
        <div className="container mx-auto px-6 max-w-6xl flex items-center justify-between py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="RenderFlow" width={28} height={28} className="block dark:hidden" />
            <Image src="/logo-dark.svg" alt="RenderFlow" width={28} height={28} className="hidden dark:block" />
            <span className="text-xl font-bold">Render<span className="text-blue-600">Flow</span></span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <LayoutGrid size={16} />
              Projekty
            </Link>
            <NotificationBell userId={session.user.id!} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session.user.name || session.user.email}</span>
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
      <main className="flex-1 container mx-auto px-6 py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
