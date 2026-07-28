import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

// POST — sets a password without requiring the current one.
// Only for client/contractor roles — identity already proved via magic link session.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["client", "contractor"].includes(role)) {
    return NextResponse.json({ error: "Dostępne tylko dla klientów i wykonawców" }, { status: 403 });
  }

  if (!rateLimit(`set-initial-password:${session.user.id}`, 5)) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj ponownie za chwilę." }, { status: 429 });
  }

  const { newPassword } = await req.json().catch(() => ({}));

  if (!newPassword || !validatePassword(newPassword)) {
    return NextResponse.json(
      { error: "Hasło musi mieć min. 8 znaków, zawierać małą i dużą literę oraz cyfrę" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
