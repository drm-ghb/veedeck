import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotificationsClient from "@/app/(dashboard)/notifications/NotificationsClient";

export default async function ClientNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "client") redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <NotificationsClient userId={session.user.id} />
      </div>
    </div>
  );
}
