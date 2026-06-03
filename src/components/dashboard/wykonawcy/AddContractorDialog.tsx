"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TRADE_OPTIONS = [
  { value: "malarz", label: "Malarz" },
  { value: "hydraulik", label: "Hydraulik" },
  { value: "elektryk", label: "Elektryk" },
  { value: "firma wykończeniowa", label: "Firma wykończeniowa" },
  { value: "inne", label: "Inne" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function AddContractorDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [trade, setTrade] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setName(""); setCompany(""); setTrade(""); setEmail(""); setPhone("");
    setCreateAccount(false); setLogin(""); setPassword("");
  }

  async function handleSubmit() {
    if (!company.trim()) {
      toast.error("Firma jest wymagana");
      return;
    }
    if (createAccount && (!login.trim() || !password.trim())) {
      toast.error("Podaj login i hasło dla konta wykonawcy");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, trade, email, phone, createAccount, login, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Błąd podczas dodawania wykonawcy");
        return;
      }
      toast.success("Wykonawca dodany");
      onOpenChange(false);
      reset();
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj wykonawcę</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Firma *</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nazwa firmy" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
          <div className="space-y-1">
            <Label>Imię i nazwisko</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" />
          </div>
          <div className="space-y-1">
            <Label>Specjalność</Label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Wybierz specjalność</option>
              {TRADE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@firma.pl" />
            </div>
            <div className="space-y-1">
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48 123 456 789" />
            </div>
          </div>

          <div className="border border-border rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(e) => setCreateAccount(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm font-medium">Utwórz konto dostępowe dla wykonawcy</span>
            </label>
            {createAccount && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Login</Label>
                  <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="jan.kowalski" />
                </div>
                <div className="space-y-1">
                  <Label>Hasło</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Dodawanie…" : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
