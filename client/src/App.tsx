import { useState } from "react";
import { tailor, type TailorResult } from "@/lib/api";

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);

  async function onTailor() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const out = await tailor(resumeText, jobText);
      setResult(out);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = resumeText.trim().length > 0 && jobText.trim().length > 0 && !loading;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">LaunchPath</h1>
        <p className="text-muted-foreground mt-1">
          Tailor your resume + cover letter to a specific job posting.
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Your resume</label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume here..."
            className="w-full h-64 p-3 rounded-md border border-border bg-background text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Job posting</label>
          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste the full job posting here..."
            className="w-full h-64 p-3 rounded-md border border-border bg-background text-sm font-mono"
          />
        </div>
      </section>

      <button
        onClick={onTailor}
        disabled={!canSubmit}
        className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Tailoring..." : "Tailor my resume"}
      </button>

      {error && (
        <div className="mt-6 p-4 rounded-md border border-red-200 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Tailored bullets</h2>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              {result.tailoredBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-md border border-border bg-muted">
              <h3 className="font-semibold mb-2">Strengths</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {result.matchAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="p-4 rounded-md border border-border bg-muted">
              <h3 className="font-semibold mb-2">Gaps</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {result.matchAnalysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Cover letter draft</h2>
            <p className="text-xs text-muted-foreground mb-3">
              This is a skeleton — the bracketed parts must come from you. Judges and recruiters can spot a pure-AI cover letter.
            </p>
            <pre className="whitespace-pre-wrap p-4 rounded-md border border-border bg-muted text-sm font-mono">
              {result.coverLetterDraft}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
