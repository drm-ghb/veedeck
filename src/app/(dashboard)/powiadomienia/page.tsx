import { auth } from "@/lib/auth";
import NotificationsClient from "@/app/(dashboard)/notifications/NotificationsClient";

export default async function PowiadomieniaPage() {
  const session = await auth();
  return <NotificationsClient userId={session!.user!.id!} />;
}
