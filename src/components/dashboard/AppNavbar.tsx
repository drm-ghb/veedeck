import Link from "next/link";
import { ShieldCheck } from "@/components/ui/icons";
import { LogoBrand } from "@/components/dashboard/LogoBrand";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";
import MobileMenu from "@/components/dashboard/MobileMenu";
import MobileSearch from "@/components/dashboard/MobileSearch";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import TrialBadge from "@/components/dashboard/TrialBadge";
import { QuickNoteButton } from "@/components/notatnik/QuickNoteButton";

interface AppNavbarProps {
  firstName: string | null;
  avatarUrl: string | null;
  hiddenModules?: string[];
  isAdmin?: boolean;
  isTrial?: boolean;
  trialEndsAt?: string | null;
  notificationUserId: string;
  sidebarCollapsed?: boolean;
  extraRight?: React.ReactNode;
}

export default function AppNavbar({
  firstName,
  avatarUrl,
  hiddenModules = [],
  isAdmin = false,
  isTrial = false,
  trialEndsAt,
  notificationUserId,
  sidebarCollapsed = false,
  extraRight,
}: AppNavbarProps) {
  return (
    <nav className="relative z-50" style={{ backgroundColor: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}>
      <div className="px-4 flex items-center gap-2 py-3">
        {/* Left: logo */}
        <div className="shrink-0 sm:flex-1 flex items-center gap-2">
          <LogoBrand initialCollapsed={sidebarCollapsed} />
          {isAdmin && (
            <Link href="/admin" className="hidden md:flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors ml-2">
              <ShieldCheck size={16} />
              Admin
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="hidden sm:flex flex-1 justify-center px-2 min-w-0">
          <div className="w-full max-w-sm">
            <GlobalSearch />
          </div>
        </div>

        {/* Right */}
        <div className="ml-auto sm:ml-0 shrink-0 sm:flex-1 flex items-center gap-2 justify-end">
          {isTrial && trialEndsAt && <TrialBadge trialEndsAt={trialEndsAt} />}
          {extraRight}
          <div className="md:hidden"><MobileSearch /></div>
          <QuickNoteButton />
          <NotificationBell userId={notificationUserId} iconOnly />
          {firstName && (
            <a href="/ustawienia/ogolne" className="hidden md:flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold leading-none shrink-0 overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : firstName[0].toUpperCase()
                }
              </div>
              <span className="text-sm font-medium">{firstName}</span>
            </a>
          )}
          <div className="hidden md:block"><SignOutButton /></div>
          <div className="md:hidden">
            <MobileMenu userName={firstName} logoUrl={avatarUrl} hiddenModules={hiddenModules} isTrial={isTrial} />
          </div>
        </div>
      </div>
    </nav>
  );
}
