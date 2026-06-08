import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrediction, toInternalStatus, parseProgress } from "@/lib/replicate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ predictionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { predictionId } = await params;

  try {
    const prediction = await getPrediction(predictionId);
    return NextResponse.json({
      status: toInternalStatus(prediction.status),
      progress: parseProgress(prediction.logs),
      outputUrl: typeof prediction.output === "string" ? prediction.output : null,
      errorMessage: prediction.error ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
