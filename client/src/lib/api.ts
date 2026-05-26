export interface TailorResult {
  tailoredBullets: string[];
  matchAnalysis: { strengths: string[]; gaps: string[] };
  coverLetterDraft: string;
}

export async function tailor(resumeText: string, jobText: string): Promise<TailorResult> {
  const res = await fetch("/api/tailor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText, jobText }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}
