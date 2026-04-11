import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; renderId: string }> }
) {
  const { token, renderId } = await params;

  const project = await prisma.project.findUnique({ where: { shareToken: token } });
  if (!project || project.archived) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  if (project.shareExpiresAt && new Date() > new Date(project.shareExpiresAt)) {
    return NextResponse.json({ error: "Link wygasł" }, { status: 410 });
  }

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: {
      comments: {
        where: { isInternal: false, isAiSummary: false },
        orderBy: { createdAt: "asc" },
        include: { replies: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  if (render.comments.length === 0) {
    return NextResponse.json({ error: "Brak komentarzy do podsumowania" }, { status: 400 });
  }

  const formatted = render.comments.map(c => {
    const type = c.posX !== null ? "PIN" : "CZAT";
    const title = c.title ? ` [${c.title}]` : "";
    let text = `[${type}${title}] ${c.author}: ${c.content}`;
    if (c.replies.length > 0) {
      text += "\n" + c.replies.map(r => `  → ${r.author}: ${r.content}`).join("\n");
    }
    return text;
  }).join("\n\n");

  const prompt = `Jesteś asystentem analizującym konwersację w projekcie wnętrzarskim.

Oto lista pinów i wiadomości z czatu:

${formatted}

Napisz zwięzłe podsumowanie PO POLSKU (maks. 300 słów) zawierające:
1. **Wątki konwersacji** – główne tematy poruszane w czacie i dyskusji
2. **Piny** – czego dotyczyły oznaczenia na renderach (jeśli były)
3. **Prośby klienta** – o co prosił klient
4. **Odpowiedzi projektanta** – co przedstawił lub zaproponował projektant

Jeśli dana sekcja nie ma treści, pomiń ją. Pisz w czasie przeszłym. Bądź konkretny i zwięzły.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const summary = (message.content[0] as { type: string; text: string }).text;

  return NextResponse.json({ summary });
}
