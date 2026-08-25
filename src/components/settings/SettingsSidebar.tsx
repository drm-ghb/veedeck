"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, ChevronLeft, Users, Puzzle, BookOpen,
  UserCircle, Image, Palette, Payments, UserMinus,
  LocalMall, Eye, ClipboardList, Link2,
} from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

export default function SettingsSidebar({ isOwner = true }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const allItems = [
    { href: "/ustawienia/profil",             label: t.settings.profileNav,        icon: <UserCircle size={16} />, ownerOnly: false },
    { href: "/ustawienia/branding",           label: t.settings.brandingNav,       icon: <Image size={16} />,      ownerOnly: true  },
    { href: "/ustawienia/wyglad",             label: t.settings.appearanceNav,     icon: <Palette size={16} />,    ownerOnly: false },
    { href: "/ustawienia/uzytkownicy",        label: t.settings.usersNav,          icon: <Users size={16} />,      ownerOnly: true  },
    { href: "/ustawienia/powiadomienia",      label: t.settings.notificationsNav,  icon: <Bell size={16} />,       ownerOnly: false },
    { href: "/ustawienia/wtyczka",            label: t.settings.pluginNav,         icon: <Puzzle size={16} />,     ownerOnly: true  },
    { href: "/ustawienia/integracje",         label: t.settings.integrationsNav,   icon: <Link2 size={16} />,      ownerOnly: true  },
    { href: "/ustawienia/instrukcja",         label: t.settings.guideNav,          icon: <BookOpen size={16} />,   ownerOnly: false },
    { href: "/ustawienia/plan-i-rozliczenia", label: t.settings.planNav,           icon: <Payments size={16} />,   ownerOnly: true  },
    { href: "/ustawienia/konto",              label: t.settings.accountNav,        icon: <UserMinus size={16} />,  ownerOnly: false },
  ];

  const items = isOwner ? allItems : allItems.filter((i) => !i.ownerOnly);

  const moduleItems = [
    { href: "/ustawienia/projectflow",   label: "ProjectFlow",                    icon: <Eye size={16} /> },
    { href: "/ustawienia/listy",         label: t.settings.shoppingListsNav,     icon: <LocalMall size={16} /> },
    { href: "/ustawienia/zadania",       label: t.settings.tasksNav,              icon: <ClipboardList size={16} /> },
  ];

  return (
    <>
      {/* Mobile: horizontal scrollable tab bar */}
      <nav className="md:hidden w-full space-y-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          {t.common.back}
        </button>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                <span className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <div className="w-px bg-border mx-1 self-stretch flex-shrink-0" />
          {moduleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                <span className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: vertical sidebar */}
      <nav className="hidden md:block w-48 shrink-0 space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          {t.common.back}
        </button>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  <span className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1">{t.settings.modulesNav}</p>
          <ul className="space-y-0.5">
            {moduleItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                    <span className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
