"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info } from "@/components/ui/icons";
import ContractorProjectInfoSidebar, { type ProjectInfo } from "./ContractorProjectInfoSidebar";

interface ProjectCard {
  assignmentId: string;
  projectTitle: string;
  designerName: string;
  createdAt: string;
  info: ProjectInfo;
  unreadCount: number;
}

interface Props {
  cards: ProjectCard[];
}

export default function ContractorProjectCards({ cards }: Props) {
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
              {card.unreadCount > 0 && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary z-10" />
              )}
              <CardHeader>
                <CardTitle className="text-base leading-snug">{card.projectTitle}</CardTitle>
                <p className="text-sm text-muted-foreground">Projektant: {card.designerName}</p>
                <p className="text-sm text-muted-foreground">
                  Adres inwestycji: {[card.info.investmentStreet, card.info.investmentCity].filter(Boolean).join(", ") || "brak"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Przypisano: {new Date(card.createdAt).toLocaleDateString("pl-PL")}
                </p>
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => openInfo(e, card)}
                    className="text-xs h-7 gap-1.5"
                  >
                    <Info size={13} />
                    Informacje o projekcie
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
