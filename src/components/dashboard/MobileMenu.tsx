"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Users, LocalMall, Package, Settings, LogOut, HelpCircle, CheckCircle, CalendarDays, NotebookText, PushPin, ChatBubble, VeezardIcon, BookOpen, ClipboardList, CheckSquare, Engineering, Interests, Check, ChevronDown } from "@/components/ui/icons";
import { signIn, signOut } from "next-auth/react";
import { useT } from "@/lib/i18n";

interface WorkspaceInfo {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isCurrent: boolean;
}

interface MobileMenuProps {
  userName: string | null;
  logoUrl?: string | null;
  hiddenModules?: string[];
  isTrial?: boolean;
  hasWorkspaces?: boolean;
  workspaceName?: string | null;
}

export default function MobileMenu({ userName, logoUrl, hiddenModules = [], isTrial, hasWorkspaces = false, workspaceName }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [helpSent, setHelpSent] = useState(false);
  const pathname = usePathname();
  const t = useT();

  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[] | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [discussionUnread, setDiscussionUnread] = useState(0);

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

  const navItems = [
    { label: t.nav.dashboard, href: "/panel-glowny", icon: <LayoutDashboard size={18} />, slug: null },
    { label: t.nav.projects, href: "/klienci", icon: <Users size={18} />, slug: "klienci" },
    { label: t.nav.renderflow, href: "/projectflow", icon: <PushPin size={18} />, slug: "projectflow" },
    { label: t.nav.lists, href: "/listy-zakupowe", icon: <LocalMall size={18} />, slug: "listy" },
    { label: t.nav.moodboard, href: "/moodboardy", icon: <Interests size={18} />, slug: "moodboardy" },
    { label: t.nav.contractors, href: "/wykonawcy", icon: <Engineering size={18} />, slug: "wykonawcy" },
    { label: t.nav.tasks, href: "/zadania", icon: <CheckSquare size={18} />, slug: "zadania" },
    { label: t.nav.products, href: "/produkty", icon: <Package size={18} />, slug: "produkty" },
    { label: t.nav.calendar, href: "/kalendarz", icon: <CalendarDays size={18} />, slug: "kalendarz" },
    { label: t.nav.notes, href: "/notatnik", icon: <NotebookText size={18} />, slug: "notatnik" },
    { label: t.nav.discussions, href: "/dyskusje", icon: <ChatBubble size={18} />, slug: "dyskusje" },
    { label: t.nav.surveys, href: "/ankiety", icon: <ClipboardList size={18} />, slug: "ankiety" },
    { label: t.nav.veezard, href: "/veezard", icon: <VeezardIcon size={18} />, slug: null, soon: true },
  ];

  // Fetch workspaces when workspace section is first expanded
  useEffect(() => {
    if (!workspaceExpanded || !hasWorkspaces || workspaces !== null) return;
    fetch("/api/workspace/accounts")
      .then((r) => r.json())
      .then((data) => setWorkspaces(data.workspaces ?? []))
      .catch(() => setWorkspaces([]));
  }, [workspaceExpanded, hasWorkspaces, workspaces]);

  async function handleSwitch(targetUserId: string) {
    setSwitching(targetUserId);
    try {
      const res = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!data.token) { setSwitching(null); return; }
      await signIn("credentials", { impersonateToken: data.token, callbackUrl: "/panel-glowny" });
    } catch {
      setSwitching(null);
    }
  }

  // Close on route change; collapse workspace panel when drawer closes
  useEffect(() => { setOpen(false); setWorkspaceExpanded(false); }, [pathname]);

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
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            {hasWorkspaces ? (
              <button
                onClick={() => setWorkspaceExpanded((v) => !v)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-lg hover:bg-muted transition-colors -ml-1 pl-1 pr-2 py-1"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    : userName ? userName[0].toUpperCase() : "?"}
                </div>
                {userName && (
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground truncate leading-tight">{userName}</span>
                    {workspaceName && (
                      <span className="text-[11px] text-muted-foreground truncate leading-tight">{workspaceName}</span>
                    )}
                  </span>
                )}
                <ChevronDown size={14} className={`opacity-50 shrink-0 transition-transform ${workspaceExpanded ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    : userName ? userName[0].toUpperCase() : "?"}
                </div>
                {userName && (
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate leading-tight">{userName}</span>
                    {workspaceName && (
                      <span className="text-[11px] text-muted-foreground truncate leading-tight">{workspaceName}</span>
                    )}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setOpen(false)}
              className="ml-2 p-1.5 rounded-md text-gray-500 hover:bg-muted transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Inline workspace switcher */}
          {hasWorkspaces && workspaceExpanded && (
            <div className="px-3 pb-3">
              {workspaces === null ? (
                <p className="text-xs text-muted-foreground px-2 py-1">Ładowanie...</p>
              ) : workspaces.length > 1 ? (
                <div className="space-y-0.5">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.userId}
                      disabled={ws.isCurrent || switching !== null}
                      onClick={() => !ws.isCurrent && handleSwitch(ws.userId)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground disabled:pointer-events-none"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                        {ws.avatarUrl
                          ? <img src={ws.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : (ws.name[0] ?? "?").toUpperCase()
                        }
                      </div>
                      <span className="flex-1 text-left truncate">{ws.name}</span>
                      {ws.isCurrent && <Check size={14} className="text-primary shrink-0" />}
                      {switching === ws.userId && <span className="text-xs text-muted-foreground shrink-0">...</span>}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
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
                  {item.icon ?? <PushPin size={18} />}
                </span>
                <span className="flex-1 relative">
                  {item.label}
                  {"soon" in item && item.soon && (
                    <span className="absolute -top-2.5 -right-1 text-[8px] font-bold uppercase tracking-wide px-1 py-px rounded-full bg-primary/15 text-primary leading-none whitespace-nowrap">
                      {t.common.soon}
                    </span>
                  )}
                </span>
                {item.href === "/dyskusje" && discussionUnread > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center leading-none">
                    {discussionUnread > 99 ? "99+" : discussionUnread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-border space-y-0.5">
          <button
            onClick={openHelp}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-muted hover:text-foreground transition-colors"
          >
            <span className="w-5 flex items-center justify-center"><HelpCircle size={18} /></span>
            {t.nav.help}
          </button>

          {isTrial && (
            <>
              <button
                onClick={() => { window.dispatchEvent(new CustomEvent("open-onboarding")); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <span className="w-5 flex items-center justify-center"><BookOpen size={18} /></span>
                {t.common.howToStart}
              </button>
            </>
          )}

          <Link
            href="/ustawienia/profil"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith("/ustawienia")
                ? "bg-primary/10 text-primary"
                : "text-gray-400 hover:bg-muted hover:text-foreground"
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
