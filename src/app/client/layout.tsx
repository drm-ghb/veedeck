import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FloatingChatPanel from "@/components/dyskusje/FloatingChatPanel";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  return (
    <>
      {children}
      <FloatingChatPanel
        userId={session.user.id}
        currentUserAvatarUrl={dbUser?.avatarUrl ?? null}
      />
    </>
  );
}
