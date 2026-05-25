import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SubscriptionSettings from "@/components/settings/SubscriptionSettings";

export default async function SubskrypcjaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, subscription, discounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trialEndsAt: true, isFree: true },
    }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.discount.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <SubscriptionSettings
      trialEndsAt={user?.trialEndsAt?.toISOString() ?? null}
      isFree={user?.isFree ?? false}
      subscription={subscription}
      discounts={discounts}
    />
  );
}
