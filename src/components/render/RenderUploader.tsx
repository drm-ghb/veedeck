"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

interface Folder {
  id: string;
  name: string;
}

interface RenderUploaderProps {
  projectId: string;
  roomId?: string;
  folderId?: string;
  compact?: boolean;
  folders?: Folder[];
}

export default function RenderUploader({ projectId, roomId, folderId: fixedFolderId, compact, folders = [] }: RenderUploaderProps) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [folderId, setFolderId] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (uploading) return;
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size={compact ? "icon-sm" : "default"} variant="default" className={compact ? "bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 h-6 w-6 rounded-md p-0 flex-shrink-0" : ""} title={t.render.addFiles} />}>
        {compact ? <span className="text-base leading-none">+</span> : `+ ${t.render.addFiles}`}
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.render.addFiles}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {folders.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="render-folder">{t.render.folderOptional}</Label>
              <select
                id="render-folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                disabled={uploading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t.render.noFolder}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <UploadButton<OurFileRouter, "renderUploader">
              endpoint="renderUploader"
              content={{
                button: uploading ? t.render.uploading : t.render.chooseFiles,
                allowedContent: "",
              }}
              onUploadBegin={() => setUploading(true)}
              onClientUploadComplete={async (res) => {
                const files = res.map((file) => ({
                  name: file.name.replace(/\.[^.]+$/, ""),
                  fileUrl: file.url,
                  fileKey: file.key,
                  fileType: file.type?.includes("pdf") ? "pdf" : "image",
                }));
                const r = await fetch("/api/renders/batch", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    projectId,
                    roomId: roomId ?? null,
                    folderId: fixedFolderId ?? (folderId || null),
                    files,
                  }),
                });
                const created = r.ok ? await r.json() : [];
                if (created.length > 0) {
                  window.dispatchEvent(new CustomEvent("renderflow:renders-created", { detail: created }));
                }
                setUploading(false);
                setOpen(false);
                const n = created.length;
                toast.success(`${t.render.filesAddedPrefix} ${n} ${n === 1 ? t.render.fileSingular : n < 5 ? t.render.fileFew : t.render.fileMany}`);
                router.refresh();
              }}
              onUploadError={(err) => {
                setUploading(false);
                toast.error(`${t.render.uploadError} ${err.message}`);
              }}
              appearance={{
                button:
                  "bg-gray-900 text-white hover:bg-gray-700 rounded-md text-sm font-medium px-4 py-2 h-auto w-full ut-uploading:opacity-70",
                allowedContent: "hidden",
                container: "w-full flex-col",
              }}
            />
            <p className="text-xs text-gray-400 text-center">{t.render.imagesAndPdfsLimit}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
