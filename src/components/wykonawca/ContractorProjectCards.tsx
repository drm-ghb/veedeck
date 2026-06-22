"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Pin, MessageSquare } from "@/components/ui/icons";
import ContractorProjectInfoSidebar, { type ProjectInfo } from "./ContractorProjectInfoSidebar";
import { useT } from "@/lib/i18n";

interface ProjectCard {
  assignmentId: string;
  projectTitle: string;
  designerName: string;
  createdAt: string;
  info: ProjectInfo;
  unreadCount: number;
  unreadPinCount: number;
}

interface Props {
  cards: ProjectCard[];
}

export default function ContractorProjectCards({ cards }: Props) {
  const t = useT();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<ProjectCard | null>(null);

  function openInfo(e: React.MouseEvent, card: ProjectCard) {
    e.preventDefault();
    setActiveCard(card);
    setSidebarOpen(true);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.assignmentId} href={`/wykonawca/projekty/${card.assignmentId}`}>
            <Card className="relative hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer h-full">
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                {card.unreadPinCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">
                    <Pin size={11} />
                    {t.wykonawcy.newPins} {card.unreadPinCount}
                  </span>
                )}
                {card.unreadCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <MessageSquare size={11} />
                    {t.wykonawcy.unread} {card.unreadCount}
                  </span>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-base leading-snug">{card.projectTitle}</CardTitle>
                <p className="text-sm text-muted-foreground">{t.wykonawcy.designerLabel} {card.designerName}</p>
                <p className="text-sm text-muted-foreground">
                  {t.wykonawcy.investmentAddressLabel} {[card.info.investmentStreet, card.info.investmentCity].filter(Boolean).join(", ") || t.wykonawcy.noneAddress}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.wykonawcy.assignedLabel} {new Date(card.createdAt).toLocaleDateString()}
                </p>
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => openInfo(e, card)}
                    className="text-xs h-7 gap-1.5"
                  >
                    <Info size={13} />
                    {t.wykonawcy.projectInfoBtn}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <ContractorProjectInfoSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        projectTitle={activeCard?.projectTitle ?? ""}
        info={activeCard?.info ?? {}}
      />
    </>
  );
}
