import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startPrediction } from "@/lib/replicate";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageUrl } = await req.json();
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  try {
    const prediction = await startPrediction("nightmareai/real-esrgan", {
      image: imageUrl,
      scale: 4,
      face_enhance: false,
    });
    return NextResponse.json({ predictionId: prediction.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("REPLICATE_API_TOKEN")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
