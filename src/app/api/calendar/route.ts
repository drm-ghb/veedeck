import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateWhere = {
    startAt: {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined,
    },
  };

  const [ownEvents, guestEvents] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId, ...dateWhere },
      include: { guests: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: { guests: { some: { userId } }, ...dateWhere },
      include: { guests: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const ownIds = new Set(ownEvents.map((e) => e.id));
  const result = [
    ...ownEvents.map((e) => ({ ...e, isGuest: false })),
    ...guestEvents.filter((e) => !ownIds.has(e.id)).map((e) => ({ ...e, isGuest: true })),
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const { title, type, startAt, endAt, location, description, guests } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "Typ jest wymagany" }, { status: 400 });
  if (!startAt) return NextResponse.json({ error: "Data jest wymagana" }, { status: 400 });

  const event = await prisma.calendarEvent.create({
    data: {
      title: title.trim(),
      type,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      location: location?.trim() || null,
      description: description?.trim() || null,
      userId,
      guests: {
        create: (guests ?? [])
          .filter((g: any) => g.name?.trim() || g.email?.trim())
          .map((g: any) => ({
            name: g.name?.trim() || null,
            email: g.email?.trim() || null,
            userId: g.userId || null,
          })),
      },
    },
    include: { guests: true },
  });

  return NextResponse.json({ ...event, isGuest: false }, { status: 201 });
}
