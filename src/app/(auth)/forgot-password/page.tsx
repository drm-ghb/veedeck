"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Placeholder – reset password functionality not yet implemented
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
    toast.success(t.auth.resetSuccess);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_vee.png" alt="veedeck" className="h-7 w-7 shrink-0 object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vee_black.png" alt="veedeck" className="dark:hidden shrink-0" style={{ height: "17px", width: "auto" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/veedeckicon.png" alt="" className="hidden dark:block shrink-0" style={{ height: "17px", width: "auto" }} />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {t.auth.resetTitle}
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.auth.resetSentDesc}
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">{t.auth.backToLogin}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="twoj@email.pl"
                />
              </div>
              <div className="pt-2 space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t.auth.resetSending : t.auth.resetSend}
                </Button>
                <Button type="button" variant="ghost" className="w-full" asChild>
                  <Link href="/login">{t.auth.backToLogin}</Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
