import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { logActivity } from "@/lib/activity-log";
import JSZip from "jszip";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: {
      room: { include: { project: true } },
      renders: { where: { archived: false }, orderBy: { order: "asc" } },
    },
  });

  if (!folder || folder.room.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  await Promise.all(
    folder.renders.map(async (render) => {
      try {
        const fileRes = await fetch(render.fileUrl);
        if (!fileRes.ok) return;
        const buffer = await fileRes.arrayBuffer();
        const filename = uniqueName(render.name, usedNames);
        zip.file(filename, buffer);
      } catch {
        // skip failed files
      }
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipName = encodeURIComponent(folder.name);

  // 10. Log: folder ZIP download
  logActivity({ level: "info", action: "export.download", message: `Pobranie folderu ZIP: ${folder.name} (${folder.renders.length} plików)`, userId, meta: { folderId: id, folderName: folder.name, fileCount: folder.renders.length, type: "folder_zip" } });

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${zipName}.zip`,
    },
  });
}

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (used.has(`${stem} (${i})${ext}`)) i++;
  const unique = `${stem} (${i})${ext}`;
  used.add(unique);
  return unique;
}
