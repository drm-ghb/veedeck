import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: renderId } = await params;

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: {
      project: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { replies: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!render || render.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const allComments = render.comments.filter(c => !c.isAiSummary);

  if (allComments.length === 0) {
    return NextResponse.json({ error: "Brak komentarzy do podsumowania" }, { status: 400 });
  }

  const formatted = allComments.map(c => {
    const type = c.posX !== null ? "PIN" : "CZAT";
    const title = c.title ? ` [${c.title}]` : "";
    const internal = c.isInternal ? " (notatka wewnętrzna)" : "";
    let text = `[${type}${title}${internal}] ${c.author}: ${c.content}`;
    if (c.replies.length > 0) {
      text += "\n" + c.replies.map(r => `  → ${r.author}: ${r.content}`).join("\n");
    }
    return text;
  }).join("\n\n");

  const prompt = `Jesteś asystentem analizującym konwersację w projekcie wnętrzarskim dla renderu "${render.name}".

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

  const authorName = session.user.name || session.user.email || "Projektant";

  const comment = await prisma.comment.create({
    data: {
      render: { connect: { id: renderId } },
      content: summary,
      author: authorName,
      isInternal: true,
      isAiSummary: true,
    },
  });

  await pusherServer.trigger(`render-${renderId}`, "new-comment", comment);

  return NextResponse.json(comment, { status: 201 });
}
