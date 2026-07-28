import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAccessToken, buildAccessLink } from "@/lib/access-token";

// POST /api/access/request — client/contractor requests a magic link for themselves by email
// Always returns 200 to avoid email enumeration
export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: true }); // malformed body — silent
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: true });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, email: true },
    });

    // Only send to clients and contractors — designers use /login
    if (!user || !["client", "contractor"].includes(user.role)) {
      return NextResponse.json({ ok: true });
    }

    const rawToken = await createAccessToken(user.id);
    const link = buildAccessLink(rawToken);

    const { sendAccessLinkEmail } = await import("@/lib/email");
    await sendAccessLinkEmail({
      to: user.email ?? email,
      link,
      personName: user.name ?? "Użytkowniku",
      designerName: "veedeck",
      locale: "pl",
    });
  } catch (err) {
    console.error("[api/access/request] error:", err);
    // Still return 200 to avoid enumeration
  }

  return NextResponse.json({ ok: true });
}
