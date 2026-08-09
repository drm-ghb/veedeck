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

  return NextResponse.json({ ok: true });
}
