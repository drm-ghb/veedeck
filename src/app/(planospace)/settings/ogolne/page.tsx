import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsGeneral } from "@/components/settings/SettingsGeneral";
import type { ColorTheme } from "@/lib/theme";

export default async function SettingsOgolnePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      showProfileName: true,
      showClientLogo: true,
      globalHiddenModules: true,
      clientLogoUrl: true,
      clientWelcomeMessage: true,
      navMode: true,
      colorTheme: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsGeneral
      initialName={user.name ?? ""}
      initialEmail={user.email}
      initialShowProfileName={user.showProfileName}
      initialShowClientLogo={user.showClientLogo}
      initialGlobalHiddenModules={user.globalHiddenModules}
      initialClientLogoUrl={user.clientLogoUrl}
      initialClientWelcomeMessage={user.clientWelcomeMessage}
      initialNavMode={user.navMode}
      initialColorTheme={(user.colorTheme ?? "champagne") as ColorTheme}
    />
  );
}
