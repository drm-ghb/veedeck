"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ScrollText, PanelLeftClose, PanelLeftOpen, PictureInPicture, Sun, Moon, HelpCircle, Settings, UserRound, X, CheckCircle, MessageSquare, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Theme } from "@/lib/theme";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import Pusher from "pusher-js";

interface ShoppingListLink {
  id: string;
  name: string;
  shareToken: string;
}

interface ShareSidebarProps {
  token: string;
  discussionId?: string | null;
  showRenderFlow?: boolean;
  showListy?: boolean;
  showDyskusje?: boolean;
  shoppingLists?: ShoppingListLink[];
  /** When provided, clicking Dashboard calls this instead of navigating (for SPA-style view) */
  onHomeClick?: () => void;
  /** When provided, clicking RenderFlow calls this instead of navigating (for SPA-style view) */
  onRenderFlowClick?: () => void;
  /** When provided, clicking Dyskusje calls this instead of navigating */
  onDiscussionClick?: () => void;
  /** When provided, clicking Listy calls this instead of navigating */
  onListClick?: () => void;
  /** When provided, clicking Ustawienia calls this instead of navigating (client mode) */
  onSettingsClick?: () => void;
  /** When provided, use /client/[projectId] links instead of /share/[token] links */
  clientProjectId?: string;
  /** Current SPA view — used for active state in client mode */
  activeView?: string;
  /** Current logged-in user ID — used to filter out own messages from unread count */
  currentUserId?: string;
  /** External control for mobile sidebar open state (lifts state to parent) */
  mobileOpen?: boolean;
  /** Called when mobile sidebar open state changes (lifts state to parent) */
  onMobileOpenChange?: (v: boolean) => void;
}

