"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Settings, ShoppingCart, ChevronLeft, Users } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function SettingsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const items = [
    {
      href: "/settings/ogolne",
      label: t.settings.generalNav,
      icon: <Settings size={16} />,
      module: null,
    },
    {
      href: "/settings/renderflow",
      label: t.settings.renderflow,
      icon: (
        <span className="flex items-center justify-center w-4 h-4">
          <Image src="/logo-dark.svg" alt="RenderFlow" width={16} height={16} className="hidden dark:block" />
          <Image src="/logo.svg" alt="RenderFlow" width={16} height={16} className="block dark:hidden" />
        </span>
      ),
      module: { href: "/projekty", label: "RenderFlow" },
    },
    {
      href: "/settings/listy",
      label: t.settings.lists,
      icon: <ShoppingCart size={16} />,
      module: { href: "/listy", label: t.settings.lists },
    },
    {
      href: "/settings/uzytkownicy",
      label: "Użytkownicy",
      icon: <Users size={16} />,
      module: null,
    },
  ];

  const activeItem = items.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const backModule = activeItem?.module ?? null;

  return (
    <nav className="w-48 shrink-0 space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        {backModule ? t.settings.backTo.replace("{module}", backModule.label) : t.common.back}
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
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
