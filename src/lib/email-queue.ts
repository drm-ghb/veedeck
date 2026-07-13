import { prisma } from "@/lib/prisma";

export async function queueEmailNotif(
  userId: string,
  module: string,
  type: string,
  payload: Record<string, unknown>
) {
  await prisma.emailNotifQueue.create({
    data: { userId, module, type, payload },
  });
}
