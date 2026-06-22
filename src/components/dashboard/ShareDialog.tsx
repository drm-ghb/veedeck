"use client";

import { useState } from "react";
import { Share2, Copy, Check, AlertTriangle } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";

interface ShareDialogProps {
  shareUrl: string;
  hiddenModules?: string[];
  moduleSlug?: string;
  moduleName?: string;
}

export default function ShareDialog({
  shareUrl,
  hiddenModules = [],
  moduleSlug = "renderflow",
  moduleName = "ProjectFlow",
}: ShareDialogProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  const moduleHidden = hiddenModules.includes(moduleSlug);

  async function doCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopy() {
    if (moduleHidden) {
      setWarningOpen(true);
      return;
    }
    await doCopy();
  }

  return (
    <>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          <Share2 size={15} />
          <span className="hidden sm:inline">{t.projekty.shareDialog}</span>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.projekty.shareProject}</DialogTitle>
            <DialogDescription>
              {t.projekty.shareDesc}
            </DialogDescription>
          </DialogHeader>
          {moduleHidden && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{t.projekty.shareModuleHidden}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Input readOnly value={shareUrl} className="text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy} title={t.common.copyLink}>
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning confirm dialog */}
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
            <Button variant="ghost" className="gap-1.5" onClick={() => { setWarningOpen(false); doCopy(); }}>
              <Check size={14} />
              {t.common.copyAnyway}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
