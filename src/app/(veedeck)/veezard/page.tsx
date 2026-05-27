import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { redirect } from "next/navigation";
import VeezardView from "@/components/veezard/VeezardView";

export default async function VeezardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
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
