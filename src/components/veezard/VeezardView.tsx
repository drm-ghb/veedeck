"use client";

import { useState } from "react";
import { VeezardIcon, ViewInAr, Sparkles, Image as ImageIcon } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import Generator3DView from "./Generator3DView";
import RenderBoosterView from "./RenderBoosterView";

interface Model3D {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string | null;
  urlGlb: string | null;
  urlObj: string | null;
  urlStl: string | null;
  urlFbx: string | null;
  createdAt: string;
}

type VeezardTab = "generator3d" | "renderbooster" | "moodboard";

export default function VeezardView({ initialModels }: { initialModels: Model3D[] }) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<VeezardTab>("generator3d");

  const TABS: { id: VeezardTab; label: string; icon: React.ReactNode; soon?: boolean }[] = [
    { id: "generator3d",   label: "Generator 3D",  icon: <ViewInAr size={15} /> },
    { id: "renderbooster", label: "RenderBooster", icon: <Sparkles size={15} /> },
    { id: "moodboard",     label: "Moodboard",     icon: <ImageIcon size={15} />, soon: true },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <VeezardIcon size={20} />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">Veezard</h1>
        </div>
      </div>

      {/* Top-level tabs */}
      <div className="flex border-b border-border px-6 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.soon && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-muted text-muted-foreground ml-0.5">
                {t.veezard.soon}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "generator3d" && (
          <Generator3DView initialModels={initialModels} hideHeader />
        )}
        {activeTab === "renderbooster" && <RenderBoosterView />}
        {activeTab === "moodboard" && <ComingSoon label="Moodboard" />}
      </div>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground py-24">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Sparkles size={32} className="text-primary/40" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm mt-1">{t.veezard.comingSoon}</p>
      </div>
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{t.veezard.soon}</span>
    </div>
  );
}
