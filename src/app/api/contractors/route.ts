import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import bcrypt from "bcryptjs";
import { checkTeamPermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);

  const contractors = await prisma.contractor.findMany({
    where: { designerId },
    include: {
      _count: { select: { assignments: { where: { archived: false } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contractors);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!await checkTeamPermission(session, "contrCanCreate")) {
    return NextResponse.json({ error: "Brak uprawnień do dodawania wykonawców" }, { status: 403 });
  }
  const designerId = getWorkspaceUserId(session);

  const { name, company, trade, email, phone, createAccount, login, password } = await req.json();
  if (!company) {
    return NextResponse.json({ error: "Firma jest wymagana" }, { status: 400 });
  }

  let userId: string | undefined;

  if (createAccount && login && password) {
    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      return NextResponse.json({ error: "Login jest już zajęty" }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const contractorEmail = `${login}@contractor.internal`;
    const newUser = await prisma.user.create({
      data: {
        email: contractorEmail,
        login,
        password: hashedPassword,
        name: name || company,
        role: "contractor",
      },
    });
    userId = newUser.id;
  }

  const contractor = await prisma.contractor.create({
    data: {
      designerId,
      name,
      company: company || null,
      trade: trade || null,
      email: email || null,
      phone: phone || null,
      userId: userId ?? null,
    },
    include: {
      _count: { select: { assignments: { where: { archived: false } } } },
    },
  });

  return NextResponse.json(contractor, { status: 201 });
}
