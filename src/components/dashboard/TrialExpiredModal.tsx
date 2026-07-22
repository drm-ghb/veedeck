"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Lock, Payments } from "@/components/ui/icons";

export default function TrialExpiredModal() {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: "#fff" }}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Zamknij"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Lock size={26} className="text-violet-600" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Twój trial dobiegł końca
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Platforma przeszła w tryb <span className="font-semibold text-gray-700">tylko do odczytu</span>.
              Możesz przeglądać swoją zawartość i pobierać pliki, ale edytowanie i tworzenie nowych elementów jest zablokowane.
            </p>
          </div>

          <div className="w-full rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-violet-700 text-left">
            Aby kontynuować pracę, ulepsz swój plan w&nbsp;
            <span className="font-semibold">Ustawienia → Plan i rozliczenia</span>.
          </div>

          <button
            onClick={() => { setOpen(false); router.push("/ustawienia/plan-i-rozliczenia"); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors"
          >
            <Payments size={16} />
            Ulepsz plan
          </button>

          <button
            onClick={() => setOpen(false)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Przeglądaj w trybie tylko do odczytu
          </button>
        </div>
      </div>
    </div>
  );
}
