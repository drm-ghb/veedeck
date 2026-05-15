"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function validatePassword(pwd: string) {
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

export default function ClientInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success">("loading");
  const [designerName, setDesignerName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/client-invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setStatus("invalid"); return; }
        setDesignerName(data.designerName);
        setInviteEmail(data.email);
        setEmail(data.email);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit() {
    setError("");
    if (!fullName.trim()) { setError("Podaj imię i nazwisko"); return; }
    if (!email.trim()) { setError("Podaj adres e-mail"); return; }
    if (!validatePassword(password)) {
      setError("Hasło musi mieć min. 8 znaków, zawierać małą i dużą literę oraz cyfrę");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/client-invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, email, password }),
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
            Ten link wygasł lub jest nieprawidłowy. Skontaktuj się z projektantem, aby wysłał nowe zaproszenie.
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
    <main className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Render<span className="text-primary dark:text-white">Flow</span>
          </CardTitle>
          <p className="text-center text-gray-500">
            <span className="font-medium text-foreground">{designerName}</span> zaprasza Cię do swojego panelu
          </p>
          {inviteEmail && (
            <p className="text-center text-xs text-muted-foreground">{inviteEmail}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">
                Imię i nazwisko
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="np. Anna Kowalska"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Numer telefonu (opcjonalne)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">
                E-mail
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                Hasło
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Hasło musi zawierać: min. 8 znaków, małą literę, wielką literę i cyfrę
              </p>
              {password && !validatePassword(password) && (
                <p className="text-xs text-destructive">Hasło nie spełnia wymagań bezpieczeństwa</p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving && <Loader2 size={15} className="animate-spin mr-2" />}
              Utwórz konto
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Masz już konto?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Zaloguj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
