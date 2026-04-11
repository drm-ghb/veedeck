import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  return (
    <div className="flex gap-8 items-start">
      <AdminSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
