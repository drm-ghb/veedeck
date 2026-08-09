import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fullName, name } = await req.json();

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json({ error: "Imię i nazwisko musi mieć co najmniej 2 znaki" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      fullName: fullName.trim(),
      ...(name && typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      needsNameSetup: false,
    },
  });

  const res = NextResponse.json({ ok: true });
  // Short-lived bypass cookie so middleware skips needsNameSetup redirect
  // for the next navigation (JWT cookie may not refresh in time client-side)
  res.cookies.set("profile-complete", "1", { path: "/", maxAge: 60, httpOnly: true, sameSite: "lax" });
  return res;
}
