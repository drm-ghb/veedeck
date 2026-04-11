"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export default function CompleteProfilePage() {
  const t = useT();
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error(t.auth.nameMinChars);
      return;
    }
    setLoading(true);

    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || t.common.error);
      setLoading(false);
      return;
    }

    // Refresh JWT so needsNameSetup is cleared
    await update();
    router.push("/home");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <CardTitle
            className="text-2xl text-center"
            style={{ fontFamily: "var(--font-story-script)" }}
          >
            veedeck
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {t.auth.completeProfileTitle}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t.auth.yourName}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.auth.namePlaceholder}
                required
                autoFocus
                minLength={2}
              />
              <p className="text-xs text-muted-foreground">
                {t.auth.nameHint}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.auth.saving : t.auth.next}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
