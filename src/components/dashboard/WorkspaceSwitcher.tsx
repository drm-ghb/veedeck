"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { ChevronDown, Check } from "@/components/ui/icons";

interface WorkspaceInfo {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isCurrent: boolean;
}

interface WorkspaceSwitcherProps {
  firstName: string;
  avatarUrl: string | null;
  workspaceName: string | null;
}

export default function WorkspaceSwitcher({ firstName, avatarUrl, workspaceName }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (!next || workspaces !== null) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/accounts");
      const data = await res.json();
      setWorkspaces(data.workspaces ?? []);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }

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

  const initial = firstName[0]?.toUpperCase() ?? "?";
  const hasMultiple = workspaces !== null && workspaces.length > 1;

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold leading-none shrink-0 overflow-hidden">
          {avatarUrl
            ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            : initial
          }
        </div>
        <span className="flex flex-col items-start">
          <span className="text-sm font-medium leading-tight">{firstName}</span>
          {workspaceName && (
            <span className="text-[11px] text-muted-foreground leading-tight">{workspaceName}</span>
          )}
        </span>
        <ChevronDown size={14} className="opacity-50" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-popover border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          {loading && (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">Ładowanie...</div>
          )}

          {!loading && hasMultiple && (
            <>
              <div className="px-3 pt-1.5 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Workspace
              </div>
              {workspaces!.map((ws) => (
                <button
                  key={ws.userId}
                  disabled={ws.isCurrent || switching !== null}
                  onClick={() => !ws.isCurrent && handleSwitch(ws.userId)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors disabled:pointer-events-none"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                    {ws.avatarUrl
                      ? <img src={ws.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : (ws.name[0] ?? "?").toUpperCase()
                    }
                  </div>
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  {ws.isCurrent && <Check size={14} className="text-primary shrink-0" />}
                  {switching === ws.userId && (
                    <span className="text-xs text-muted-foreground shrink-0">...</span>
                  )}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <a
                  href="/ustawienia/profil"
                  className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Ustawienia profilu
                </a>
              </div>
            </>
          )}

          {!loading && !hasMultiple && (
            <a
              href="/ustawienia/profil"
              className="flex items-center px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              Ustawienia profilu
            </a>
          )}
        </div>
      )}
    </div>
  );
}
