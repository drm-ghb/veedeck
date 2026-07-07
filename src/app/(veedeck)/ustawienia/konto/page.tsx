import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsAccount } from "@/components/settings/SettingsAccount";

export default async function SettingsKontoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isDesigner = (session.user as any).role === "designer" || !(session.user as any).role;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { createdAt: true },
  });
  if (!user) redirect("/login");

  return (
    <SettingsAccount
      isDesigner={isDesigner}
      createdAt={user.createdAt.toISOString()}
    />
  );
}
