import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cron: run every hour (e.g. "0 * * * *" in vercel.json)
// NOTE: Requires Vercel Pro plan for Cron Jobs — on basic plan register an external scheduler
// pointing GET https://yourdomain.com/api/cron/task-reminders
// with header Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Fetch all users that have any tasks with deadlines (ownerId level)
  const users = await prisma.user.findMany({
    where: {
      role: "designer",
      tasks: { some: { dueDate: { not: null }, status: { not: "DONE" }, parentId: null } },
    },
    select: {
      id: true,
      taskReminderHours: true,
      tasks: {
        where: { dueDate: { not: null }, status: { not: "DONE" }, parentId: null },
        select: { id: true, title: true, priority: true, dueDate: true, assigneeId: true },
      },
    },
  });

  let notificationsCreated = 0;

  for (const user of users) {
    const reminderHours = (user.taskReminderHours as Record<string, number> | null) ?? {
      LOW: 72,
      MEDIUM: 48,
      HIGH: 24,
    };

    for (const task of user.tasks) {
      if (!task.dueDate) continue;

      const hoursUntilDue = (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60);
      const threshold = reminderHours[task.priority] ?? 24;

      // Only trigger when we're within the threshold window (and deadline hasn't passed)
      if (hoursUntilDue <= 0 || hoursUntilDue > threshold) continue;

      // Check if a reminder notification was already sent in the last threshold hours
      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          link: `/zadania`,
          message: { contains: task.id },
          createdAt: { gte: new Date(now.getTime() - threshold * 60 * 60 * 1000) },
        },
      });
      if (existing) continue;

      const hoursLeft = Math.ceil(hoursUntilDue);
      const priorityLabel =
        task.priority === "HIGH" ? "Wysoki" : task.priority === "MEDIUM" ? "Średni" : "Niski";

      await prisma.notification.create({
        data: {
          userId: user.id,
          message: `[${task.id}] Przypomnienie: zadanie „${task.title}" (priorytet: ${priorityLabel}) — deadline za ${hoursLeft}h`,
          link: `/zadania`,
          type: "info",
        },
      });
      notificationsCreated++;

      // Also notify assignee if different from owner
      if (task.assigneeId && task.assigneeId !== user.id) {
        const assigneeExisting = await prisma.notification.findFirst({
          where: {
            userId: task.assigneeId,
            message: { contains: task.id },
            createdAt: { gte: new Date(now.getTime() - threshold * 60 * 60 * 1000) },
          },
        });
        if (!assigneeExisting) {
          await prisma.notification.create({
            data: {
              userId: task.assigneeId,
              message: `[${task.id}] Przypomnienie: zadanie „${task.title}" (priorytet: ${priorityLabel}) — deadline za ${hoursLeft}h`,
              link: `/zadania`,
              type: "info",
            },
          });
          notificationsCreated++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, notificationsCreated });
}
