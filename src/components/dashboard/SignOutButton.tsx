"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

export function SignOutButton() {
  const t = useT();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      title={t.nav.logout}
      className="opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
    >
      <LogOut size={18} />
    </button>
  );
}
