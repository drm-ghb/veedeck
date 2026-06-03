"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, FileText, Image, Ruler, Trash2, ChevronLeft, Download } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AddContractorFileDialog from "./AddContractorFileDialog";

interface ContractorFile {
  id: string;
  name: string;
  fileUrl: string | null;
  fileType: string;
  createdAt: string;
  render: { id: string; name: string; fileUrl: string; fileType: string } | null;
}

interface ContractorFolder {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  _count: { files: number };
  files: ContractorFile[];
}

interface Room {
  id: string;
  name: string;
  renders: { id: string; name: string; fileUrl: string; fileType: string }[];
}

interface Props {
  contractorId: string;
  contractorName: string;
  assignmentId: string;
  projectTitle: string;
  projectId: string;
  folders: ContractorFolder[];
  rooms: Room[];
}

function folderIcon(type: string) {
  if (type === "rysunki") return <Ruler size={20} />;
  if (type === "wizualizacje") return <Image size={20} />;
  return <FileText size={20} />;
}

export default function ContractorProjectView({
  contractorId, contractorName, assignmentId, projectTitle, projectId, folders, rooms,
}: Props) {
  const router = useRouter();
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [addFileDialog, setAddFileDialog] = useState<string | null>(null);

  async function toggleVisible(folder: ContractorFolder) {
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folder.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !folder.visible }),
      }
    );
    if (res.ok) {
      toast.success(folder.visible ? "Folder ukryty dla wykonawcy" : "Folder widoczny dla wykonawcy");
      router.refresh();
    } else {
      toast.error("Błąd podczas aktualizacji widoczności");
    }
  }

  async function deleteFile(folderId: string, fileId: string, fileName: string) {
    if (!confirm(`Usunąć plik "${fileName}"?`)) return;
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/files/${fileId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Plik usunięty");
      router.refresh();
    } else {
      toast.error("Błąd podczas usuwania pliku");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/wykonawcy/${contractorId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/wykonawcy" className="hover:text-foreground transition-colors min-w-0 shrink truncate max-w-[80px]">Wykonawcy</Link>
          <span className="flex-shrink-0">/</span>
          <Link href={`/wykonawcy/${contractorId}`} className="hover:text-foreground transition-colors min-w-0 shrink truncate max-w-[100px]">{contractorName}</Link>
          <span className="flex-shrink-0">/</span>
          <span className="text-foreground font-medium min-w-0 shrink truncate max-w-[140px]">{projectTitle}</span>
        </nav>
      </div>

      <h1 className="text-2xl font-semibold">{projectTitle}</h1>

      <div className="space-y-3">
        {folders.map((folder) => (
          <div key={folder.id} className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className={`text-muted-foreground ${folder.visible ? "" : "opacity-40"}`}>
                {folderIcon(folder.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{folder.name}</span>
                  {!folder.visible && <Badge variant="secondary" className="text-xs">Ukryty</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{folder._count.files} plików</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleVisible(folder)}
                  title={folder.visible ? "Ukryj dla wykonawcy" : "Pokaż wykonawcy"}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  {folder.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddFileDialog(folder.id)}
                  className="gap-1.5"
                >
                  <Plus size={14} />
                  Dodaj plik
                </Button>
                <button
                  onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2"
                >
                  {expandedFolder === folder.id ? "Zwiń" : "Rozwiń"}
                </button>
              </div>
            </div>

            {expandedFolder === folder.id && (
              <div className="border-t border-border">
                {folder.files.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Brak plików w tym folderze</p>
                ) : (
                  <div className="divide-y divide-border">
                    {folder.files.map((file) => {
                      const displayUrl = file.render?.fileUrl ?? file.fileUrl ?? null;
                      const displayName = file.name;
                      const isImage = (file.render?.fileType ?? file.fileType) === "image";
                      return (
                        <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                            {isImage && displayUrl ? (
                              <img src={displayUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <FileText size={18} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(file.createdAt).toLocaleDateString("pl-PL")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {displayUrl && (
                              <a
                                href={displayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                                title="Pobierz"
                              >
                                <Download size={15} />
                              </a>
                            )}
                            <button
                              onClick={() => deleteFile(folder.id, file.id, displayName)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                              title="Usuń"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {addFileDialog === folder.id && (
              <AddContractorFileDialog
                open={true}
                onOpenChange={(v) => !v && setAddFileDialog(null)}
                contractorId={contractorId}
                assignmentId={assignmentId}
                folderId={folder.id}
                projectId={projectId}
                rooms={rooms}
                onAdded={() => { setAddFileDialog(null); router.refresh(); }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
