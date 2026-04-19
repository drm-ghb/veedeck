import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, MessageSquare } from "lucide-react";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientGreeting from "@/components/share/ClientGreeting";
import ClientNameGate from "@/components/share/ClientNameGate";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";

export default async function ProjectHomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      renders: { where: { archived: false }, select: { id: true }, take: 1 },
      shoppingLists: { select: { id: true, name: true, shareToken: true } },
      user: { select: { clientLogoUrl: true, name: true, navMode: true, clientWelcomeMessage: true, showProfileName: true, showClientLogo: true, requireClientEmail: true, colorTheme: true } },
      discussion: { select: { id: true } },
    },
  });

  if (!project || project.archived) notFound();

  const hasRenders = project.renders.length > 0;
  const showRenderFlow = !project.hiddenModules.includes("renderflow");
  const showListy = !project.hiddenModules.includes("listy");
  const hasDyskusje = !!project.discussion;
  const isSidebar = project.user.navMode === "sidebar";
  const welcomeMessage = project.user.clientWelcomeMessage?.trim() || null;
  const greeting = project.clientName ? `Witamy, ${project.clientName}!` : "Witaj w projekcie!";

  const tilesContent = (
    <>
      <ClientGreeting projectShareToken={token} fallbackGreeting={greeting} className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2" />
      {welcomeMessage && (
        <p className="text-sm text-muted-foreground mb-4">{welcomeMessage}</p>
      )}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
        {project.title}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">

        {hasRenders && showRenderFlow && (
          <Link
            href={`/share/${token}`}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-primary">
              <Image src="/logo-dark.svg" alt="RenderFlow" width={40} height={40} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">RenderFlow</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Wizualizacje projektu</p>
            </div>
          </Link>
        )}

        {showListy && project.shoppingLists.map((list) => (
          <Link
            key={list.id}
            href={`/share/list/${list.shareToken}`}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-primary">
              <ShoppingCart size={32} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">Listy</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate w-full">{list.name}</p>
            </div>
          </Link>
        ))}

        {hasDyskusje && (
          <Link
            href={`/share/${token}/dyskusje`}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-primary">
              <MessageSquare size={32} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">Dyskusje</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Czat z projektantem</p>
            </div>
          </Link>
        )}

      </div>
    </>
  );

  const welcomeContent = (
    <div className="flex flex-col items-start justify-start">
      <ClientGreeting projectShareToken={token} fallbackGreeting={greeting} className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
      <p className="text-sm text-muted-foreground mt-2">
        {welcomeMessage ?? "Wybierz moduł z paska bocznego, aby przeglądać projekt."}
      </p>
    </div>
  );

  return (
    <ClientNameGate
      token={token}
      requireClientEmail={project.user.requireClientEmail}
      clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
      designerName={project.user.showProfileName ? project.user.name : null}
    >
    <ClientThemeApplier colorTheme={project.user.colorTheme} />
    <div className={`${isSidebar ? "h-screen" : "min-h-screen"} flex flex-col bg-muted/60`}>
      <ShareNavbar
        clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
        designerName={project.user.showProfileName ? project.user.name : null}
        projectShareToken={token}
      />

      {isSidebar ? (
        <div className="flex flex-1 min-h-0">
          <ShareSidebar
            token={token}
            discussionId={project.discussion?.id}
            showRenderFlow={showRenderFlow && hasRenders}
            showListy={showListy}
            showDyskusje={hasDyskusje}
            shoppingLists={project.shoppingLists}
          />
          <main className="flex-1 overflow-y-auto px-6 py-6 bg-background rounded-tl-2xl">
            {welcomeContent}
          </main>
        </div>
      ) : (
        <main className="flex-1 px-3 sm:px-6 py-4 sm:py-8">
          {tilesContent}
        </main>
      )}
    </div>
    </ClientNameGate>
  );
}
