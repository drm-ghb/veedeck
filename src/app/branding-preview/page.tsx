import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";
import type { CustomThemeColors } from "@/lib/theme";

export default async function BrandingPreviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      clientLogoUrl: true,
      showClientLogo: true,
      showProfileName: true,
      clientWelcomeMessage: true,
      colorTheme: true,
      customTheme: true,
    },
  });
  if (!user) redirect("/login");

  const clientLogoUrl = user.showClientLogo ? user.clientLogoUrl : null;
  const designerName = user.showProfileName ? user.name : null;
  const welcomeMessage =
    user.clientWelcomeMessage?.trim() ||
    "Wybierz moduł z paska bocznego, aby przeglądać projekt.";

  return (
    <>
      <ClientThemeApplier
        colorTheme={user.colorTheme}
        customTheme={user.customTheme as CustomThemeColors | null}
      />
      <div className="h-dvh flex flex-col" style={{ backgroundColor: "var(--sidebar)" }}>
        <ShareNavbar
          clientLogoUrl={clientLogoUrl}
          designerName={designerName}
        />
        <div className="flex flex-1 min-h-0" style={{ backgroundColor: "var(--sidebar)" }}>
          <ShareSidebar
            token="__preview__"
            showProjectFlow
            showListy
            showDyskusje
            shoppingLists={[]}
          />
          <main className="flex-1 overflow-y-auto px-6 py-6 bg-background rounded-tl-2xl">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Witaj w projekcie!
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
              {welcomeMessage}
            </p>
          </main>
        </div>
      </div>
    </>
  );
}
