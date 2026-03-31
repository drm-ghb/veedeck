import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ListyView from "@/components/listy/ListyView";

export default async function ListyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lists = await prisma.shoppingList.findMany({
    where: { userId: session.user.id },
    include: { project: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <ListyView lists={lists.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), shareToken: l.shareToken }))} />;
}
