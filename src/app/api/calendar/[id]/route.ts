import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;

  const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
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
  const userId = session.user.id;

  const { id } = await params;
  const event = await prisma.calendarEvent.findFirst({
    where: { id, userId },
    include: { guests: true },
  });
  if (!event) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const body = await req.json();
  const { title, type, startAt, endAt, location, description, guests } = body;

  // Ustal nowych gości (z userId), których jeszcze nie było
  const previousGuestUserIds = new Set(
    event.guests.map((g) => g.userId).filter(Boolean)
  );

  const guestData = guests !== undefined
    ? guests
        .filter((g: any) => g.name?.trim() || g.email?.trim())
        .map((g: any) => ({
          name: g.name?.trim() || null,
          email: g.email?.trim() || null,
          userId: g.userId || null,
        }))
    : null;

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: title?.trim() ?? event.title,
      type: type ?? event.type,
      startAt: startAt ? new Date(startAt) : event.startAt,
      endAt: endAt ? new Date(endAt) : null,
      location: location?.trim() || null,
      description: description?.trim() || null,
      guests: guestData !== null
        ? { deleteMany: {}, create: guestData }
        : undefined,
    },
    include: { guests: true },
  });

  // Powiadomienia tylko dla nowo dodanych gości
  if (guestData !== null) {
    const organizer = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const organizerName = organizer?.name || organizer?.email || "Projektant";
    const eventTitle = title?.trim() ?? event.title;

    const newGuestUserIds = guestData
      .map((g: any) => g.userId)
      .filter((uid: string | null) => uid && !previousGuestUserIds.has(uid)) as string[];

    await Promise.all(
      newGuestUserIds.map(async (guestUserId: string) => {
        await prisma.notification.create({
          data: {
            userId: guestUserId,
            message: `${organizerName} zaprosił/a Cię do wydarzenia: „${eventTitle}"`,
            link: "/kalendarz",
            type: "info",
          },
        });
        await pusherServer.trigger(`user-${guestUserId}`, "new-notification", {});
      })
    );
  }

  return NextResponse.json({ ...updated, isGuest: false });
}
