import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsExtension } from "@/components/settings/SettingsExtension";

export default async function SettingsWtyczkaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { extensionKey: true },
  });
  if (!user) redirect("/login");

  return <SettingsExtension initialKey={user.extensionKey ?? null} />;
}
