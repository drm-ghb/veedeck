import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Briefcase, Package } from "lucide-react";
import { cookies } from "next/headers";
import { pl } from "@/lib/translations/pl";
import { en } from "@/lib/translations/en";

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("veedeck-lang")?.value;
  const t = lang === "en" ? en : pl;

  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { globalHiddenModules: true, navMode: true, name: true, email: true },
      })
    : null;

  const hidden = user?.globalHiddenModules ?? [];
  const navMode = user?.navMode ?? "dashboard";
  const displayName = user?.name || user?.email || null;

  if (navMode === "sidebar") {
    return (
      <div className="flex flex-col items-start justify-start">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {displayName ? t.home.welcome.replace("{name}", displayName) : t.home.welcomeDefault}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">{t.home.sidebarHint}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {displayName ? t.home.welcome.replace("{name}", displayName) : t.home.welcomeDefault}
      </h1>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
        {t.home.modules}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">

        {/* Projekty — zawsze widoczne */}
        <Link
          href="/projekty"
          className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-[#C45824]">
            <Briefcase size={32} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground leading-tight">{t.nav.projects}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t.home.projectsDesc}</p>
          </div>
        </Link>

        {/* RenderFlow */}
        {!hidden.includes("renderflow") && (
          <Link
            href="/renderflow"
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-[#C45824]">
              <Image src="/logo-dark.svg" alt="RenderFlow" width={48} height={48} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">{t.nav.renderflow}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t.home.renderflowDesc}</p>
            </div>
          </Link>
        )}

        {/* Listy */}
        {!hidden.includes("listy") && (
          <Link
            href="/listy"
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-[#C45824]">
              <ShoppingCart size={32} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">{t.nav.lists}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t.home.listsDesc}</p>
            </div>
          </Link>
        )}

        {/* Produkty */}
        {!hidden.includes("produkty") && (
          <Link
            href="/produkty"
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-[#7c3aed]">
              <Package size={32} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">{t.nav.products}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t.home.productsDesc}</p>
            </div>
          </Link>
        )}

      </div>
    </div>
  );
}
