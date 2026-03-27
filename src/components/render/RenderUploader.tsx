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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RenderUploaderProps {
  projectId: string;
  roomId?: string;
  compact?: boolean;
}

export default function RenderUploader({ projectId, roomId, compact }: RenderUploaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (uploading) return;
    setOpen(next);
    if (!next) setTitle("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size={compact ? "icon-sm" : "default"} variant={compact ? "ghost" : "default"} title="Dodaj plik" />}>
        {compact ? "+" : "+ Dodaj plik"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Dodaj plik</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="render-title">Tytuł pliku</Label>
            <Input
              id="render-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Np. Salon – wersja 1"
              disabled={uploading}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Plik</Label>
            <UploadButton<OurFileRouter, "renderUploader">
              endpoint="renderUploader"
              content={{
                button: uploading ? "Wgrywanie..." : "Wybierz plik",
                allowedContent: "",
              }}
              onUploadBegin={() => setUploading(true)}
              onClientUploadComplete={async (res) => {
                for (const file of res) {
                  const name = title.trim() || file.name.replace(/\.[^.]+$/, "");
                  await fetch("/api/renders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      projectId,
                      name,
                      fileUrl: file.url,
                      fileKey: file.key,
                      roomId: roomId ?? null,
                    }),
                  });
                }
                setUploading(false);
                setTitle("");
                setOpen(false);
                toast.success(`Dodano ${res.length} plik${res.length === 1 ? "" : "i"}`);
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
