import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsAppearance } from "@/components/settings/SettingsAppearance";
import type { ColorTheme } from "@/lib/theme";

export default async function SettingsWygladPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      globalHiddenModules: true,
      colorTheme: true,
      customTheme: true,
      viewPreferences: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <SettingsAppearance
      initialColorTheme={(user.colorTheme ?? "champagne") as ColorTheme}
      initialCustomTheme={(user.customTheme as unknown as import("@/lib/theme").CustomThemeColors) ?? null}
      initialGlobalHiddenModules={user.globalHiddenModules}
      initialSidebarOrder={((user.viewPreferences as Record<string, unknown>)?.sidebarOrder as string[]) ?? []}
    />
  );
}
