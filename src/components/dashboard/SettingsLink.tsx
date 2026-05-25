"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "@/components/ui/icons";

function getSettingsHref(pathname: string): string {
  if (pathname.startsWith("/renderflow")) return "/ustawienia/renderflow";
  if (pathname.startsWith("/listy")) return "/ustawienia/listy";
  if (pathname.startsWith("/klienci")) return "/ustawienia/ogolne";
  return "/ustawienia/ogolne";
}

export function SettingsLink() {
  const pathname = usePathname();
  const href = getSettingsHref(pathname);

  return (
    <Link
      href={href}
      title="Ustawienia"
      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted"
    >
      <Settings size={18} />
    </Link>
  );
}
