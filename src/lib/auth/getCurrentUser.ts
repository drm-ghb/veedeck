import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface CurrentUser {
  id: string;
  email: string;
  stripeCustomerId?: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeCustomerId: true },
  });

  if (!user || !user.email) return null;
  return { id: user.id, email: user.email, stripeCustomerId: user.stripeCustomerId };
}
