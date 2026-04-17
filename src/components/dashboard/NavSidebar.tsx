"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Briefcase, ShoppingCart, Package, PanelLeftClose, PanelLeftOpen, Settings, Sun, Moon, HelpCircle, X, CheckCircle, PictureInPicture, ShieldCheck, CalendarDays, NotebookText, MessageSquare } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";

interface NavSidebarProps {
  hiddenModules: string[];
  isAdmin?: boolean;
}

function getSettingsHref(pathname: string): string {
  if (pathname.startsWith("/renderflow")) return "/settings/renderflow";
  if (pathname.startsWith("/listy")) return "/settings/listy";
  return "/settings/ogolne";
}

const HIDDEN_ON: RegExp[] = [
  /^\/projects\/[^/]+\/renders\//,
  /^\/listy\/.+/,
];

export default function NavSidebar({ hiddenModules, isAdmin }: NavSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const t = useT();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nav-sidebar-collapsed") === "true";
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [helpSent, setHelpSent] = useState(false);

  const items = [
    { label: t.nav.dashboard, href: "/dashboard", icon: <LayoutDashboard size={18} />, slug: null },
    { label: t.nav.projects, href: "/projekty", icon: <Briefcase size={18} />, slug: null },
    { label: t.nav.renderflow, href: "/renderflow", icon: <PictureInPicture size={18} />, slug: "renderflow" },
    { label: t.nav.lists, href: "/listy", icon: <ShoppingCart size={18} />, slug: "listy" },
    { label: t.nav.products, href: "/produkty", icon: <Package size={18} />, slug: "produkty" },
    { label: t.nav.calendar, href: "/kalendarz", icon: <CalendarDays size={18} />, slug: null },
    { label: t.nav.notes, href: "/notatnik", icon: <NotebookText size={18} />, slug: null },
    { label: t.nav.discussions, href: "/dyskusje", icon: <MessageSquare size={18} />, slug: null },
  ];

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("nav-sidebar-collapsed", String(next));
    window.dispatchEvent(new CustomEvent("sidebar-state-change", { detail: { collapsed: next } }));
  }

  const forceCollapsed = HIDDEN_ON.some((pattern) => pattern.test(pathname));
  const isCollapsed = forceCollapsed || collapsed;

  const visible = items.filter((item) => !item.slug || !hiddenModules.includes(item.slug));

  return (
    <>
    <aside className={`hidden md:flex flex-col flex-shrink-0 h-full transition-all duration-200 ${isCollapsed ? "w-14" : "w-52"}`}>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                {item.icon}
              </span>
              {!isCollapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {isAdmin && (
        <div className="px-2 pb-1">
          <div className="border-t border-border pt-1">
            <Link
              href="/admin"
              title={isCollapsed ? "Admin" : undefined}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-primary hover:bg-primary/10"
              }`}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <ShieldCheck size={18} />
              </span>
              {!isCollapsed && "Admin"}
            </Link>
          </div>
        </div>
      )}

      <div className="p-2 space-y-0.5">
        {/* Theme toggle */}
        {isCollapsed ? (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? t.nav.switchLight : t.nav.switchDark}
            className="flex items-center justify-center w-full py-2 px-2.5 rounded-lg text-gray-400 hover:bg-muted hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        ) : (
          <div className="flex items-center justify-between px-2.5 py-2.5 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 flex items-center justify-center text-gray-400">
                {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              </span>
              <span className="text-sm font-medium text-gray-400">
                {theme === "dark" ? t.nav.dark : t.nav.light}
              </span>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? t.nav.switchLight : t.nav.switchDark}
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${theme === "dark" ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        )}

        {/* Help */}
        <button
          onClick={() => { setHelpOpen(true); setHelpSent(false); setHelpSubject(""); setHelpDesc(""); }}
          title={isCollapsed ? t.nav.help : undefined}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-gray-400 hover:bg-muted hover:text-foreground"
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center">
            <HelpCircle size={18} />
          </span>
          {!isCollapsed && t.nav.help}
        </button>

        <Link
          href={getSettingsHref(pathname)}
          title={isCollapsed ? t.nav.settings : undefined}
          className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-gray-400 hover:bg-muted hover:text-foreground"
          }`}
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center">
            <Settings size={18} />
          </span>
          {!isCollapsed && t.nav.settings}
        </Link>
        <button
          onClick={toggle}
          title={isCollapsed ? t.nav.expand : t.nav.collapse}
          className="flex items-center justify-center w-full py-2 px-2.5 rounded-lg text-gray-400 hover:bg-muted hover:text-foreground transition-colors"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
    </aside>

    {/* Help modal */}
    {helpOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setHelpOpen(false)}>
        <div className="bg-card rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">{t.nav.helpTitle}</h2>
            <button onClick={() => setHelpOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>

          {helpSent ? (
            <div className="flex flex-col items-center text-center py-6 gap-3">
              <CheckCircle size={48} className="text-green-500" />
              <p className="font-semibold text-lg">{t.nav.helpSent}</p>
              <p className="text-sm text-muted-foreground">{t.nav.helpSentDesc}</p>
              <button
                onClick={() => setHelpOpen(false)}
                className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                {t.common.close}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <span>{t.nav.helpEmail}:</span>
                <a href="mailto:support@veedeck.com" className="text-primary font-medium hover:underline">support@veedeck.com</a>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">{t.nav.helpSubject}</label>
                <input
                  type="text"
                  value={helpSubject}
                  onChange={(e) => setHelpSubject(e.target.value)}
                  placeholder={t.nav.helpSubjectPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">{t.nav.helpDescription}</label>
                <textarea
                  value={helpDesc}
                  onChange={(e) => setHelpDesc(e.target.value)}
                  placeholder={t.nav.helpDescriptionPlaceholder}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <button
                onClick={() => { if (helpSubject.trim() || helpDesc.trim()) setHelpSent(true); }}
                disabled={!helpSubject.trim() && !helpDesc.trim()}
                className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.nav.helpSend}
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
