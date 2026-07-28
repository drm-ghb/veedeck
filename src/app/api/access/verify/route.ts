import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/access-token";

// GET /api/access/verify?token=<raw> — lightweight check for /p/[token] error display
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("token");
  if (!raw) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 400 });

  const result = await verifyAccessToken(raw);
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, reason: result.reason });
}
