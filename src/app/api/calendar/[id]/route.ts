import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: session.user.id } });
  if (!event) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: session.user.id } });
  if (!event) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const body = await req.json();
  const { title, type, startAt, endAt, location, description, reminder, reminderOffset, guests } = body;

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: title?.trim() ?? event.title,
      type: type ?? event.type,
      startAt: startAt ? new Date(startAt) : event.startAt,
      endAt: endAt ? new Date(endAt) : null,
      location: location?.trim() || null,
      description: description?.trim() || null,
      reminder: reminder ?? event.reminder,
      reminderOffset: (reminder ?? event.reminder) ? reminderOffset : null,
      guests: guests !== undefined
        ? {
            deleteMany: {},
            create: guests
              .filter((g: any) => g.name?.trim() || g.email?.trim())
              .map((g: any) => ({ name: g.name?.trim() || null, email: g.email?.trim() || null })),
          }
        : undefined,
    },
    include: { guests: true },
  });

  return NextResponse.json(updated);
}
