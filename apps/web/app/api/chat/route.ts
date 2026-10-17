import { NextResponse } from "next/server";

const API_BASE_URL = process.env.ELYRA_API_URL ?? "http://localhost:4000/api/v1";

type HistoryMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { message?: unknown; history?: unknown; conversationId?: unknown; languageContext?: unknown }
    | null;
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const history: HistoryMessage[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is HistoryMessage =>
            !!item &&
            typeof item === "object" &&
            ((item as HistoryMessage).role === "user" || (item as HistoryMessage).role === "assistant") &&
            typeof (item as HistoryMessage).content === "string",
        )
        .slice(-20)
    : [];

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message.trim(),
        history,
        languageContext:body.languageContext,
        conversationId:
          typeof body.conversationId === "string" && body.conversationId.trim()
            ? body.conversationId.trim()
            : undefined,
        persist: true,
      }),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      return NextResponse.json(
        { error: "Chat backend request failed", details: data },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Chat backend is unavailable" }, { status: 503 });
  }
}
