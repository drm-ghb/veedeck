import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "MESHY_API_KEY not configured" }, { status: 500 });

  const res = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({
    status: data.status,
    progress: data.progress ?? 0,
    thumbnailUrl: data.thumbnail_url ?? null,
    modelUrls: data.model_urls ?? null,
    errorMessage: data.error_message ?? null,
  });
}
