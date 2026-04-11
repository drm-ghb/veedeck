"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, Activity, ChevronLeft } from "lucide-react";

const items = [
  { href: "/admin/users", label: "Użytkownicy", icon: <Users size={16} /> },
  { href: "/admin/logs", label: "Logi", icon: <Activity size={16} /> },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="w-48 shrink-0 space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Wróć
      </button>

      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className={active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
