"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { LayoutDashboard, Users, LocalMall, Package, PanelLeftClose, PanelLeftOpen, Settings, Sun, Moon, HelpCircle, X, CheckCircle, PushPin, ShieldCheck, CalendarDays, NotebookText, ChatBubble, CheckSquare, VeezardIcon, BookOpen, ClipboardList, Engineering } from "@/components/ui/icons";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";

const DEFAULT_SIDEBAR_ORDER = ["klienci", "projectflow", "listy", "zadania", "ankiety", "produkty", "wykonawcy", "kalendarz", "notatnik", "dyskusje", "veezard"];

interface NavSidebarProps {
  hiddenModules: string[];
  isAdmin?: boolean;
  sidebarOrder?: string[];
  userId?: string;
  isTrial?: boolean;
  initialCollapsed?: boolean;
}

function getSettingsHref(pathname: string): string {
  if (pathname.startsWith("/projectflow")) return "/ustawienia/projectflow";
  if (pathname.startsWith("/listy")) return "/ustawienia/listy";
  if (pathname.startsWith("/zadania")) return "/ustawienia/zadania";
  return "/ustawienia/ogolne";
}

const HIDDEN_ON: RegExp[] = [
  /^\/projects\/[^/]+\/renders\//,
  /^\/listy\/.+/,
  /^\/wykonawcy\/[^/]+\/projekty\/[^/]+\/foldery\//,
];

