import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsGeneral } from "@/components/settings/SettingsGeneral";
import type { ColorTheme } from "@/lib/theme";

export default async function SettingsOgolnePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isDesigner = (session.user as any).role === "designer" || !(session.user as any).role;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      fullName: true,
      email: true,
      phone: true,
      phonePrefix: true,
      avatarUrl: true,
      showProfileName: true,
      showClientLogo: true,
      globalHiddenModules: true,
      clientLogoUrl: true,
      clientWelcomeMessage: true,
      colorTheme: true,
      emailNotifEnabled: true,
      emailNotifModules: true,
      viewPreferences: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsGeneral
      isDesigner={isDesigner}
      initialName={user.name ?? ""}
      initialFullName={user.fullName ?? ""}
      initialEmail={user.email}
      initialPhone={user.phone ?? ""}
      initialPhonePrefix={user.phonePrefix ?? "+48"}
      initialAvatarUrl={user.avatarUrl ?? null}
      initialShowProfileName={user.showProfileName}
      initialShowClientLogo={user.showClientLogo}
      initialGlobalHiddenModules={user.globalHiddenModules}
      initialClientLogoUrl={user.clientLogoUrl}
      initialClientWelcomeMessage={user.clientWelcomeMessage}
      initialColorTheme={(user.colorTheme ?? "champagne") as ColorTheme}
      initialEmailNotifEnabled={user.emailNotifEnabled}
      initialEmailNotifModules={user.emailNotifModules}
      initialSidebarOrder={((user.viewPreferences as Record<string, unknown>)?.sidebarOrder as string[]) ?? []}
    />
  );
}
