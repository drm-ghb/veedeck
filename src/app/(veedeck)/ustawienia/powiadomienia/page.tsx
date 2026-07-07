import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsGeneral } from "@/components/settings/SettingsGeneral";

export default async function SettingsPowiadomieniaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailNotifEnabled: true,
      emailNotifModules: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <SettingsGeneral
      initialEmailNotifEnabled={user.emailNotifEnabled}
      initialEmailNotifModules={user.emailNotifModules}
    />
  );
}
