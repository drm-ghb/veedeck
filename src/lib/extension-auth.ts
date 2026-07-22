import { prisma } from "@/lib/prisma";

/** Validates the Bearer token from the Authorization header.
 *  Returns the matching user (owner or standalone designer) or null. */
export async function validateExtensionKey(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!key) return null;

  const user = await prisma.user.findUnique({
    where: { extensionKey: key },
    select: { id: true, name: true, email: true, ownerId: true, trialEndsAt: true, isFree: true, subscription: { select: { status: true, cancelAt: true } } },
  });
  if (!user) return null;

  const workspaceId = user.ownerId ?? user.id;

  // Compute trial expiry (only for account owners — team members inherit owner's access)
  const subStatus = user.subscription?.status ?? null;
  const cancelAt = user.subscription?.cancelAt ?? null;
  const hasAccess = !!(user.isFree || subStatus === "active" || (subStatus === "cancelled" && !!cancelAt && new Date(cancelAt) > new Date()));
  const isTrialExpired = !!(user.trialEndsAt && new Date(user.trialEndsAt) < new Date() && !hasAccess && !user.ownerId);

  return { ...user, workspaceId, isTrialExpired };
}
