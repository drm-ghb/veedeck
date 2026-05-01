"use client";

import { useState } from "react";
import { signIn, signOut, getSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

type Mode = "login" | "register";

export default function LoginPage() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function switchMode(next: Mode) {
    setMode(next);
    setName("");
    setEmail("");
    setPassword("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error(t.auth.invalidCredentials);
    } else {
      const session = await getSession();
      if ((session?.user as any)?.isAdmin) {
        await signOut({ redirect: false });
        toast.error("Konta administracyjne logują się przez /admin");
        setLoading(false);
        return;
      }
      if ((session?.user as any)?.role === "client") {
        router.push("/client");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || t.auth.registerError);
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen">
      {/* Left – branding */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 bg-[#0f0f0f]">
        <div className="flex items-center gap-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veedeck_ikona.png" alt="veedeck" className="h-10 w-10 shrink-0 object-contain rounded-xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veedeckicon.png" alt="veedeck" className="shrink-0" style={{ height: "22px", width: "auto" }} />
        </div>
        <p
          className="text-2xl font-bold text-white mb-6 tracking-wide"
          style={{ fontFamily: "var(--font-lato)" }}
        >
          {t.auth.slogan}
        </p>
        <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
          {t.auth.tagline}{" "}
          <span className="text-white">{t.auth.taglineSub}</span>
        </p>
      </div>

      {/* Right – form */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 bg-background">
        {/* Mobile branding */}
        <div className="lg:hidden text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/veedeck_ikona.png" alt="veedeck" className="h-7 w-7 shrink-0 object-contain rounded-lg" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vee_black.png" alt="veedeck" className="dark:hidden shrink-0" style={{ height: "17px", width: "auto" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/veedeckicon.png" alt="" className="hidden dark:block shrink-0" style={{ height: "17px", width: "auto" }} />
          </div>
          <p
            className="text-lg font-bold tracking-wide text-muted-foreground"
            style={{ fontFamily: "var(--font-lato)" }}
          >
            {t.auth.slogan}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t.auth.tagline} {t.auth.taglineSub}
          </p>
        </div>

        <Card className="w-full max-w-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/veedeck_ikona.png" alt="veedeck" className="h-7 w-7 shrink-0 object-contain rounded-lg" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vee_black.png" alt="veedeck" className="dark:hidden shrink-0" style={{ height: "17px", width: "auto" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/veedeckicon.png" alt="" className="hidden dark:block shrink-0" style={{ height: "17px", width: "auto" }} />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
            </p>
          </CardHeader>
          <CardContent>
            {/* Google sign-in */}
            <div className="mb-4">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t.auth.googleLogin}
              </Button>
            </div>

            <div className="relative mb-4">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                lub
              </span>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email lub login</Label>
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t.auth.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="pt-2 space-y-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t.auth.loggingIn : t.auth.loginBtn}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => switchMode("register")}
                  >
                    {t.auth.createAccount}
                  </Button>
                </div>
                <div className="text-center pt-1">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    {t.auth.forgotPassword}
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t.auth.name}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t.auth.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t.auth.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">{t.auth.minChars}</p>
                </div>
                <div className="pt-2 space-y-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t.auth.registering : t.auth.registerBtn}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => switchMode("login")}
                  >
                    {t.auth.haveAccount}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
