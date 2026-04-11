"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function CopyLinkButton({ url }: { url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      title={t.common.copyLink}
      className="ml-1.5 text-gray-400 hover:text-gray-700 transition-colors"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}
