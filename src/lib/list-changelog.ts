import { prisma } from "./prisma";

export async function logListChange(params: {
  listId: string;
  userId?: string | null;
  userName: string;
  action: string;
  details?: string | null;
  source?: "internal" | "client";
}) {
  try {
    await prisma.listChangeLog.create({
      data: {
        listId: params.listId,
        userId: params.userId ?? null,
        userName: params.userName,
        action: params.action,
        details: params.details ?? null,
        source: params.source ?? "internal",
      },
    });
  } catch (err) {
    console.error("[list-changelog] failed to log:", err);
  }
}
