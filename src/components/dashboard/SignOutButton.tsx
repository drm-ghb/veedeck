"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useT } from "@/lib/i18n";

export function SignOutButton() {
  const t = useT();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      title={t.nav.logout}
      className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-md hover:bg-gray-100"
    >
      <LogOut size={18} />
    </button>
  );
}
