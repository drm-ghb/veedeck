"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Users, Activity, ShieldCheck, LogOut, Inbox } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function AdminSidebar({
  email,
  name,
}: {
  email: string;
  name: string | null;
}) {
  const t = useT();
  const pathname = usePathname();
  const items = [
    { href: "/admin/users", label: t.admin.usersNav, icon: <Users size={15} /> },
    { href: "/admin/tickets", label: "Zgłoszenia", icon: <Inbox size={15} /> },
    { href: "/admin/logs", label: t.admin.logsNav, icon: <Activity size={15} /> },
  ];

  return (
    <div className="w-56 shrink-0 flex flex-col bg-[#0a0a0a] border-r border-white/5">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <ShieldCheck size={15} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Admin</p>
            <p className="text-[10px] text-white/30 leading-tight">ProjectFlow</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-500/15 text-blue-400 font-medium"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + sign out */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="mb-3 min-w-0">
          <p className="text-xs font-medium text-white/60 truncate">
            {name ?? email}
          </p>
          {name && (
            <p className="text-[11px] text-white/25 truncate">{email}</p>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-2 text-xs text-white/25 hover:text-white/60 transition-colors"
        >
          <LogOut size={13} />
          {t.admin.signOut}
        </button>
      </div>
    </div>
  );
}
