"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success">("loading");
  const [designerName, setDesignerName] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setStatus("invalid"); return; }
        setDesignerName(data.designerName);
        setEmail(data.email);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit() {
    setError("");
    if (!name.trim()) { setError("Podaj swoje imię i nazwisko"); return; }
    if (password.length < 6) { setError("Hasło musi mieć co najmniej 6 znaków"); return; }
    if (password !== password2) { setError("Hasła nie są identyczne"); return; }

    setSaving(true);
    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, name }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error || "Wystąpił błąd"); return; }
    setStatus("success");
    setTimeout(() => router.push("/login"), 3000);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle size={48} className="text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Zaproszenie nieważne</h1>
          <p className="text-muted-foreground text-sm">
            Ten link wygasł lub jest nieprawidłowy. Poproś projektanta o ponowne wysłanie zaproszenia.
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Konto utworzone!</h1>
          <p className="text-muted-foreground text-sm">
            Za chwilę zostaniesz przekierowany do strony logowania.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold mb-1">Przyjmij zaproszenie</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{designerName}</span> zaprasza Cię do współpracy
          </p>
          <p className="text-xs text-muted-foreground mt-1">{email}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Imię i nazwisko</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Anna Kowalska"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 znaków"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Powtórz hasło</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Powtórz hasło"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Utwórz konto
          </button>
        </div>
      </div>
    </div>
  );
}
