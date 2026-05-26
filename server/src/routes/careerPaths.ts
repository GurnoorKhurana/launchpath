import type { Request, Response } from "express";
import { getAnthropic, MODEL_ID } from "../lib/anthropic.ts";
import { CAREER_PATHS_FROM_PROFILE_SYSTEM_PROMPT } from "../prompts/careerPathsFromProfile.ts";

type UserType = "newcomer" | "student" | "switcher" | "employed";
type OpenToRelocate = "yes" | "maybe" | "no";
type IncomeWithin = "<3m" | "3-6m" | "6-12m" | "1y+";

interface CareerProfile {
  userType: UserType;
  geography: { province: string; city: string; openToRelocate: OpenToRelocate };
  field: { category: string; subSpecialty: string };
  branch: Record<string, unknown>;
  constraints: { incomeWithin: IncomeWithin; retraining: string; hoursPerWeek: number };
  interests: { R: number; I: number; A: number; S: number; E: number; C: number };
  notes?: string;
}

interface RoadmapPath {
  title: string;
  timeline: string;
  steps: string[];
  certifications: string[];
  realistic_salary_range_cad: string;
}

const USER_TYPES: UserType[] = ["newcomer", "student", "switcher", "employed"];
const OPEN_TO_RELOCATE: OpenToRelocate[] = ["yes", "maybe", "no"];
const INCOME_WITHIN: IncomeWithin[] = ["<3m", "3-6m", "6-12m", "1y+"];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validateProfile(body: any): { ok: true; profile: CareerProfile } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "request body must be an object" };

  const userType = body.userType;
  if (!USER_TYPES.includes(userType)) {
    return { ok: false, error: `userType must be one of: ${USER_TYPES.join(", ")}` };
  }

  const geography = body.geography;
  if (!geography || typeof geography !== "object") return { ok: false, error: "geography is required" };
  if (!isNonEmptyString(geography.province)) return { ok: false, error: "geography.province is required" };
  if (!isNonEmptyString(geography.city)) return { ok: false, error: "geography.city is required" };
  if (!OPEN_TO_RELOCATE.includes(geography.openToRelocate)) {
    return { ok: false, error: "geography.openToRelocate must be yes|maybe|no" };
  }

  const field = body.field;
  if (!field || typeof field !== "object") return { ok: false, error: "field is required" };
  if (!isNonEmptyString(field.category)) return { ok: false, error: "field.category is required" };
  if (!isNonEmptyString(field.subSpecialty)) return { ok: false, error: "field.subSpecialty is required" };

  const branch = body.branch;
  if (!branch || typeof branch !== "object") return { ok: false, error: "branch is required" };

  const constraints = body.constraints;
  if (!constraints || typeof constraints !== "object") return { ok: false, error: "constraints is required" };
  if (!INCOME_WITHIN.includes(constraints.incomeWithin)) {
    return { ok: false, error: "constraints.incomeWithin must be one of <3m|3-6m|6-12m|1y+" };
  }
  if (!isNonEmptyString(constraints.retraining)) return { ok: false, error: "constraints.retraining is required" };
  if (typeof constraints.hoursPerWeek !== "number" || constraints.hoursPerWeek < 0) {
    return { ok: false, error: "constraints.hoursPerWeek must be a non-negative number" };
  }

  const interests = body.interests;
  if (!interests || typeof interests !== "object") return { ok: false, error: "interests is required" };
  for (const k of ["R", "I", "A", "S", "E", "C"] as const) {
    const v = interests[k];
    if (typeof v !== "number" || v < 1 || v > 5) {
      return { ok: false, error: `interests.${k} must be a number 1..5` };
    }
  }

  const notes = body.notes;
  if (notes !== undefined && typeof notes !== "string") {
    return { ok: false, error: "notes must be a string when provided" };
  }

  return { ok: true, profile: body as CareerProfile };
}

function renderProfileAsText(p: CareerProfile): string {
  const lines: string[] = [];
  lines.push("=== USER PROFILE ===");
  lines.push(`userType: ${p.userType}`);
  lines.push("");
  lines.push("Geography:");
  lines.push(`  province: ${p.geography.province}`);
  lines.push(`  city: ${p.geography.city}`);
  lines.push(`  openToRelocate: ${p.geography.openToRelocate}`);
  lines.push("");
  lines.push("Field of interest:");
  lines.push(`  category: ${p.field.category}`);
  lines.push(`  subSpecialty: ${p.field.subSpecialty}`);
  lines.push("");
  lines.push(`Branch-specific (${p.userType}):`);
  for (const [k, v] of Object.entries(p.branch)) {
    lines.push(`  ${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  }
  lines.push("");
  lines.push("Constraints:");
  lines.push(`  incomeWithin: ${p.constraints.incomeWithin}`);
  lines.push(`  retraining: ${p.constraints.retraining}`);
  lines.push(`  hoursPerWeek: ${p.constraints.hoursPerWeek}`);
  lines.push("");
  lines.push("RIASEC interests (1=low, 5=high):");
  lines.push(`  R (hands-on / building): ${p.interests.R}`);
  lines.push(`  I (analysis / puzzles): ${p.interests.I}`);
  lines.push(`  A (creating / designing): ${p.interests.A}`);
  lines.push(`  S (helping / teaching): ${p.interests.S}`);
  lines.push(`  E (leading / persuading): ${p.interests.E}`);
  lines.push(`  C (organising / detail work): ${p.interests.C}`);
  if (p.notes && p.notes.trim().length > 0) {
    lines.push("");
    lines.push("Additional notes:");
    lines.push(`  ${p.notes.trim()}`);
  }
  lines.push("");
  lines.push("Produce the <roadmap>...</roadmap> block now.");
  return lines.join("\n");
}

const ROADMAP_RE = /<roadmap>\s*([\s\S]*?)\s*<\/roadmap>/i;

function parseRoadmapFromText(text: string): { paths: RoadmapPath[] } | null {
  const m = text.match(ROADMAP_RE);
  const jsonStr = m ? m[1].trim() : text.trim();
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.paths)) return parsed;
  } catch {
    /* fall through */
  }
  return null;
}

export async function careerPathsHandler(req: Request, res: Response) {
  const validation = validateProfile(req.body ?? {});
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const userContent = renderProfileAsText(validation.profile);

  try {
    const client = getAnthropic();
    const message = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1500,
      system: CAREER_PATHS_FROM_PROFILE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = message.content.find((b: any) => b.type === "text") as { text: string } | undefined;
    if (!textBlock) {
      return res.status(502).json({ error: "Model returned no text" });
    }

    const roadmap = parseRoadmapFromText(textBlock.text);
    if (!roadmap) {
      return res.status(502).json({ error: "Model output did not contain a valid roadmap", raw: textBlock.text });
    }

    return res.json({ roadmap });
  } catch (err: any) {
    console.error("[career-paths] error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
