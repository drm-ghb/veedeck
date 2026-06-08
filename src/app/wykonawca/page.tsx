import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Engineering } from "@/components/ui/icons";
import ContractorProjectCards from "@/components/wykonawca/ContractorProjectCards";

export default async function ContractorHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
  });

  if (!contractor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Engineering size={48} className="text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">Nie masz przypisanych projektów</p>
        <p className="text-sm text-muted-foreground/60">Skontaktuj się z projektantem, aby uzyskać dostęp do projektów.</p>
      </div>
    );
  }

  const assignments = await prisma.contractorAssignment.findMany({
    where: { contractorId: contractor.id, archived: false },
    select: {
      id: true,
      createdAt: true,
      investmentStreet: true,
      investmentCity: true,
      investmentPostalCode: true,
      investmentCountry: true,
      designerContactName: true,
      designerContactPhone: true,
      investorContactName: true,
      investorContactPhone: true,
      projectNotes: true,
      project: { select: { id: true, title: true } },
      contractor: { select: { designer: { select: { name: true, fullName: true } } } },
      folders: {
        where: { parentId: null },
        select: {
          files: {
            select: {
              _count: { select: { comments: { where: { viewedByContractor: false, authorRole: "designer", posX: null } } } },
              comments: {
                select: {
                  posX: true,
                  authorRole: true,
                  viewedByContractor: true,
                  _count: { select: { replies: { where: { viewedByContractor: false } } } },
                },
              },
            },
          },
          subfolders: {
            select: {
              files: {
                select: {
                  _count: { select: { comments: { where: { viewedByContractor: false, authorRole: "designer", posX: null } } } },
                  comments: {
                    select: {
                      posX: true,
                      authorRole: true,
                      viewedByContractor: true,
                      _count: { select: { replies: { where: { viewedByContractor: false } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Engineering size={48} className="text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">Nie masz przypisanych projektów</p>
        <p className="text-sm text-muted-foreground/60">Skontaktuj się z projektantem, aby uzyskać dostęp do projektów.</p>
      </div>
    );
  }

  if (assignments.length === 1) {
    redirect(`/wykonawca/projekty/${assignments[0].id}`);
  }

  const cards = assignments.map((a) => {
    const unreadCount = a.folders.reduce((sum, f) => {
      const directUnread = f.files.reduce(
        (s, file) => s + file._count.comments + file.comments.filter((c) => c.posX == null).reduce((s2, c) => s2 + c._count.replies, 0),
        0
      );
      const subUnread = f.subfolders.reduce(
        (s, sub) => s + sub.files.reduce(
          (s2, file) => s2 + file._count.comments + file.comments.filter((c) => c.posX == null).reduce((s3, c) => s3 + c._count.replies, 0),
          0
        ),
        0
      );
      return sum + directUnread + subUnread;
    }, 0);

    const unreadPinCount = a.folders.reduce((sum, f) => {
      const directPins = f.files.reduce(
        (s, file) => s + file.comments.filter((c) => c.posX != null && c.authorRole === "designer" && !c.viewedByContractor).length,
        0
      );
      const subPins = f.subfolders.reduce(
        (s, sub) => s + sub.files.reduce(
          (s2, file) => s2 + file.comments.filter((c) => c.posX != null && c.authorRole === "designer" && !c.viewedByContractor).length,
          0
        ),
        0
      );
      return sum + directPins + subPins;
    }, 0);

    return {
      assignmentId: a.id,
      projectTitle: a.project.title,
      designerName: a.contractor.designer.name ?? a.contractor.designer.fullName ?? "Projektant",
      createdAt: a.createdAt.toISOString(),
      unreadCount,
      unreadPinCount,
      info: {
        investmentStreet: a.investmentStreet,
        investmentCity: a.investmentCity,
        investmentPostalCode: a.investmentPostalCode,
        investmentCountry: a.investmentCountry,
        designerContactName: a.designerContactName,
        designerContactPhone: a.designerContactPhone,
        investorContactName: a.investorContactName,
        investorContactPhone: a.investorContactPhone,
        projectNotes: a.projectNotes,
      },
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Moje projekty</h1>
      <ContractorProjectCards cards={cards} />
    </div>
  );
}
