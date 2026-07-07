import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsBranding } from "@/components/settings/SettingsBranding";

export default async function SettingsBrandingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      showProfileName: true,
      showClientLogo: true,
      clientLogoUrl: true,
      clientWelcomeMessage: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <SettingsBranding
      initialShowProfileName={user.showProfileName}
      initialShowClientLogo={user.showClientLogo}
      initialClientLogoUrl={user.clientLogoUrl}
      initialClientWelcomeMessage={user.clientWelcomeMessage}
    />
  );
}
