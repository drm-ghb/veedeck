"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Briefcase, ShoppingCart, Package, Settings, LogOut, HelpCircle, Sun, Moon, CheckCircle } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";

interface MobileMenuProps {
  userName: string | null;
  logoUrl?: string | null;
  hiddenModules?: string[];
}

export default function MobileMenu({ userName, logoUrl, hiddenModules = [] }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [helpSent, setHelpSent] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const t = useT();

  const navItems = [
    { label: t.nav.dashboard, href: "/home", icon: <LayoutDashboard size={18} />, slug: null },
    { label: t.nav.projects, href: "/projekty", icon: <Briefcase size={18} />, slug: null },
    { label: t.nav.renderflow, href: "/renderflow", icon: null, slug: "renderflow" },
    { label: t.nav.lists, href: "/listy", icon: <ShoppingCart size={18} />, slug: "listy" },
    { label: t.nav.products, href: "/produkty", icon: <Package size={18} />, slug: "produkty" },
  ];

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const visible = navItems.filter((item) => !item.slug || !hiddenModules.includes(item.slug));

  function openHelp() {
    setHelpOpen(true);
    setHelpSent(false);
    setHelpSubject("");
    setHelpDesc("");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-muted transition-colors"
        aria-label={t.nav.openMenu}
      >
        <Menu size={20} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] z-50 bg-card shadow-2xl flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                : userName ? userName[0].toUpperCase() : "?"}
            </div>
            {userName && (
              <span className="text-sm font-semibold text-foreground truncate">{userName}</span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-2 p-1.5 rounded-md text-gray-500 hover:bg-muted transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visible.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="w-5 flex items-center justify-center flex-shrink-0">
                  {item.icon ?? (
                    <>
                      <Image src="/logo.svg" alt="RenderFlow" width={18} height={18} className="block dark:hidden" />
                      <Image src="/logo-dark.svg" alt="RenderFlow" width={18} height={18} className="hidden dark:block" />
                    </>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-border space-y-0.5">
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="w-5 flex items-center justify-center text-gray-600 dark:text-gray-400">
                {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              </span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {theme === "dark" ? t.nav.dark : t.nav.light}
              </span>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${theme === "dark" ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          <button
            onClick={openHelp}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground transition-colors"
          >
            <span className="w-5 flex items-center justify-center"><HelpCircle size={18} /></span>
            {t.nav.help}
          </button>

          <Link
            href="/settings/ogolne"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith("/settings")
                ? "bg-primary/10 text-primary"
                : "text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="w-5 flex items-center justify-center"><Settings size={18} /></span>
            {t.nav.settings}
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <span className="w-5 flex items-center justify-center"><LogOut size={18} /></span>
            {t.nav.logout}
          </button>
        </div>
      </div>

      {/* Help modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setHelpOpen(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
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
