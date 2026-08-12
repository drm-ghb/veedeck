import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = readFileSync(join(process.cwd(), "ASYSTENT_INSTRUKCJA_veedeck.md"), "utf-8");

const AI_DAILY_LIMIT = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiQueryCount: true, aiQueryResetAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const limitExpired = user.aiQueryResetAt && user.aiQueryResetAt <= now;
  const currentCount = limitExpired ? 0 : user.aiQueryCount;
  const remaining = Math.max(0, AI_DAILY_LIMIT - currentCount);
  const resetAt = currentCount >= AI_DAILY_LIMIT && !limitExpired ? user.aiQueryResetAt?.toISOString() : null;

  return NextResponse.json({ remaining, limit: AI_DAILY_LIMIT, resetAt });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Brak wiadomości" }, { status: 400 });
  }

  // Rate limiting — 10 queries per 24h
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiQueryCount: true, aiQueryResetAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const limitExpired = user.aiQueryResetAt && user.aiQueryResetAt <= now;
  const currentCount = limitExpired ? 0 : user.aiQueryCount;

  if (currentCount >= AI_DAILY_LIMIT) {
    return NextResponse.json(
      { error: "limit", resetAt: user.aiQueryResetAt?.toISOString() },
      { status: 429 }
    );
  }

  const newCount = currentCount + 1;
  const newResetAt = newCount === AI_DAILY_LIMIT ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : (limitExpired ? null : user.aiQueryResetAt);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { aiQueryCount: newCount, aiQueryResetAt: newResetAt },
  });

  // Keep last 10 messages for context, sanitize content
  const safeMessages = messages.slice(-10).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "assistant" as const : "user" as const,
    content: String(m.content).slice(0, 2000),
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: safeMessages,
          stream: true,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error("[ai-assistant] error:", err);
        controller.enqueue(encoder.encode("Przepraszam, wystąpił błąd. Spróbuj ponownie."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