export default function ShareSidebar({
  token,
  discussionId,
  showRenderFlow = true,
  showListy = true,
  showDyskusje = false,
  shoppingLists = [],
  onHomeClick,
  onRenderFlowClick,
  onDiscussionClick,
  onListClick,
  onSettingsClick,
  clientProjectId,
  activeView,
  currentUserId,
  mobileOpen,
  onMobileOpenChange,
}: ShareSidebarProps) {
  const t = useT();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [helpSent, setHelpSent] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [discussionUnread, setDiscussionUnread] = useState(0);
  const [_internalMobileOpen, _setInternalMobileOpen] = useState(false);
  const mobileSidebarOpen = mobileOpen !== undefined ? mobileOpen : _internalMobileOpen;
  const setMobileSidebarOpen = (v: boolean) => {
    if (onMobileOpenChange) onMobileOpenChange(v);
    else _setInternalMobileOpen(v);
  };
  const pusherRef = useRef<Pusher | null>(null);
  const isDyskusjeActiveRef = useRef(false);

  const THEME_OPTIONS: { value: Theme; label: string; Icon: React.ElementType }[] = [
    { value: "light", label: t.theme.light, Icon: Sun },
    { value: "dark", label: t.theme.dark, Icon: Moon },
  ];

  useEffect(() => {
    const key = `veedeck-author-${token}`;
    const saved = localStorage.getItem(key) || "";
    setAuthorName(saved);
    setNameInput(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveSettings() {
    const name = nameInput.trim();
    localStorage.setItem(`veedeck-author-${token}`, name);
    setAuthorName(name);
    setSettingsOpen(false);
  }

  useEffect(() => {
    const saved = localStorage.getItem("nav-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  // Unread discussion count — fetch from server on mount to catch messages sent before client first opened panel
  useEffect(() => {
    if (!discussionId) return;
    const storageKey = clientProjectId
      ? `client-discussion-unread-${clientProjectId}`
      : `share-discussion-unread-${token}`;
    const lastReadKey = clientProjectId
      ? `client-discussion-last-read-${clientProjectId}`
      : `share-discussion-last-read-${token}`;
    const lastReadAt = localStorage.getItem(lastReadKey);
    const url = clientProjectId
      ? (lastReadAt
          ? `/api/client/${clientProjectId}/discussions/${discussionId}/unread?since=${encodeURIComponent(lastReadAt)}`
          : `/api/client/${clientProjectId}/discussions/${discussionId}/unread`)
      : (lastReadAt
          ? `/api/share/${token}/discussions/${discussionId}/unread?since=${encodeURIComponent(lastReadAt)}`
          : `/api/share/${token}/discussions/${discussionId}/unread`);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.count === "number") {
          setDiscussionUnread(data.count);
          localStorage.setItem(storageKey, String(data.count));
        }
      })
      .catch(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) setDiscussionUnread(parseInt(stored, 10) || 0);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discussionId, token, clientProjectId]);

  const storageUnreadKey = clientProjectId
    ? `client-discussion-unread-${clientProjectId}`
    : `share-discussion-unread-${token}`;
  const storageLastReadKey = clientProjectId
    ? `client-discussion-last-read-${clientProjectId}`
    : `share-discussion-last-read-${token}`;

  // Reset when navigating to dyskusje page (share mode only) or when activeView === "discussion" (client mode)
  const dyskusjePathname = `/share/${token}/dyskusje`;
  useEffect(() => {
    const isOnDiscussion = clientProjectId
      ? activeView === "discussion"
      : pathname === dyskusjePathname;
    if (isOnDiscussion) {
      setDiscussionUnread(0);
      localStorage.setItem(storageUnreadKey, "0");
      localStorage.setItem(storageLastReadKey, new Date().toISOString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, dyskusjePathname, activeView, clientProjectId]);

  // Listen for read event from ClientDiscussionView
  useEffect(() => {
    function onRead(e: Event) {
      const detail = (e as CustomEvent<{ token: string }>).detail;
      // In client mode: fire on any event; in share mode: match token
      if (clientProjectId || detail?.token === token) {
        setDiscussionUnread(0);
        localStorage.setItem(storageUnreadKey, "0");
        localStorage.setItem(storageLastReadKey, new Date().toISOString());
      }
    }
    window.addEventListener("share-discussion-read", onRead);
    return () => window.removeEventListener("share-discussion-read", onRead);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, clientProjectId]);

  // Keep ref in sync for Pusher callback (avoids stale closure)
  const dyskusjeHrefForRef = `/share/${token}/dyskusje`;
  useEffect(() => {
    isDyskusjeActiveRef.current = clientProjectId
      ? activeView === "discussion"
      : pathname === dyskusjeHrefForRef;
  }, [pathname, dyskusjeHrefForRef, activeView, clientProjectId]);

  // Pusher — track incoming messages when not on dyskusje view
  useEffect(() => {
    if (!discussionId) return;
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });
    }
    const channel = pusherRef.current.subscribe(`discussion-${discussionId}`);
    channel.bind("new-message", (msg: { userId?: string | null }) => {
      // Skip messages from the current user (their own messages)
      if (currentUserId && msg.userId === currentUserId) return;
      // In share mode: only count designer messages (userId set)
      if (!clientProjectId && !msg.userId) return;
      if (!isDyskusjeActiveRef.current) {
        setDiscussionUnread((prev) => {
          const next = prev + 1;
          localStorage.setItem(storageUnreadKey, String(next));
          return next;
        });
      }
    });
    return () => {
      pusherRef.current?.unsubscribe(`discussion-${discussionId}`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discussionId, token, clientProjectId, currentUserId]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("nav-sidebar-collapsed", String(next));
  }

  const isCollapsed = collapsed;

  const homeHref = clientProjectId ? `/client/${clientProjectId}` : `/share/${token}/dashboard`;
  const renderHref = clientProjectId ? `/client/${clientProjectId}` : `/share/${token}`;
  const listHref =
    shoppingLists.length === 1
      ? `/share/list/${shoppingLists[0].shareToken}`
      : homeHref;
  const dyskusjeHref = clientProjectId ? `/client/${clientProjectId}` : `/share/${token}/dyskusje`;

  // In client mode use activeView prop; in share mode use pathname
  const isHomeActive = clientProjectId
    ? activeView === "home"
    : pathname === homeHref;
  const isRenderActive = clientProjectId
    ? (activeView === "rooms" || activeView === "room" || activeView === "render")
    : pathname === renderHref;
  const isListyActive = clientProjectId
    ? (activeView === "lists" || activeView === "list")
    : pathname.startsWith("/share/list/");
  const isDyskusjeActive = clientProjectId
    ? activeView === "discussion"
    : pathname === dyskusjeHref;

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
    }`;

  // On mobile overlay, always show labels (ignore collapsed state)
  const showLabels = !isCollapsed || mobileSidebarOpen;

  return (
    <>
    {/* Mobile backdrop */}
    {mobileSidebarOpen && (
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/40"
        onClick={() => setMobileSidebarOpen(false)}
      />
    )}

    <aside
      className={[
        "flex flex-col flex-shrink-0",
        // Mobile: fixed overlay, slides in/out from right
        "fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-card shadow-2xl transition-transform duration-200",
        mobileSidebarOpen ? "translate-x-0" : "translate-x-full",
        // Desktop: static in layout, no animation, no overlay background
        "md:static md:z-auto md:max-w-none md:bg-transparent md:shadow-none md:translate-x-0 md:transition-none",
        isCollapsed ? "md:w-14" : "md:w-52",
      ].join(" ")}
    >
      {/* Mobile close button */}
      {mobileSidebarOpen && (
        <div className="md:hidden flex items-center justify-between px-3 py-3 border-b border-border flex-shrink-0">
          <span className="text-sm font-semibold text-foreground">Nawigacja</span>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {/* Dashboard */}
        {onHomeClick ? (
          <button
            onClick={() => { onHomeClick(); setMobileSidebarOpen(false); }}
            title={isCollapsed ? t.share.dashboard : undefined}
            className={`w-full ${linkCls(isHomeActive)}`}
          >
            <span className="flex-shrink-0 w-5 flex items-center justify-center">
              <LayoutDashboard size={18} />
            </span>
            {showLabels && t.share.dashboard}
          </button>
        ) : (
          <Link
            href={homeHref}
            title={isCollapsed ? t.share.dashboard : undefined}
            className={linkCls(isHomeActive)}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="flex-shrink-0 w-5 flex items-center justify-center">
              <LayoutDashboard size={18} />
            </span>
            {showLabels && t.share.dashboard}
          </Link>
        )}

        {/* RenderFlow */}
        {showRenderFlow &&
          (onRenderFlowClick ? (
            <button
              onClick={() => { onRenderFlowClick(); setMobileSidebarOpen(false); }}
              title={isCollapsed ? t.share.renderflow : undefined}
              className={`w-full ${linkCls(isRenderActive)}`}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <PictureInPicture size={18} />
              </span>
              {showLabels && t.share.renderflow}
            </button>
          ) : (
            <Link
              href={renderHref}
              title={isCollapsed ? t.share.renderflow : undefined}
              className={linkCls(isRenderActive)}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <PictureInPicture size={18} />
              </span>
              {showLabels && t.share.renderflow}
            </Link>
          ))}

        {/* Listy */}
        {showListy && shoppingLists.length > 0 && (
          onListClick ? (
            <button
              onClick={() => { onListClick(); setMobileSidebarOpen(false); }}
              title={isCollapsed ? t.share.lists : undefined}
              className={`w-full ${linkCls(isListyActive)}`}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <ScrollText size={18} />
              </span>
              {showLabels && t.share.lists}
            </button>
          ) : (
            <Link
              href={listHref}
              title={isCollapsed ? t.share.lists : undefined}
              className={linkCls(isListyActive)}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <ScrollText size={18} />
              </span>
              {showLabels && t.share.lists}
            </Link>
          )
        )}

        {/* Dyskusje */}
        {showDyskusje && (onDiscussionClick ? (
          <button
            onClick={() => { onDiscussionClick(); setMobileSidebarOpen(false); }}
            title={isCollapsed ? t.share.discussions : undefined}
            className={`w-full ${linkCls(isDyskusjeActive)}`}
          >
            <span className="flex-shrink-0 w-5 flex items-center justify-center relative">
              <MessageSquare size={18} />
              {discussionUnread > 0 && isCollapsed && !mobileSidebarOpen && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                  {discussionUnread > 99 ? "99+" : discussionUnread}
                </span>
              )}
            </span>
            {showLabels && t.share.discussions}
            {showLabels && discussionUnread > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center leading-none">
                {discussionUnread > 99 ? "99+" : discussionUnread}
              </span>
            )}
          </button>
        ) : (
          <Link
            href={dyskusjeHref}
            title={isCollapsed ? t.share.discussions : undefined}
            className={linkCls(isDyskusjeActive)}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="flex-shrink-0 w-5 flex items-center justify-center relative">
              <MessageSquare size={18} />
              {discussionUnread > 0 && isCollapsed && !mobileSidebarOpen && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                  {discussionUnread > 99 ? "99+" : discussionUnread}
                </span>
              )}
            </span>
            {showLabels && t.share.discussions}
            {showLabels && discussionUnread > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center leading-none">
                {discussionUnread > 99 ? "99+" : discussionUnread}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-2 space-y-0.5">
        {/* Theme toggle */}
        {(isCollapsed && !mobileSidebarOpen) ? (
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
          {showLabels && t.nav.help}
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            if (clientProjectId && onSettingsClick) {
              onSettingsClick();
              setMobileSidebarOpen(false);
            } else {
              setNameInput(authorName);
              setSettingsOpen(true);
            }
          }}
          title={isCollapsed ? t.nav.settings : undefined}
          className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
            clientProjectId && activeView === "settings"
              ? "bg-primary/10 text-primary"
              : "text-gray-400 hover:bg-muted hover:text-foreground"
          }`}
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center">
            <Settings size={18} />
          </span>
          {showLabels && t.nav.settings}
        </button>

        {/* Logout — mobile only, client mode */}
        {clientProjectId && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="md:hidden flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-gray-400 hover:bg-muted hover:text-foreground"
          >
            <span className="flex-shrink-0 w-5 flex items-center justify-center">
              <LogOut size={18} />
            </span>
            Wyloguj
          </button>
        )}

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggle}
          title={isCollapsed ? t.share.expandSidebar : t.share.collapseSidebar}
          className="hidden md:flex items-center justify-center w-full py-2 px-2.5 rounded-lg text-gray-400 hover:bg-muted hover:text-foreground transition-colors"
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
    {/* Settings modal */}
    {settingsOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setSettingsOpen(false)}>
        <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold">{t.nav.settings}</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserRound size={16} className="text-gray-400" />
              <span className="font-medium text-sm">{t.share.identity}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t.share.identityDesc}</p>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t.share.yourName}
              onKeyDown={(e) => e.key === "Enter" && saveSettings()}
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <span className="font-medium text-sm">{t.theme.label}</span>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${
                    theme === value ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>{t.common.cancel}</Button>
            <Button size="sm" onClick={saveSettings}>{t.common.save}</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
