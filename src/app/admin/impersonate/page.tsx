"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function ImpersonatePage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setError("Brak tokenu."); return; }
    signIn("credentials", { impersonateToken: token, redirect: true, callbackUrl: "/panel-glowny" })
      .then((res) => {
        if (res?.error) setError("Token wygasł lub jest nieprawidłowy.");
      });
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <a href="/admin/users" className="text-white/50 hover:text-white text-sm underline">Wróć do listy użytkowników</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
      <p className="text-white/40 text-sm animate-pulse">Logowanie jako użytkownik…</p>
    </div>
  );
}
