"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, AlertTriangle, Check, KeyRound } from "@/components/ui/icons";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProjectMenu from "./ProjectMenu";
import { useT } from "@/lib/i18n";

interface ProjectCardProps {
  id: string;
  title: string;
  clientName?: string | null;
  clientEmail?: string | null;
  description?: string | null;
  renderCount: number;
  createdAt: string;
  shareToken: string;
  pinned?: boolean;
  hiddenModules?: string[];
  hasClientAccounts?: boolean;
  clientHasNoAccount?: boolean;
}

export default function ProjectCard({
  id,
  title,
  clientName,
  clientEmail,
  description,
  renderCount,
  createdAt,
  shareToken,
  pinned,
  hiddenModules = [],
  hasClientAccounts = false,
  clientHasNoAccount = false,
}: ProjectCardProps) {
  const t = useT();
  const router = useRouter();
  const [warningOpen, setWarningOpen] = useState(false);

  function getShareUrl() {
    return hasClientAccounts
      ? `${window.location.origin}/client/${id}`
      : `${window.location.origin}/share/${shareToken}`;
  }

  function copyShareLink() {
    if (!hasClientAccounts && hiddenModules.includes("renderflow")) {
      setWarningOpen(true);
      return;
    }
    navigator.clipboard.writeText(getShareUrl());
    toast.success(t.common.linkCopied);
  }

  function forceCopy() {
    navigator.clipboard.writeText(getShareUrl());
    setWarningOpen(false);
    toast.success(t.common.linkCopied);
  }

  return (
    <>
    <Link href={`/projects/${id}`} className="block">
      <Card className="hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer h-full relative">
        <CardHeader className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight line-clamp-2 flex items-center gap-1.5">
              {pinned && <Pin size={13} className="text-red-500 fill-red-500 shrink-0 translate-y-px" />}
              {title}
            </CardTitle>
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.preventDefault()}>
              <Badge variant="secondary">{renderCount} {t.projekty.renders}</Badge>
              <ProjectMenu
                project={{ id, title, clientName, clientEmail, description, pinned }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5 mt-1 min-h-[1.25rem]">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium truncate">
              {clientName ? `${t.projekty.colClient}: ${clientName}` : "\u00A0"}
            </p>
          </div>

          <CardDescription className="line-clamp-1 mt-1 min-h-[1.25rem]">
            {description ?? "\u00A0"}
          </CardDescription>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t.projekty.createdAt} {new Date(createdAt).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardFooter className="flex gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
          <Button size="sm" variant="outline" onClick={copyShareLink}>
            {t.common.copyLink}
          </Button>
          {clientHasNoAccount && clientName && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={(e) => { e.stopPropagation(); router.push(`/klienci/${id}?tab=contacts`); }}
            >
              <KeyRound size={13} />
              {t.projekty.noAccount}
            </Button>
          )}
        </CardFooter>
      </Card>
    </Link>

      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              {t.common.moduleHiddenForClient}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.projekty.shareModuleHidden}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWarningOpen(false)}>{t.common.close}</Button>
            <Button variant="ghost" className="gap-1.5" onClick={forceCopy}>
              <Check size={14} />
              {t.common.copyAnyway}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
