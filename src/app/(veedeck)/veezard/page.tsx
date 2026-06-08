import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { redirect } from "next/navigation";
import { VeezardIcon } from "@/components/ui/icons";
import VeezardView from "@/components/veezard/VeezardView";

const VEEZARD_BETA_EMAILS = ["bigdan799@gmail.com"];

export default async function VeezardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const hasBetaAccess = VEEZARD_BETA_EMAILS.includes(session.user.email ?? "");

  if (!hasBetaAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 px-6 text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <VeezardIcon size={32} />
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
          <h1 className="text-2xl font-bold text-foreground">Veezard</h1>
          <p className="text-muted-foreground leading-relaxed">
            Twój osobisty czarodziej AI. Oszczędzaj czas dzięki magii sztucznej inteligencji.
          </p>
          <span className="mx-auto mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
            Już wkrótce!
          </span>
        </div>
      </div>
    );
  }

  const userId = getWorkspaceUserId(session);
  const models = await prisma.model3D.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <VeezardView
      initialModels={models.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        thumbnailUrl: m.thumbnailUrl,
        urlGlb: m.urlGlb,
        urlObj: m.urlObj,
        urlStl: m.urlStl,
        urlFbx: m.urlFbx,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
