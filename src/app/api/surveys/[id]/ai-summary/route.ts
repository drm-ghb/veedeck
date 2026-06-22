import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type Attachment = { url: string; name: string };

function isImageFile(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

function unwrap(value: unknown): { answer: unknown; attachments: Attachment[] } {
  if (value !== null && typeof value === "object" && !Array.isArray(value) && "attachments" in (value as object)) {
    const v = value as { answer?: unknown; attachments?: Attachment[] };
    return { answer: v.answer ?? null, attachments: v.attachments ?? [] };
  }
  return { answer: value, attachments: [] };
}

function buildMarkdown(
  surveyName: string,
  questions: { id: string; label: string; type: string; options: string[] | null }[],
  responses: { answers: { questionId: string; value: unknown }[] }[]
): { md: string; imageUrls: string[] } {
  const imageUrls: string[] = [];

  // Per-question aggregation
  type QData = {
    label: string;
    type: string;
    options: string[] | null;
    choiceCounts: Record<string, number>;
    textAnswers: string[];
    imageCount: number;
  };

  const qMap = new Map<string, QData>();
  for (const q of questions) {
    qMap.set(q.id, {
      label: q.label,
      type: q.type,
      options: q.options,
      choiceCounts: {},
      textAnswers: [],
      imageCount: 0,
    });
  }

  for (const response of responses) {
    for (const ans of response.answers) {
      const entry = qMap.get(ans.questionId);
      if (!entry) continue;

      const { answer, attachments } = unwrap(ans.value);

      // Aggregate choice answers
      if (entry.type === "single_choice" || entry.type === "yes_no") {
        if (typeof answer === "string" && answer) {
          entry.choiceCounts[answer] = (entry.choiceCounts[answer] ?? 0) + 1;
        }
      } else if (entry.type === "multiple_choice") {
        if (Array.isArray(answer)) {
          for (const v of answer as string[]) {
            entry.choiceCounts[v] = (entry.choiceCounts[v] ?? 0) + 1;
          }
        }
      } else {
        // Text / budget / rating
        if (answer !== null && answer !== undefined && answer !== "") {
          const text = typeof answer === "number"
            ? answer.toLocaleString("pl-PL") + " zł"
            : String(answer).trim();
          if (text) entry.textAnswers.push(text);
        }
      }

      // Collect attachments
      for (const att of attachments) {
        if (isImageFile(att.name)) {
          entry.imageCount++;
          imageUrls.push(att.url);
        } else {
          entry.textAnswers.push(`[plik: ${att.name}]`);
        }
      }
    }
  }

  // Build markdown
  const lines: string[] = [
    `# Ankieta: ${surveyName}`,
    `Liczba uzupełnionych odpowiedzi: ${responses.length}`,
    "",
  ];

  for (const entry of qMap.values()) {
    const hasChoices = Object.keys(entry.choiceCounts).length > 0;
    const hasText = entry.textAnswers.length > 0;
    const hasImages = entry.imageCount > 0;
    if (!hasChoices && !hasText && !hasImages) continue;

    lines.push(`## ${entry.label}`);

    if (hasChoices) {
      const opts = entry.options ?? Object.keys(entry.choiceCounts);
      for (const opt of opts) {
        const count = entry.choiceCounts[opt] ?? 0;
        if (count > 0) lines.push(`- ${opt}: ${count}x`);
      }
      // Extra choices not in options list
      for (const [k, v] of Object.entries(entry.choiceCounts)) {
        if (!opts.includes(k)) lines.push(`- ${k}: ${v}x`);
      }
    }

    if (hasText) {
      for (const t of entry.textAnswers) {
        lines.push(`- "${t}"`);
      }
    }

    if (hasImages) {
      lines.push(`- Zdjęcia inspiracji: ${entry.imageCount} plik${entry.imageCount === 1 ? "" : "ów"} (załączone poniżej)`);
    }

    lines.push("");
  }

  return { md: lines.join("\n"), imageUrls };
}

type ImageUrlSource = { type: "url"; url: string };
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: ImageUrlSource };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({
    where: { id, userId },
    select: { aiSummary: true, aiSummaryMarkdown: true, aiSummaryAt: true },
  });
  if (!survey) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  return NextResponse.json({
    summary: survey.aiSummary ?? null,
    markdown: survey.aiSummaryMarkdown ?? null,
    generatedAt: survey.aiSummaryAt ?? null,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({
    where: { id, userId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!survey) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: id, completedAt: { not: null } },
    include: { answers: true },
  });

  if (responses.length === 0) {
    return NextResponse.json({ error: "Brak uzupełnionych odpowiedzi do analizy" }, { status: 400 });
  }

  const { md, imageUrls } = buildMarkdown(
    survey.name,
    survey.questions.map((q) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      options: (q.options as string[] | null) ?? null,
    })),
    responses.map((r) => ({ answers: r.answers.map((a) => ({ questionId: a.questionId, value: a.value })) }))
  );

  // Build Claude message
  const content: ContentBlock[] = [
    {
      type: "text",
      text: `Jesteś asystentem projektanta wnętrz. Poniżej jest plik Markdown z zagregowanymi odpowiedziami klientów na ankietę.\nPrzygotuj po polsku kompleksowe podsumowanie dla projektanta zawierające:\n1. Kluczowe wzorce i preferencje stylistyczne\n2. Kolorystykę i materiały\n3. Spójności i ewentualne napięcia między odpowiedziami\n4. Analizę zdjęć inspiracji (jeśli są załączone)\n5. Sekcję 'Wskazówki dla projektanta' z konkretnymi rekomendacjami\n\n---\n\n${md}`,
    },
  ];

  // Attach images (cap at 10)
  const imagesToSend = imageUrls.slice(0, 10);
  if (imagesToSend.length > 0) {
    content.push({ type: "text", text: `\nZdjęcia inspiracji (${imagesToSend.length} z ${imageUrls.length}):` });
    for (const url of imagesToSend) {
      content.push({ type: "image", source: { type: "url", url } });
    }
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    });

    const block = message.content.find((b) => b.type === "text");
    const summary = block ? (block as { type: "text"; text: string }).text : "";

    await prisma.survey.update({
      where: { id },
      data: { aiSummary: summary, aiSummaryMarkdown: md, aiSummaryAt: new Date() },
    });

    return NextResponse.json({ summary, markdown: md });
  } catch (err) {
    console.error("[ai-summary] error:", err);
    return NextResponse.json({ error: "Błąd generowania podsumowania AI" }, { status: 500 });
  }
}
