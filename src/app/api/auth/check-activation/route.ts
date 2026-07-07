import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ status: "unknown" });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { activationToken: true },
  });

  if (!user) return NextResponse.json({ status: "unknown" });
  if (user.activationToken) return NextResponse.json({ status: "pending" });
  return NextResponse.json({ status: "active" });
}
