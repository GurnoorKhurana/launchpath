import type { Request, Response } from "express";
import { getAnthropic, MODEL_ID } from "../lib/anthropic.ts";
import { TAILOR_SYSTEM_PROMPT } from "../prompts/tailor.ts";
import { JD_ANALYZER_SYSTEM_PROMPT } from "../prompts/jdAnalyzer.ts";
import { fetchJobDescription, JobFetchError, type JdSource } from "../lib/jobFetcher.ts";

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

function parseJsonLoose(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const extracted = extractJsonObject(text);
    if (extracted === null) return null;
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
}

interface JdAnalysis {
  roleTitle: string;
  seniority: "intern" | "junior" | "mid" | "senior" | "lead" | "unspecified";
  mustHaves: string[];
  niceToHaves: string[];
  keywords: string[];
  employerSignals: string[];
  redFlags?: string[];
}

const VALID_SENIORITY = new Set(["intern", "junior", "mid", "senior", "lead", "unspecified"]);

function normalizeJdAnalysis(raw: any): JdAnalysis {
  const asStringArray = (v: any): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim().length > 0) : [];

  return {
    roleTitle: typeof raw?.roleTitle === "string" ? raw.roleTitle : "Unspecified role",
    seniority: VALID_SENIORITY.has(raw?.seniority) ? raw.seniority : "unspecified",
    mustHaves: asStringArray(raw?.mustHaves),
    niceToHaves: asStringArray(raw?.niceToHaves),
    keywords: asStringArray(raw?.keywords),
    employerSignals: asStringArray(raw?.employerSignals),
    redFlags: asStringArray(raw?.redFlags),
  };
}

async function runJdAnalyzer(jdText: string): Promise<JdAnalysis | null> {
  const client = getAnthropic();
  const message = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 800,
    system: JD_ANALYZER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: jdText }],
  });

  const textBlock = message.content.find((b: any) => b.type === "text") as { text: string } | undefined;
  if (!textBlock) return null;

  const parsed = parseJsonLoose(textBlock.text);
  if (!parsed || typeof parsed !== "object") return null;

  return normalizeJdAnalysis(parsed);
}

async function runTailor(resumeText: string, jdText: string, analysis: JdAnalysis): Promise<any | null> {
  const client = getAnthropic();
  const userContent = [
    "Candidate resume:",
    resumeText.trim(),
    "",
    "Structured job-description analysis (from prior analyzer pass):",
    JSON.stringify(analysis, null, 2),
    "",
    "Raw job description (for additional context the analyzer may have missed):",
    jdText.trim(),
  ].join("\n");

  const message = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 2000,
    system: TAILOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = message.content.find((b: any) => b.type === "text") as { text: string } | undefined;
  if (!textBlock) return null;

  return parseJsonLoose(textBlock.text);
}

export async function tailorHandler(req: Request, res: Response) {
  const { resumeText, jobText, jobUrl } = req.body ?? {};

  if (typeof resumeText !== "string" || resumeText.trim().length === 0) {
    return res.status(400).json({ error: "resumeText is required" });
  }

  const hasJobText = typeof jobText === "string" && jobText.trim().length > 0;
  const hasJobUrl = typeof jobUrl === "string" && jobUrl.trim().length > 0;
  if (!hasJobText && !hasJobUrl) {
    return res.status(400).json({ error: "either jobText or jobUrl is required" });
  }

  let resolvedJdText: string;
  let fetched: { source: JdSource; title?: string } | undefined;

  if (hasJobUrl) {
    try {
      const f = await fetchJobDescription(jobUrl.trim());
      resolvedJdText = f.text;
      fetched = { source: f.source, title: f.title };
    } catch (err: any) {
      if (err instanceof JobFetchError) {
        return res.status(422).json({
          error:
            err.reason === "invalid_url"
              ? "That URL isn't valid. Paste the description instead."
              : "We couldn't read that page. Paste the description instead.",
          reason: err.reason,
        });
      }
      return res.status(500).json({ error: err?.message ?? "Failed to fetch job posting" });
    }
  } else {
    resolvedJdText = jobText.trim();
  }

  try {
    const analysis = await runJdAnalyzer(resolvedJdText);
    if (!analysis) {
      return res.status(502).json({ error: "Could not analyze the job description" });
    }

    const tailored = await runTailor(resumeText, resolvedJdText, analysis);
    if (!tailored || typeof tailored !== "object") {
      return res.status(502).json({ error: "Tailor stage produced no usable output" });
    }

    return res.json({ jdAnalysis: analysis, ...tailored, ...(fetched ? { fetched } : {}) });
  } catch (err: any) {
    console.error("[tailor] error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
