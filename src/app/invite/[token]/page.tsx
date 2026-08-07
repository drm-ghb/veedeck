"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

type InviteData = {
  email: string;
  designerName: string;
  workspaceName: string;
  type: string;
  hasExistingAccount: boolean;
  existingName: string | null;
  existingAvatarUrl: string | null;
};

export default function InvitePage() {
  const t = useT();
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success">("loading");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
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
        setInviteData(data);
        if (data.existingName) setName(data.existingName);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit() {
    setError("");

    const isJoin = inviteData?.hasExistingAccount;

    if (!isJoin) {
      if (!name.trim()) { setError(t.invite.enterYourName); return; }
      if (password.length < 6) { setError(t.invite.passwordMinLength); return; }
      if (password !== password2) { setError(t.invite.passwordsMismatch); return; }
    }

    setSaving(true);
    const body: Record<string, string> = { name };
    if (!isJoin) body.password = password;

    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error || t.invite.genericError); return; }
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
          <h1 className="text-xl font-semibold mb-2">{t.invite.invalidTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {t.invite.invalidDesc}
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
          <h1 className="text-xl font-semibold mb-2">
            {inviteData?.hasExistingAccount ? t.invite.joinedWorkspace : t.invite.accountCreated}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t.invite.redirectingToLogin}
          </p>
        </div>
      </div>
    );
  }

  const isJoin = inviteData?.hasExistingAccount;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold mb-1">
            {isJoin ? t.invite.joinTitle.replace("{name}", inviteData?.workspaceName ?? "") : t.invite.acceptTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{inviteData?.designerName}</span>{" "}
            {isJoin ? t.invite.invitesWorkspace : t.invite.invitesCollaboration}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{inviteData?.email}</p>
        </div>

        {isJoin && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
            {t.invite.existingAccountNote}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              {isJoin ? t.invite.displayNameLabel : t.auth.fullName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.auth.fullNamePlaceholder}
              onKeyDown={(e) => isJoin && e.key === "Enter" && handleSubmit()}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
          </div>

          {!isJoin && (
            <>
              <div>
                <label className="text-sm font-medium block mb-1">{t.auth.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.invite.passwordPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">{t.auth.repeatPasswordLabel}</label>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder={t.auth.repeatPasswordLabel}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {isJoin ? t.invite.joinTitle.replace("{name}", inviteData?.workspaceName ?? "") : t.invite.createAccount}
          </button>
        </div>
      </div>
    </div>
  );
}
