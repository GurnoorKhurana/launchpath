import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Check server/.env");
  }
  client = new Anthropic({ apiKey });
  return client;
}

// Overridable so prod can run a cheaper model (e.g. claude-haiku-4-5) within budget.
export const MODEL_ID = process.env.MODEL_ID || "claude-sonnet-4-6";
