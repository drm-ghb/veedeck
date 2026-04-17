"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CopyClientLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" onClick={copy}>
      {copied ? <Check size={15} className="text-green-500" /> : <Link2 size={15} />}
      {copied ? "Skopiowano!" : "Kopiuj link do panelu"}
    </Button>
  );
}
