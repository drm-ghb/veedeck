"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "@/components/ui/icons";

export function TrialExpiredNav() {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/veedeck_ikona_vsg.svg" alt="veedeck" style={{ height: 28, width: 28, objectFit: "contain" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vee_black.png" alt="" style={{ height: 17, width: "auto", display: "block" }} />
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          color: "#6b7280",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 6,
        }}
      >
        <LogOut size={16} />
        Wyloguj
      </button>
    </nav>
  );
}
