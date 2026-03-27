import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminUsersClient from "./AdminUsersClient";
import AdminLogsClient from "./AdminLogsClient";

export default async function AdminPage() {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const [users, loginLogs, activityLogs] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        _count: { select: { projects: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loginLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const serializedLoginLogs = loginLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  const serializedActivityLogs = activityLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Panel administratora</h1>
        <p className="text-gray-500 mt-1">Zarządzaj zarejestrowanymi użytkownikami i przeglądaj logi</p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-base font-semibold mb-3">Użytkownicy</h2>
          <AdminUsersClient users={users} currentUserId={session!.user!.id!} />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">Logi</h2>
          <AdminLogsClient
            loginLogs={serializedLoginLogs}
            activityLogs={serializedActivityLogs}
          />
        </section>
      </div>
    </div>
  );
}
