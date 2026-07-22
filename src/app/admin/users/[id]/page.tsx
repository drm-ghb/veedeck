import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AdminUserDetailClient from "@/components/admin/AdminUserDetailClient";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
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
      subscription: { select: { plan: true, status: true, billingName: true, billingEmail: true, cardLast4: true, cardBrand: true, createdAt: true } },
      billingRecords: { select: { amount: true } },
      _count: { select: { projects: true, shoppingLists: true, clients: true } },
    },
  });

  if (!user) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Użytkownicy
        </Link>
        <h1 className="text-xl font-semibold text-white">
          {user.fullName ?? user.name ?? user.email}
        </h1>
        <p className="text-sm text-white/40 mt-0.5">{user.email}</p>
      </div>
      <AdminUserDetailClient user={user} currentUserId={session!.user!.id!} />
    </div>
  );
}
