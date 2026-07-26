import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !userId) {
    return NextResponse.redirect(new URL("/kalendarz?google=error", req.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/kalendarz?google=error", req.url));
  }

  const tokens = await tokenRes.json();

  // Fetch primary calendar ID
  let calendarId = "primary";
  try {
    const calRes = await fetch(`${GOOGLE_CALENDAR_BASE}/users/me/calendarList/primary`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (calRes.ok) {
      const cal = await calRes.json();
      calendarId = cal.id ?? "primary";
    }
  } catch {
    // fallback to "primary"
  }

  const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token ?? undefined,
      googleTokenExpiry: expiry,
      googleCalendarId: calendarId,
    },
  });

  return NextResponse.redirect(new URL("/kalendarz?google=connected", req.url));
}
