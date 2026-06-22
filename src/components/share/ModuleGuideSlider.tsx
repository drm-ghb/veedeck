"use client";

import { useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, X,
  PushPin, LocalMall, Comment, ChatBubble,
  Pin, Check, ExternalLink, History,
  Paperclip, Mic, CornerDownLeft,
} from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface Feature {
  icon: React.ReactNode;
  label: string;
  desc: string;
}

interface ModuleInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  shortDesc: string;
  fullDesc: {
    general: string;
    designerTitle: string;
    designerSteps: string[];
    clientTitle: string;
    clientSteps: string[];
    features: Feature[];
  };
}

interface Props {
  hiddenModules: string[];
  hasDiscussion: boolean;
}

export default function ModuleGuideSlider({ hiddenModules, hasDiscussion }: Props) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleInfo | null>(null);

  const ALL_MODULES: ModuleInfo[] = [
    {
      id: "renderflow",
      name: "ProjectFlow",
      icon: <PushPin size={28} />,
      shortDesc: t.guide.rfShortDesc,
      fullDesc: {
        general: t.guide.rfGeneral,
        designerTitle: t.guide.designerTitle,
        designerSteps: [t.guide.rfD1, t.guide.rfD2, t.guide.rfD3, t.guide.rfD4],
        clientTitle: t.guide.clientTitle,
        clientSteps: [t.guide.rfC1, t.guide.rfC2, t.guide.rfC3, t.guide.rfC4],
        features: [
          { icon: <Pin size={18} />, label: t.guide.rfF1Label, desc: t.guide.rfF1Desc },
          { icon: <ChatBubble size={18} />, label: t.guide.rfF2Label, desc: t.guide.rfF2Desc },
          { icon: <Check size={18} />, label: t.guide.rfF3Label, desc: t.guide.rfF3Desc },
          { icon: <History size={18} />, label: t.guide.rfF4Label, desc: t.guide.rfF4Desc },
        ],
      },
    },
    {
      id: "listy",
      name: t.share.lists,
      icon: <LocalMall size={28} />,
      shortDesc: t.guide.lstShortDesc,
      fullDesc: {
        general: t.guide.lstGeneral,
        designerTitle: t.guide.designerTitle,
        designerSteps: [t.guide.lstD1, t.guide.lstD2, t.guide.lstD3, t.guide.lstD4],
        clientTitle: t.guide.clientTitle,
        clientSteps: [t.guide.lstC1, t.guide.lstC2, t.guide.lstC3, t.guide.lstC4],
        features: [
          { icon: <Check size={18} />, label: t.guide.lstF1Label, desc: t.guide.lstF1Desc },
          { icon: <X size={18} />, label: t.guide.lstF2Label, desc: t.guide.lstF2Desc },
          { icon: <Comment size={18} />, label: t.guide.lstF3Label, desc: t.guide.lstF3Desc },
          { icon: <ExternalLink size={18} />, label: t.guide.lstF4Label, desc: t.guide.lstF4Desc },
        ],
      },
    },
    {
      id: "dyskusje",
      name: t.share.discussions,
      icon: <ChatBubble size={28} />,
      shortDesc: t.guide.dyskShortDesc,
      fullDesc: {
        general: t.guide.dyskGeneral,
        designerTitle: t.guide.designerTitle,
        designerSteps: [t.guide.dyskD1, t.guide.dyskD2, t.guide.dyskD3],
        clientTitle: t.guide.clientTitle,
        clientSteps: [t.guide.dyskC1, t.guide.dyskC2, t.guide.dyskC3, t.guide.dyskC4],
        features: [
          { icon: <Paperclip size={18} />, label: t.guide.dyskF1Label, desc: t.guide.dyskF1Desc },
          { icon: <Mic size={18} />, label: t.guide.dyskF2Label, desc: t.guide.dyskF2Desc },
          { icon: <CornerDownLeft size={18} />, label: t.guide.dyskF3Label, desc: t.guide.dyskF3Desc },
        ],
      },
    },
  ];

  const visibleModules = ALL_MODULES.filter((m) => {
    if (hiddenModules.includes(m.id)) return false;
    if (m.id === "dyskusje" && !hasDiscussion) return false;
    return true;
  });

  if (visibleModules.length === 0) return null;

  function scrollBy(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  }

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.guide.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t.guide.subtitle}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scrollBy("left")}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy("right")}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Slider */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
      >
        {visibleModules.map((mod) => (
          <div
            key={mod.id}
            className="flex-shrink-0 w-[calc(100%-16px)] sm:w-72 bg-card border border-border rounded-2xl p-5 flex flex-col gap-3"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {mod.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{mod.name}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mod.shortDesc}</p>
            </div>
            <button
              onClick={() => setSelectedModule(mod)}
              className="self-start flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              {t.guide.seeMore} <ChevronRight size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Dialog */}
      {selectedModule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedModule(null); }}
        >
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Dialog header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-background rounded-t-2xl z-10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                {selectedModule.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-gray-100">{selectedModule.name}</p>
                <p className="text-xs text-muted-foreground">{t.guide.moduleInstructions}</p>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* General */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.guide.generalInfo}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedModule.fullDesc.general}</p>
              </div>

              {/* Designer steps */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{selectedModule.fullDesc.designerTitle}</p>
                <ul className="space-y-1.5">
                  {selectedModule.fullDesc.designerSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Client steps */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{selectedModule.fullDesc.clientTitle}</p>
                <ul className="space-y-1.5">
                  {selectedModule.fullDesc.clientSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={11} className="text-primary" />
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature icons */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t.guide.featuresTitle}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedModule.fullDesc.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-primary flex-shrink-0">
                        {f.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{f.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
