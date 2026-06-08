"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Image, Ruler, ArrowLeft, Info, Pin, MessageSquare } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import ContractorProjectInfoSidebar, { type ProjectInfo } from "./ContractorProjectInfoSidebar";

interface Folder {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  totalFiles: number;
  unreadCount: number;
  unreadPinCount: number;
}

interface Props {
  assignmentId: string;
  projectTitle: string;
  folders: Folder[];
  hasMultipleProjects: boolean;
  info: ProjectInfo;
}

function folderIcon(type: string) {
  if (type === "rysunki") return <Ruler size={32} />;
  if (type === "wizualizacje") return <Image size={32} />;
  return <FileText size={32} />;
}

export default function ContractorDashboard({ assignmentId, projectTitle, folders, hasMultipleProjects, info }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {hasMultipleProjects && (
            <Link href="/wykonawca" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
            </Link>
          )}
          <h1 className="text-2xl font-semibold flex-1">{projectTitle}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInfoOpen(true)}
            className="gap-2 shrink-0"
          >
            <Info size={15} />
            Informacje o projekcie
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <Link key={folder.id} href={`/wykonawca/projekty/${assignmentId}/foldery/${folder.id}`}>
              <div className="relative flex flex-col items-center justify-center gap-3 h-44 rounded-2xl border border-border bg-card hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer text-center">
                <div className="text-primary">
                  {folderIcon(folder.type)}
                </div>
                <div>
                  <p className="font-semibold">{folder.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {folder.totalFiles === 1 ? "1 plik" : `${folder.totalFiles} plików`}
                  </p>
                </div>
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  {folder.unreadPinCount > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">
                      <Pin size={11} />
                      Nowe piny: {folder.unreadPinCount}
                    </span>
                  )}
                  {folder.unreadCount > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <MessageSquare size={11} />
                      Nieprzeczytane: {folder.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {folders.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Brak folderów przypisanych do tego projektu</p>
        )}
      </div>

      <ContractorProjectInfoSidebar
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        projectTitle={projectTitle}
        info={info}
      />
    </>
  );
}
