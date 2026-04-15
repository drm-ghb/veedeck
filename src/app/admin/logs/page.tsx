import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminLogsClient from "@/components/admin/AdminLogsClient";

export default async function AdminLogsPage() {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const [loginLogs, activityLogs] = await Promise.all([
    prisma.loginLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Logi</h1>
        <p className="text-sm text-white/40 mt-1">
          Historia logowań i aktywności systemu
        </p>
      </div>
      <AdminLogsClient
        loginLogs={loginLogs.map((l) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        }))}
        activityLogs={activityLogs.map((l) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
