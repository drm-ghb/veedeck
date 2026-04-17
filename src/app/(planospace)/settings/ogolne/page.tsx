import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsGeneral } from "@/components/settings/SettingsGeneral";

export default async function SettingsOgolnePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      showProfileName: true,
      globalHiddenModules: true,
      clientLogoUrl: true,
      clientWelcomeMessage: true,
      navMode: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsGeneral
      initialName={user.name ?? ""}
      initialEmail={user.email}
      initialShowProfileName={user.showProfileName}
      initialGlobalHiddenModules={user.globalHiddenModules}
      initialClientLogoUrl={user.clientLogoUrl}
      initialClientWelcomeMessage={user.clientWelcomeMessage}
      initialNavMode={user.navMode}
    />
  );
}
