import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminUsersClient from "@/components/admin/AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      isAdmin: true,
      role: true,
      createdAt: true,
      trialEndsAt: true,
      isFree: true,
      subscription: { select: { plan: true, status: true } },
      _count: { select: { projects: true, shoppingLists: true, clients: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Last successful login per user
  const lastLogins = await prisma.loginLog.groupBy({
    by: ["userId"],
    where: { success: true, userId: { not: null } },
    _max: { createdAt: true },
  });
  const lastLoginMap: Record<string, string> = {};
  for (const entry of lastLogins) {
    if (entry.userId && entry._max.createdAt) {
      lastLoginMap[entry.userId] = entry._max.createdAt.toISOString();
    }
  }

  const usersWithActivity = users.map((u) => ({
    ...u,
    lastActiveAt: lastLoginMap[u.id] ?? null,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Użytkownicy</h1>
        <p className="text-sm text-white/40 mt-1">
          Zarządzaj zarejestrowanymi kontami
        </p>
      </div>
      <AdminUsersClient users={usersWithActivity} currentUserId={session!.user!.id!} />
    </div>
  );
}
