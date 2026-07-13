import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function queueEmailNotif(
  userId: string,
  module: string,
  type: string,
  payload: Prisma.InputJsonValue
) {
  await prisma.emailNotifQueue.create({
    data: { userId, module, type, payload },
  });
}
