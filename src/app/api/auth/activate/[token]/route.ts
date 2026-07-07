import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { activationToken: token },
    select: { id: true, activationTokenExpiry: true },
  });

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login?activated=invalid`);
  }

  if (user.activationTokenExpiry && user.activationTokenExpiry < new Date()) {
    return NextResponse.redirect(`${APP_URL}/login?activated=expired`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      activationToken: null,
      activationTokenExpiry: null,
    },
  });

  return NextResponse.redirect(`${APP_URL}/login?activated=true`);
}
