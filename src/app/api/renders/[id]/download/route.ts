import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { logActivity } from "@/lib/activity-log";

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/tiff": ".tiff",
  "application/pdf": ".pdf",
};

function withExtension(name: string, contentType: string): string {
  const base = contentType.split(";")[0].trim();
  const ext = CONTENT_TYPE_EXT[base];
  if (!ext) return name;
  if (name.toLowerCase().endsWith(ext)) return name;
  // strip any existing wrong extension before adding the correct one
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return stem + ext;
}

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

  const render = await prisma.render.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!render || render.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const fileRes = await fetch(render.fileUrl);
  if (!fileRes.ok) {
    return NextResponse.json({ error: "Błąd pobierania pliku" }, { status: 502 });
  }

  const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
  const filename = encodeURIComponent(withExtension(render.name, contentType));

  // 10. Log: file download
  logActivity({ level: "info", action: "export.download", message: `Pobranie pliku: ${render.name}`, userId, meta: { renderId: id, renderName: render.name, type: "render" } });

  return new NextResponse(fileRes.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
