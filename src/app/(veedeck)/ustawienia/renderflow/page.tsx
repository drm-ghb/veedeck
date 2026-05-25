import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsRenderFlow } from "@/components/settings/SettingsRenderFlow";

export default async function SettingsRenderFlowPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      allowDirectStatusChange: true,
      allowClientComments: true,
      allowClientAcceptance: true,
      requireClientEmail: true,
      hideCommentCount: true,
      requirePinTitle: true,
      maxPinsPerRender: true,
      autoClosePinsOnAccept: true,
      autoArchiveOnAccept: true,
      defaultRenderStatus: true,
      defaultRenderOrder: true,
      notifyClientOnStatusChange: true,
      notifyClientOnReply: true,
      allowClientVersionRestore: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsRenderFlow
      initialAllowDirectStatusChange={user.allowDirectStatusChange}
      initialAllowClientComments={user.allowClientComments}
      initialAllowClientAcceptance={user.allowClientAcceptance}
      initialRequireClientEmail={user.requireClientEmail}
      initialHideCommentCount={user.hideCommentCount}
      initialRequirePinTitle={user.requirePinTitle}
      initialMaxPinsPerRender={user.maxPinsPerRender}
      initialAutoClosePinsOnAccept={user.autoClosePinsOnAccept}
      initialAutoArchiveOnAccept={user.autoArchiveOnAccept}
      initialDefaultRenderStatus={user.defaultRenderStatus}
      initialDefaultRenderOrder={user.defaultRenderOrder}
      initialNotifyClientOnStatusChange={user.notifyClientOnStatusChange}
      initialNotifyClientOnReply={user.notifyClientOnReply}
      initialAllowClientVersionRestore={user.allowClientVersionRestore}
    />
  );
}
