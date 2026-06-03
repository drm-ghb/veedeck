import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, Download, Image } from "@/components/ui/icons";

interface Props {
  params: Promise<{ assignmentId: string; folderId: string }>;
}

export default async function ContractorFolderPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "contractor") redirect("/login");

  const { assignmentId, folderId } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
  });
  if (!contractor) notFound();

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: contractor.id, archived: false },
    include: { project: { select: { id: true, title: true } } },
  });
  if (!assignment) notFound();

  const folder = await prisma.contractorFolder.findFirst({
    where: { id: folderId, assignmentId, visible: true },
    include: {
      files: {
        include: { render: { select: { id: true, name: true, fileUrl: true, fileType: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!folder) notFound();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href={`/wykonawca/projekty/${assignmentId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
          <Link href={`/wykonawca/projekty/${assignmentId}`} className="hover:text-foreground transition-colors min-w-0 shrink truncate max-w-[120px]">
            {assignment.project.title}
          </Link>
          <span className="flex-shrink-0">/</span>
          <span className="text-foreground font-medium min-w-0 shrink truncate max-w-[140px]">{folder.name}</span>
        </nav>
      </div>

      <h1 className="text-2xl font-semibold">{folder.name}</h1>

      {folder.files.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p>Brak plików w tym folderze</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {folder.files.map((file) => {
            const displayUrl = file.render?.fileUrl ?? file.fileUrl ?? null;
            const displayName = file.name;
            const isImage = (file.render?.fileType ?? file.fileType) === "image";
            return (
              <div key={file.id} className="group relative rounded-xl border border-border bg-card overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {isImage && displayUrl ? (
                    <img src={displayUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={32} className="text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(file.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
                {displayUrl && (
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Pobierz / Otwórz"
                  >
                    <Download size={14} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
