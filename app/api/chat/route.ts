import { NextResponse } from "next/server";
import { replyFor } from "@/lib/chat-rules";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  return NextResponse.json({ reply: replyFor(body.message) });
}
