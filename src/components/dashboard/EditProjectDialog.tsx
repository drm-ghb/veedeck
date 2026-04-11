"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface EditProjectDialogProps {
  project: {
    id: string;
    title: string;
    clientName?: string | null;
    clientEmail?: string | null;
    description?: string | null;
    sharePassword?: string | null;
    shareExpiresAt?: string | null;
    clientCanUpload?: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const [title, setTitle] = useState(project.title);
  const [clientName, setClientName] = useState(project.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(project.clientEmail ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [sharePassword, setSharePassword] = useState(project.sharePassword ?? "");
  const [shareExpiresAt, setShareExpiresAt] = useState(
    project.shareExpiresAt ? new Date(project.shareExpiresAt).toISOString().slice(0, 10) : ""
  );
  const [clientCanUpload, setClientCanUpload] = useState(project.clientCanUpload ?? false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (open) {
      setTitle(project.title);
      setClientName(project.clientName ?? "");
      setClientEmail(project.clientEmail ?? "");
      setDescription(project.description ?? "");
      setSharePassword(project.sharePassword ?? "");
      setShareExpiresAt(project.shareExpiresAt ? new Date(project.shareExpiresAt).toISOString().slice(0, 10) : "");
      setClientCanUpload(project.clientCanUpload ?? false);
    }
  }, [open, project]);

  async function handleSave() {
    if (!title.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          clientName: clientName.trim() || null,
          clientEmail: clientEmail.trim() || null,
          description: description.trim() || null,
          sharePassword: sharePassword.trim() || null,
          shareExpiresAt: shareExpiresAt || null,
          clientCanUpload,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(t.projekty.projectUpdated);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t.projekty.projectUpdateError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.projekty.editProject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">{t.projekty.projectNameLabel}</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-clientName">{t.projekty.clientNameLabel}</Label>
              <Input
                id="edit-clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t.projekty.clientNamePlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-clientEmail">{t.projekty.clientEmailLabel}</Label>
              <Input
                id="edit-clientEmail"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="jan@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">{t.projekty.descriptionLabel}</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sharePassword">{t.projekty.passwordLabel}</Label>
              <Input
                id="edit-sharePassword"
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                placeholder={t.projekty.passwordPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-shareExpiresAt">{t.projekty.expiresLabel}</Label>
              <Input
                id="edit-shareExpiresAt"
                type="date"
                value={shareExpiresAt}
                onChange={(e) => setShareExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={clientCanUpload}
                onChange={(e) => setClientCanUpload(e.target.checked)}
                className="sr-only"
              />
              <div
                onClick={() => setClientCanUpload((v) => !v)}
                className={`w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer ${clientCanUpload ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                <span className={`block w-4 h-4 bg-white dark:bg-gray-900 rounded-full shadow-sm transition-transform duration-200 mt-0.5 ${clientCanUpload ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium leading-none">{t.projekty.clientCanUploadLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.projekty.clientCanUploadHint}</p>
            </div>
          </label>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="button" disabled={loading || !title.trim()} onClick={handleSave}>
              {loading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
