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
      <DialogTrigger render={<Button size={compact ? "icon-sm" : "default"} variant="default" className={compact ? "bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 h-6 w-6 rounded-md p-0 flex-shrink-0" : ""} title="Dodaj pliki" />}>
        {compact ? <span className="text-base leading-none">+</span> : "+ Dodaj pliki"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Dodaj pliki</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {folders.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="render-folder">Folder (opcjonalnie)</Label>
              <select
                id="render-folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                disabled={uploading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— bez folderu —</option>
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
                button: uploading ? "Wgrywanie..." : "Wybierz pliki",
                allowedContent: "",
              }}
              onUploadBegin={() => setUploading(true)}
              onClientUploadComplete={async (res) => {
                for (const file of res) {
                  const name = file.name.replace(/\.[^.]+$/, "");
                  await fetch("/api/renders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      projectId,
                      name,
                      fileUrl: file.url,
                      fileKey: file.key,
                      roomId: roomId ?? null,
                      folderId: fixedFolderId ?? (folderId || null),
                    }),
                  });
                }
                setUploading(false);
                setOpen(false);
                toast.success(`Dodano ${res.length} plik${res.length === 1 ? "" : res.length < 5 ? "i" : "ów"}`);
                router.refresh();
              }}
              onUploadError={(err) => {
                setUploading(false);
                toast.error(`Błąd uploadu: ${err.message}`);
              }}
              appearance={{
                button:
                  "bg-gray-900 text-white hover:bg-gray-700 rounded-md text-sm font-medium px-4 py-2 h-auto w-full ut-uploading:opacity-70",
                allowedContent: "hidden",
                container: "w-full flex-col",
              }}
            />
            <p className="text-xs text-gray-400 text-center">Możesz wybrać do 10 plików naraz</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
