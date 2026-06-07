import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotificationsClient from "@/app/(dashboard)/notifications/NotificationsClient";

export default async function ContractorNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "contractor") redirect("/login");

  return (
    <div className="py-2">
      <NotificationsClient userId={session.user.id} />
    </div>
  );
}
