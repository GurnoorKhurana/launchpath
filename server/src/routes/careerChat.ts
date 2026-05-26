import type { Request, Response } from "express";
import { getAnthropic, MODEL_ID } from "../lib/anthropic.ts";
import { CAREER_COACH_SYSTEM_PROMPT } from "../prompts/careerCoach.ts";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function isValidMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== "object") return false;
  const obj = m as Record<string, unknown>;
  return (
    (obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string" &&
    obj.content.trim().length > 0
  );
}

export async function careerChatHandler(req: Request, res: Response) {
  const { messages } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }
  if (!messages.every(isValidMessage)) {
    return res.status(400).json({ error: "each message must have role user|assistant and non-empty content" });
  }
  if (messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "last message must be from the user" });
  }

  try {
    const client = getAnthropic();
    const message = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1200,
      system: CAREER_COACH_SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = message.content.find((b: any) => b.type === "text") as { text: string } | undefined;
    if (!textBlock) {
      return res.status(502).json({ error: "Model returned no text" });
    }

    return res.json({ assistantMessage: textBlock.text });
  } catch (err: any) {
    console.error("[career-chat] error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
