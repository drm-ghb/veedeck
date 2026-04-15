import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin === true;

  // Non-admin (or logged-out): just render children (login page)
  if (!isAdmin) {
    return <>{children}</>;
  }

  // Admin: render full admin panel UI
  return (
    <div className="h-dvh flex bg-[#0a0a0a]">
      <AdminSidebar
        email={session!.user!.email!}
        name={session!.user!.name ?? null}
      />
      <main className="flex-1 overflow-y-auto bg-[#111318] px-8 py-8">
        {children}
      </main>
    </div>
  );
}
