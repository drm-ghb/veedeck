import { NextRequest, NextResponse } from "next/server";
import { resetDemoAccount } from "@/lib/demo-seed";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await resetDemoAccount();
    console.log("[cron/reset-demo] Demo account reset successfully:", result);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[cron/reset-demo] Failed:", err);
    return NextResponse.json(
      { error: "Reset failed", detail: String(err) },
      { status: 500 }
    );
  }
}
