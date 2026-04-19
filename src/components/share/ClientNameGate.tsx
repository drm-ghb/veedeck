"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  token: string;
  requireClientEmail: boolean;
  clientLogoUrl?: string | null;
  designerName?: string | null;
  children: React.ReactNode;
}

export default function ClientNameGate({ token, requireClientEmail, clientLogoUrl, designerName, children }: Props) {
  const [nameSet, setNameSet] = useState<boolean | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`veedeck-author-${token}`);
    setNameSet(!!saved);
  }, [token]);

  function handleSetName() {
    if (!nameInput.trim()) return;
    if (requireClientEmail && !emailInput.trim()) return;
    localStorage.setItem(`veedeck-author-${token}`, nameInput.trim());
    if (emailInput.trim()) localStorage.setItem(`veedeck-author-email-${token}`, emailInput.trim());
    // Emit storage event so other components (navbar, greeting) pick up the change
    window.dispatchEvent(new Event("storage"));
    setNameSet(true);
  }

  if (nameSet === null) return null;

  if (!nameSet) return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          {clientLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clientLogoUrl} alt="Logo" className="h-10 object-contain" />
          ) : (
            <>
              <Image src="/logo.svg" alt="RenderFlow" width={32} height={32} className="block dark:hidden" />
              <Image src="/logo-dark.svg" alt="RenderFlow" width={32} height={32} className="hidden dark:block" />
            </>
          )}
          {designerName && (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{designerName}</h1>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Podaj swoje imię aby przeglądać projekt</p>
        <div className="space-y-2">
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Twoje imię"
            onKeyDown={(e) => e.key === "Enter" && !requireClientEmail && handleSetName()}
            autoFocus
          />
          {requireClientEmail && (
            <Input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Twój email"
              onKeyDown={(e) => e.key === "Enter" && handleSetName()}
            />
          )}
          <Button
            onClick={handleSetName}
            disabled={!nameInput.trim() || (requireClientEmail && !emailInput.trim())}
            className="w-full"
          >
            Dalej
          </Button>
        </div>
      </div>
    </div>
  );

  return <>{children}</>;
}
