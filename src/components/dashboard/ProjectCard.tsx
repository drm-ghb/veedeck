"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProjectMenu from "./ProjectMenu";

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
}: ProjectCardProps) {
  const [warningOpen, setWarningOpen] = useState(false);

  function copyShareLink() {
    const url = `${window.location.origin}/share/${shareToken}`;
    if (hiddenModules.includes("renderflow")) {
      setWarningOpen(true);
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany do schowka");
  }

  function forceCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`);
    setWarningOpen(false);
    toast.success("Link skopiowany do schowka");
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
              <Badge variant="secondary">{renderCount} renderów</Badge>
              <ProjectMenu
                project={{ id, title, clientName, clientEmail, description, pinned }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5 mt-1 min-h-[2.5rem]">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium truncate">
              {clientName ?? "\u00A0"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {clientEmail ?? "\u00A0"}
            </p>
          </div>

          <CardDescription className="line-clamp-1 mt-1 min-h-[1.25rem]">
            {description ?? "\u00A0"}
          </CardDescription>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {new Date(createdAt).toLocaleDateString("pl-PL")}
          </p>
        </CardHeader>
        <CardFooter className="flex gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
          <Button size="sm" variant="outline" onClick={copyShareLink}>
            Skopiuj link
          </Button>
        </CardFooter>
      </Card>
    </Link>

      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Moduł jest ukryty dla klienta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Moduł <strong>RenderFlow</strong> jest oznaczony jako <strong>NIE WIDOCZNY</strong> dla klienta. Przed udostępnieniem linku zmień to w ustawieniach projektu.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWarningOpen(false)}>Zamknij</Button>
            <Button variant="ghost" className="gap-1.5" onClick={forceCopy}>
              <Check size={14} />
              Mimo to skopiuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
