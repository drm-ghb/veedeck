"use client";

import Link from "next/link";
import { FileText, Image, Ruler, ArrowLeft } from "@/components/ui/icons";

interface Folder {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  _count: { files: number };
}

interface Props {
  assignmentId: string;
  projectTitle: string;
  folders: Folder[];
  hasMultipleProjects: boolean;
}

function folderIcon(type: string) {
  if (type === "rysunki") return <Ruler size={32} />;
  if (type === "wizualizacje") return <Image size={32} />;
  return <FileText size={32} />;
}

export default function ContractorDashboard({ assignmentId, projectTitle, folders, hasMultipleProjects }: Props) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        {hasMultipleProjects && (
          <Link href="/wykonawca" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
        )}
        <h1 className="text-2xl font-semibold">{projectTitle}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {folders.map((folder) => (
          <Link key={folder.id} href={`/wykonawca/projekty/${assignmentId}/foldery/${folder.id}`}>
            <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border border-border bg-card hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer text-center">
              <div className="text-primary">
                {folderIcon(folder.type)}
              </div>
              <div>
                <p className="font-semibold">{folder.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {folder._count.files === 1 ? "1 plik" : `${folder._count.files} plików`}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {folders.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Brak folderów przypisanych do tego projektu</p>
      )}
    </div>
  );
}
