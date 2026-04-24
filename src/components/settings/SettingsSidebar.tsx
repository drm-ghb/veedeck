"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, ScrollText, ChevronLeft, Users, Puzzle, PictureInPicture } from "lucide-react";
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
      icon: <PictureInPicture size={16} />,
      module: { href: "/projekty", label: "RenderFlow" },
    },
    {
      href: "/settings/listy",
      label: t.settings.lists,
      icon: <ScrollText size={16} />,
      module: { href: "/listy", label: t.settings.lists },
    },
    {
      href: "/settings/uzytkownicy",
      label: "Użytkownicy",
      icon: <Users size={16} />,
      module: null,
    },
    {
      href: "/settings/wtyczka",
      label: "Wtyczka",
      icon: <Puzzle size={16} />,
      module: null,
    },
  ];

  const activeItem = items.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const backModule = activeItem?.module ?? null;

  const backButton = (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
    >
      <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
      {backModule ? t.settings.backTo.replace("{module}", backModule.label) : t.common.back}
    </button>
  );

  return (
    <>
      {/* Mobile: horizontal scrollable tab bar */}
      <nav className="md:hidden w-full space-y-3">
        {backButton}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: vertical sidebar */}
      <nav className="hidden md:block w-48 shrink-0 space-y-4">
        {backButton}
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
    </>
  );
}
