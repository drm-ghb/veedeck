import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  source: "google";
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error("Failed to refresh Google token");

  const data = await res.json();
  const expiry = new Date(Date.now() + data.expires_in * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { googleAccessToken: data.access_token, googleTokenExpiry: expiry },
  });

  return data.access_token;
}

export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
  });

  if (!user?.googleRefreshToken) return null;

  const expired = !user.googleTokenExpiry || user.googleTokenExpiry <= new Date(Date.now() + 60_000);

  if (expired) {
    try {
      return await refreshAccessToken(userId, user.googleRefreshToken);
    } catch {
      return null;
    }
  }

  return user.googleAccessToken ?? null;
}

export async function fetchGoogleCalendarEvents(
  token: string,
  calendarId: string,
  from: string,
  to: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: from,
    timeMax: to,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? []).map((item: any) => ({ ...item, source: "google" }));
}

export async function createGoogleCalendarEvent(
  token: string,
  calendarId: string,
  event: {
    title: string;
    startAt: string;
    endAt?: string | null;
    description?: string | null;
    location?: string | null;
  }
): Promise<string | null> {
  const body: any = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: { dateTime: event.startAt, timeZone: "Europe/Warsaw" },
    end: { dateTime: event.endAt ?? event.startAt, timeZone: "Europe/Warsaw" },
  };

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.id ?? null;
}
