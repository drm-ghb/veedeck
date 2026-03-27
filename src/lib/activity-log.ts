import { prisma } from "./prisma";

export async function logActivity(params: {
  level: "error" | "warn" | "info";
  action: string;
  message: string;
  userId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        level: params.level,
        action: params.action,
        message: params.message,
        userId: params.userId,
        meta: params.meta ? JSON.stringify(params.meta) : null,
      },
    });
  } catch {
    // nie blokuj głównej operacji gdy logowanie zawiedzie
  }
}
