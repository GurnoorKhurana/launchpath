import type { Request, Response } from "express";
import { getAnthropic, MODEL_ID } from "../lib/anthropic.ts";
import { TAILOR_SYSTEM_PROMPT } from "../prompts/tailor.ts";

export function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

export async function tailorHandler(req: Request, res: Response) {
  const { resumeText, jobText, templateId } = req.body ?? {};

  if (typeof resumeText !== "string" || resumeText.trim().length === 0) {
    return res.status(400).json({ error: "resumeText is required" });
  }
  if (typeof jobText !== "string" || jobText.trim().length === 0) {
    return res.status(400).json({ error: "jobText is required" });
  }

  const userContent = [
    `Resume:`,
    resumeText.trim(),
    ``,
    `Job posting:`,
    jobText.trim(),
    ``,
    templateId ? `Template context: ${templateId}` : `Template context: none`,
  ].join("\n");

  try {
    const client = getAnthropic();
    const message = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 2000,
      system: TAILOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = message.content.find((b: any) => b.type === "text") as { text: string } | undefined;
    if (!textBlock) {
      return res.status(502).json({ error: "Model returned no text" });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      const extracted = extractJsonObject(textBlock.text);
      if (extracted !== null) {
        try {
          parsed = JSON.parse(extracted);
        } catch {
          return res.status(502).json({ error: "Model output was not valid JSON", raw: textBlock.text });
        }
      } else {
        return res.status(502).json({ error: "Model output was not valid JSON", raw: textBlock.text });
      }
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("[tailor] error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
