"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ShoppingCart, PanelLeftClose, PanelLeftOpen, PictureInPicture, Sun, Moon, HelpCircle, Settings, UserRound, X, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Theme } from "@/lib/theme";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";

interface ShoppingListLink {
  id: string;
  name: string;
  shareToken: string;
}

interface ShareSidebarProps {
  token: string;
  showRenderFlow?: boolean;
  showListy?: boolean;
  shoppingLists?: ShoppingListLink[];
  /** When provided, clicking RenderFlow calls this instead of navigating (for SPA-style view) */
  onRenderFlowClick?: () => void;
}

export default function ShareSidebar({
  token,
  showRenderFlow = true,
  showListy = true,
  shoppingLists = [],
  onRenderFlowClick,
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

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("nav-sidebar-collapsed", String(next));
  }

  const isCollapsed = collapsed;

  const homeHref = `/share/${token}/home`;
  const renderHref = `/share/${token}`;
  const listHref =
    shoppingLists.length === 1
      ? `/share/list/${shoppingLists[0].shareToken}`
      : homeHref;

  const isHomeActive = pathname === homeHref;
  const isRenderActive = pathname === renderHref;
  const isListyActive = pathname.startsWith("/share/list/");

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
    }`;

  return (
    <>
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-200 ${
        isCollapsed ? "w-14" : "w-52"
      }`}
    >
      <nav className="flex-1 p-2 space-y-0.5">
        {/* Dashboard */}
        <Link
          href={homeHref}
          title={isCollapsed ? t.share.dashboard : undefined}
          className={linkCls(isHomeActive)}
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center">
            <LayoutDashboard size={18} />
          </span>
          {!isCollapsed && t.share.dashboard}
        </Link>

        {/* RenderFlow */}
        {showRenderFlow &&
          (onRenderFlowClick ? (
            <button
              onClick={onRenderFlowClick}
              title={isCollapsed ? t.share.renderflow : undefined}
              className={`w-full ${linkCls(isRenderActive)}`}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <PictureInPicture size={18} />
              </span>
              {!isCollapsed && t.share.renderflow}
            </button>
          ) : (
            <Link
              href={renderHref}
              title={isCollapsed ? t.share.renderflow : undefined}
              className={linkCls(isRenderActive)}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <PictureInPicture size={18} />
              </span>
              {!isCollapsed && t.share.renderflow}
            </Link>
          ))}

        {/* Listy */}
        {showListy && shoppingLists.length > 0 && (
          <Link
            href={listHref}
            title={isCollapsed ? t.share.lists : undefined}
            className={linkCls(isListyActive)}
          >
            <span className="flex-shrink-0 w-5 flex items-center justify-center">
              <ShoppingCart size={18} />
            </span>
            {!isCollapsed && t.share.lists}
          </Link>
        )}
      </nav>

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

        {/* Settings */}
        <button
          onClick={() => { setNameInput(authorName); setSettingsOpen(true); }}
          title={isCollapsed ? t.nav.settings : undefined}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-gray-400 hover:bg-muted hover:text-foreground"
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center">
            <Settings size={18} />
          </span>
          {!isCollapsed && t.nav.settings}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          title={isCollapsed ? t.share.expandSidebar : t.share.collapseSidebar}
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
