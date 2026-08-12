"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "@/components/ui/icons";
import NotificationsClient from "@/app/(dashboard)/notifications/NotificationsClient";

export default function ClientNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    if ((session?.user as any)?.role !== "client") { router.push("/login"); return; }

    // Fetch first project to get back link
    fetch("/api/client")
      .then((r) => r.ok ? r.json() : [])
      .then((list: { id: string }[]) => { if (list[0]) setProjectId(list[0].id); })
      .catch(() => {});
  }, [status, session, router]);

  if (status === "loading" || status === "unauthenticated") return null;
  if (!session?.user?.id) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => projectId ? router.push(`/client/${projectId}`) : router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Wróć do panelu
        </button>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <NotificationsClient userId={session.user.id!} />
      </div>
    </div>
  );
}