export default function NavSidebar({ hiddenModules, isAdmin, sidebarOrder, userId, isTrial, initialCollapsed = false }: NavSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const t = useT();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [helpSent, setHelpSent] = useState(false);

  const [discussionUnread, setDiscussionUnread] = useState(0);
  const [contractorUnread, setContractorUnread] = useState(0);
  const pusherRef = useRef<Pusher | null>(null);
  const pathnameRef = useRef(pathname);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function read() {
      const val = localStorage.getItem("discussions-unread-count");
      setDiscussionUnread(val ? parseInt(val, 10) : 0);
    }
    read();
    window.addEventListener("discussions-unread-updated", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("discussions-unread-updated", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  // Subscribe to all discussion Pusher channels to track incoming messages
  useEffect(() => {
    fetch("/api/discussions")
      .then((r) => r.json())
      .then((data: { id: string; unreadCount?: number }[]) => {
        if (!Array.isArray(data)) return;

        const total = data.reduce((sum, d) => sum + (d.unreadCount ?? 0), 0);
        localStorage.setItem("discussions-unread-count", String(total));
        setDiscussionUnread(total);

        if (!pusherRef.current) {
          pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          });
        }
        // Re-fetch the accurate count from API instead of incrementing blindly.
        // This avoids race conditions where a message arrives both in the initial
        // fetch (counted as unreadCount) AND as a Pusher event (double-counted).
        function refetchUnreadCount() {
          if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
          refetchTimerRef.current = setTimeout(() => {
            fetch("/api/discussions")
              .then((r) => r.json())
              .then((fresh: { id: string; unreadCount?: number }[]) => {
                if (!Array.isArray(fresh)) return;
                const freshTotal = fresh.reduce((sum, d) => sum + (d.unreadCount ?? 0), 0);
                localStorage.setItem("discussions-unread-count", String(freshTotal));
                setDiscussionUnread(freshTotal);
              }).catch(() => {});
          }, 300);
        }

        const handleNewMessage = (msg: { userId?: string | null }) => {
          if (msg.userId && msg.userId === userId) return;
          if (pathnameRef.current.startsWith("/dyskusje")) return;
          refetchUnreadCount();
        };

        data.forEach((d) => {
          const channel = pusherRef.current!.subscribe(`discussion-${d.id}`);
          // Skip own messages (designer), count all others (clients/contractors)
          // When on /dyskusje the DyskusjeView manages the count itself
          channel.bind("new-message", handleNewMessage);
        });

        // Subscribe to user-level channel to detect new discussions and contractor comments
        if (userId) {
          const userChannel = pusherRef.current!.subscribe(`user-${userId}`);
          userChannel.bind("new-discussion", (data: { discussionId: string; hasMessage?: boolean }) => {
            // Subscribe to future messages on this new discussion
            const ch = pusherRef.current!.subscribe(`discussion-${data.discussionId}`);
            ch.bind("new-message", handleNewMessage);
            // Re-fetch count when a new discussion has a pending message
            if (data.hasMessage && !pathnameRef.current.startsWith("/dyskusje")) {
              refetchUnreadCount();
            }
          });
          userChannel.bind("contractor-comment-unread", () => {
            if (!pathnameRef.current.startsWith("/wykonawcy")) {
              setContractorUnread((prev) => prev + 1);
            }
          });
        }
      })
      .catch(() => {});

    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      pusherRef.current?.disconnect();
      pusherRef.current = null;
    };
  }, []);

  // Fetch initial contractor unread count
  useEffect(() => {
    fetch("/api/contractor-file-comments/unread-count")
      .then((r) => r.json())
      .then((data) => setContractorUnread(data.count ?? 0))
      .catch(() => {});
  }, []);

  // Reset contractor badge when on /wykonawcy
  useEffect(() => {
    if (pathname.startsWith("/wykonawcy")) {
      setContractorUnread(0);
    }
  }, [pathname]);

  const items = [
    { label: t.nav.dashboard, href: "/dashboard", icon: <LayoutDashboard size={18} />, slug: null, badge: 0, matchPrefixes: [] as string[] },
    { label: t.nav.projects, href: "/klienci", icon: <Users size={18} />, slug: null, badge: 0, matchPrefixes: [] as string[] },
    { label: t.nav.renderflow, href: "/projectflow", icon: <PushPin size={18} />, slug: "renderflow", badge: 0, matchPrefixes: ["/projects/"] },
    { label: t.nav.lists, href: "/listy", icon: <LocalMall size={18} />, slug: "listy", badge: 0, matchPrefixes: [] as string[] },
    { label: "Wykonawcy", href: "/wykonawcy", icon: <Engineering size={18} />, slug: null, badge: contractorUnread, matchPrefixes: [] as string[] },
    { label: t.nav.tasks, href: "/zadania", icon: <CheckSquare size={18} />, slug: null, badge: 0, matchPrefixes: [] as string[] },
    { label: t.nav.surveys, href: "/ankiety", icon: <ClipboardList size={18} />, slug: null, badge: 0, matchPrefixes: [] as string[] },
    { label: t.nav.products, href: "/produkty", icon: <Package size={18} />, slug: "produkty", badge: 0, matchPrefixes: [] as string[] },
    { label: t.nav.calendar, href: "/kalendarz", icon: <CalendarDays size={18} />, slug: null, badge: 0, matchPrefixes: [] as string[] },
    { label: t.nav.notes, href: "/notatnik", icon: <NotebookText size={18} />, slug: null, badge: 0, matchPrefixes: [] as string[] },
    { label: t.nav.discussions, href: "/dyskusje", icon: <ChatBubble size={18} />, slug: null, badge: discussionUnread, matchPrefixes: [] as string[] },
    { label: t.nav.veezard, href: "/veezard", icon: <VeezardIcon size={18} />, slug: null, badge: 0, matchPrefixes: [] as string[], soon: true },
  ];

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("nav-sidebar-collapsed", String(next));
    document.cookie = `nav-sidebar-collapsed=${next}; path=/; max-age=31536000; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent("sidebar-state-change", { detail: { collapsed: next } }));
  }

  const forceCollapsed = HIDDEN_ON.some((pattern) => pattern.test(pathname));
  const isCollapsed = forceCollapsed || collapsed;

  const normalizedSidebarOrder = sidebarOrder?.map((k) => k === "renderflow" ? "projectflow" : k);
  const order = normalizedSidebarOrder && normalizedSidebarOrder.length > 0
    ? [...normalizedSidebarOrder, ...DEFAULT_SIDEBAR_ORDER.filter((k) => !normalizedSidebarOrder.includes(k))]
    : DEFAULT_SIDEBAR_ORDER;
  const [dashboard, ...rest] = items;
  const sortedRest = [...rest].sort((a, b) => {
    const keyA = a.href.replace("/", "");
    const keyB = b.href.replace("/", "");
    const ia = order.indexOf(keyA);
    const ib = order.indexOf(keyB);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const sortedItems = [dashboard, ...sortedRest];
  const visible = sortedItems.filter((item) => !item.slug || !hiddenModules.includes(item.slug));

  return (
    <>
    <aside className={`hidden md:flex flex-col flex-shrink-0 h-full transition-all duration-200 ${isCollapsed ? "w-14" : "w-52"}`}>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/") || item.matchPrefixes.some((p) => pathname.startsWith(p));
          const badge = item.badge > 0 ? item.badge : null;
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
              <span className="flex-shrink-0 w-5 flex items-center justify-center relative">
                {item.icon}
                {badge !== null && isCollapsed && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              {!isCollapsed && (
                <span className="flex-1 flex items-center gap-1.5">
                  {item.label}
                  {"soon" in item && item.soon && (
                    <span className="text-[8px] font-bold uppercase tracking-wide px-1 py-px rounded-full bg-primary/15 text-primary leading-none whitespace-nowrap">
                      Wkrótce
                    </span>
                  )}
                </span>
              )}
              {!isCollapsed && badge !== null && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center leading-none">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
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

        {isTrial && (
          <Link
            href="/ustawienia/instrukcja"
            title={isCollapsed ? "Instrukcja" : undefined}
            className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith("/ustawienia/instrukcja")
                ? "bg-primary/10 text-primary"
                : "text-gray-400 hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="flex-shrink-0 w-5 flex items-center justify-center">
              <BookOpen size={18} />
            </span>
            {!isCollapsed && "Instrukcja"}
          </Link>
        )}
        <Link
          href={getSettingsHref(pathname)}
          title={isCollapsed ? t.nav.settings : undefined}
          className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/ustawienia") && pathname !== "/ustawienia/instrukcja"
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
