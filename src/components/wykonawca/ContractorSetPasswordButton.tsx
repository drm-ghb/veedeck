"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export default function ContractorSetPasswordButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (pwd !== confirm) { toast.error(t.wykonawcy.setPasswordsNotMatch); return; }
    const valid = pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
    if (!valid) { toast.error(t.wykonawcy.setPasswordWeak); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/user/set-initial-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: pwd }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || t.wykonawcy.setPasswordError); return; }
      toast.success(t.wykonawcy.setPasswordSuccess);
      setOpen(false);
      setPwd(""); setConfirm("");
    } finally { setLoading(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t.wykonawcy.setPasswordTitle}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <KeyRound size={16} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.wykonawcy.setPasswordTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.wykonawcy.setPasswordDesc}
          </p>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.wykonawcy.setPasswordNew}</label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder={t.wykonawcy.setPasswordMinPlaceholder}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.wykonawcy.setPasswordRepeat}</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t.wykonawcy.setPasswordRequirements}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={loading || !pwd || !confirm}>
              {loading ? t.wykonawcy.settingPassword : t.wykonawcy.setPasswordTitle}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
