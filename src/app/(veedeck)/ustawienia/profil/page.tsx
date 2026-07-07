import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsProfile } from "@/components/settings/SettingsProfile";

export default async function SettingsProfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      fullName: true,
      email: true,
      phone: true,
      phonePrefix: true,
      avatarUrl: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <SettingsProfile
      initialName={user.name ?? ""}
      initialFullName={user.fullName ?? ""}
      initialEmail={user.email}
      initialPhone={user.phone ?? ""}
      initialPhonePrefix={user.phonePrefix ?? "+48"}
      initialAvatarUrl={user.avatarUrl ?? null}
    />
  );
}
