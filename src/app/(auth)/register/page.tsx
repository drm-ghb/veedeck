"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function validatePassword(pwd: string) {
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePassword(password)) {
      toast.error("Hasło nie spełnia wymagań bezpieczeństwa");
      return;
    }
    if (!privacyAccepted) {
      toast.error("Musisz zaakceptować Politykę prywatności i Regulamin");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: fullName.trim(), name: companyName.trim() || null, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Błąd rejestracji");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/panel-glowny");
    router.refresh();
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Render<span className="text-primary dark:text-white">Flow</span>
          </CardTitle>
          <p className="text-center text-gray-500">Utwórz konto projektanta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Imię i nazwisko</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="np. Jan Kowalski" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Nazwa firmy (opcjonalne)</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="np. Studio Wnętrz Kowalski" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Hasło</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-9" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Hasło musi zawierać: min. 8 znaków, małą literę, wielką literę i cyfrę</p>
              {password && !validatePassword(password) && (
                <p className="text-xs text-destructive">Hasło nie spełnia wymagań bezpieczeństwa</p>
              )}
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" id="privacy" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary flex-shrink-0" />
              <label htmlFor="privacy" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Potwierdzam, że zapoznałem się z Polityką prywatności i Regulaminem
              </label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !privacyAccepted}>
              {loading ? "Rejestracja..." : "Zarejestruj się"}
            </Button>
          </form>
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
