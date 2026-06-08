import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrediction, toInternalStatus, parseProgress } from "@/lib/replicate";

const MODEL_EXTENSIONS: Record<string, string[]> = {
  glb: [".glb"],
  obj: [".obj"],
  stl: [".stl"],
  fbx: [".fbx"],
};

const THUMBNAIL_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

function findUrl(urls: string[], exts: string[]): string | null {
  return urls.find((u) => exts.some((ext) => u.toLowerCase().includes(ext))) ?? null;
}

function parseOutput(output: unknown): {
  thumbnailUrl: string | null;
  modelUrls: { glb: string | null; obj: string | null; stl: string | null; fbx: string | null } | null;
} {
  const urls: string[] = [];
  if (typeof output === "string") urls.push(output);
  else if (Array.isArray(output)) urls.push(...output.filter((u) => typeof u === "string"));

  if (urls.length === 0) return { thumbnailUrl: null, modelUrls: null };

  const modelUrls = {
    glb: findUrl(urls, MODEL_EXTENSIONS.glb),
    obj: findUrl(urls, MODEL_EXTENSIONS.obj),
    stl: findUrl(urls, MODEL_EXTENSIONS.stl),
    fbx: findUrl(urls, MODEL_EXTENSIONS.fbx),
  };

  const hasAnyModel = Object.values(modelUrls).some(Boolean);

  return {
    thumbnailUrl: findUrl(urls, THUMBNAIL_EXTENSIONS),
    modelUrls: hasAnyModel ? modelUrls : null,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  try {
    const prediction = await getPrediction(taskId);
    const { thumbnailUrl, modelUrls } = parseOutput(prediction.output);

    return NextResponse.json({
      status: toInternalStatus(prediction.status),
      progress: parseProgress(prediction.logs),
      thumbnailUrl,
      modelUrls,
      errorMessage: prediction.error ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
