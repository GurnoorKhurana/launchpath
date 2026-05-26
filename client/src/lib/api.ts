import type { Roadmap } from "./roadmap";

export interface JdAnalysis {
  roleTitle: string;
  seniority: "intern" | "junior" | "mid" | "senior" | "lead" | "unspecified";
  mustHaves: string[];
  niceToHaves: string[];
  keywords: string[];
  employerSignals: string[];
  redFlags?: string[];
}

export interface TailorResult {
  jdAnalysis?: JdAnalysis;
  tailoredBullets: string[];
  matchAnalysis: { strengths: string[]; gaps: string[] };
  coverLetterDraft: string;
  fetched?: { source: "json-ld" | "main-text"; title?: string };
}

export interface TailorInput {
  resumeText: string;
  jobText?: string;
  jobUrl?: string;
}

export class ApiError extends Error {
  status: number;
  reason?: string;
  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(errBody.error ?? `Request failed: ${res.status}`, res.status, errBody.reason);
  }
  return res.json();
}

export async function tailor(input: TailorInput): Promise<TailorResult> {
  return postJson<TailorResult>("/api/tailor", input);
}

export type UserType = "newcomer" | "student" | "switcher" | "employed";
export type OpenToRelocate = "yes" | "maybe" | "no";
export type IncomeWithin = "<3m" | "3-6m" | "6-12m" | "1y+";

export interface NewcomerBranch {
  countryOfDegree: string;
  degreeLevel: string;
  yearsExperience: number;
  documents: string[];
  evaluationStatus: string;
  englishLevel: string;
  frenchLevel: string;
}

export interface StudentBranch {
  currentLevel: string;
  program: string;
  expectedGraduation: string;
  pastWork?: string;
}

export interface SwitcherBranch {
  currentRole: string;
  yearsInRole: number;
  reasonsForSwitching: string[];
}

export interface EmployedBranch {
  currentRole: string;
  industry: string;
  changeShape: string;
}

export type CareerBranch = NewcomerBranch | StudentBranch | SwitcherBranch | EmployedBranch;

export interface CareerProfile {
  userType: UserType;
  geography: { province: string; city: string; openToRelocate: OpenToRelocate };
  field: { category: string; subSpecialty: string };
  branch: CareerBranch;
  constraints: { incomeWithin: IncomeWithin; retraining: string; hoursPerWeek: number };
  interests: { R: number; I: number; A: number; S: number; E: number; C: number };
  notes?: string;
}

export async function careerPaths(profile: CareerProfile): Promise<{ roadmap: Roadmap }> {
  return postJson<{ roadmap: Roadmap }>("/api/career-paths", profile);
}
