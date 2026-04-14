"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2x2 } from "lucide-react";

export function HomeLinkIcon({ hidden }: { hidden?: boolean } = {}) {
  const pathname = usePathname();
  if (pathname === "/dashboard" || hidden) return null;

  return (
    <Link
      href="/dashboard"
      title="Strona główna"
      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted shrink-0"
    >
      <Grid2x2 size={18} />
    </Link>
  );
}
