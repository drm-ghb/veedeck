"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ContractorSetPasswordButton() {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (pwd !== confirm) { toast.error("Hasła nie są identyczne"); return; }
    const valid = pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
    if (!valid) { toast.error("Hasło musi mieć min. 8 znaków, małą i dużą literę oraz cyfrę"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/user/set-initial-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: pwd }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Nie udało się ustawić hasła"); return; }
      toast.success("Hasło ustawione. Możesz teraz logować się bezpośrednio.");
      setOpen(false);
      setPwd(""); setConfirm("");
    } finally { setLoading(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ustaw hasło"
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <KeyRound size={16} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ustaw hasło</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ustaw hasło, żeby logować się bezpośrednio bez linku dostępowego.
          </p>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nowe hasło</label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="min. 8 znaków"
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
              <label className="text-sm font-medium">Powtórz hasło</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <p className="text-xs text-muted-foreground">Min. 8 znaków, mała i duża litera oraz cyfra.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={loading || !pwd || !confirm}>
              {loading ? "Ustawianie…" : "Ustaw hasło"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
