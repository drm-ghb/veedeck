import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminUsersClient from "../AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Użytkownicy</h1>
        <p className="text-sm text-muted-foreground mt-1">Zarządzaj zarejestrowanymi kontami</p>
      </div>
      <AdminUsersClient users={users} currentUserId={session!.user!.id!} />
    </div>
  );
}
