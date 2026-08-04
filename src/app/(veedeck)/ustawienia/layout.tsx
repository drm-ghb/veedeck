import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsSidebar from "@/components/settings/SettingsSidebar";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ownerId: true },
  });

  const isOwner = !dbUser?.ownerId;

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
      <SettingsSidebar isOwner={isOwner} />
      <main className="flex-1 min-w-0 w-full">{children}</main>
    </div>
  );
}
