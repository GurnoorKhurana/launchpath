import { useState } from "react";
import { tailor, type TailorResult } from "@/lib/api";

export default function TailorPanel() {
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
    <div>
      <section className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-2">
            Your resume
          </label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume here..."
            className="w-full h-64 p-3.5 rounded-lg border border-hairline bg-surface text-sm font-mono text-ink resize-none outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-2">
            Job posting
          </label>
          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste the full job posting here..."
            className="w-full h-64 p-3.5 rounded-lg border border-hairline bg-surface text-sm font-mono text-ink resize-none outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </section>

      <button
        onClick={onTailor}
        disabled={!canSubmit}
        className="inline-flex items-center gap-1.5 h-11 px-[18px] bg-accent text-white font-sans font-semibold text-sm rounded-lg tracking-[-0.005em] shadow-[0_1px_0_rgba(10,10,10,0.04),inset_0_-1px_0_rgba(0,0,0,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Tailoring..." : "Tailor my resume"}
        {!loading && <span className="font-mono font-medium">→</span>}
      </button>

      {error && (
        <div className="mt-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <section className="bg-surface border border-hairline rounded-lg p-5">
            <h2 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-3">
              Tailored bullets
            </h2>
            <ul className="list-none pl-0 space-y-2 text-sm text-body">
              {result.tailoredBullets.map((b, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="font-mono text-[10px] text-muted-foreground bg-[#F5F5F5] border border-hairline rounded-sm px-1 py-[2px] leading-none mt-[3px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-ink">{b}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg border border-hairline bg-surface">
              <h3 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-2">
                Strengths
              </h3>
              <ul className="text-sm text-body space-y-1.5">
                {result.matchAnalysis.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 bg-ink rounded-[1px] mt-[7px] flex-shrink-0" />
                    <span className="text-ink">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 rounded-lg border border-hairline bg-surface">
              <h3 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-2">
                Gaps
              </h3>
              <ul className="text-sm text-body space-y-1.5">
                {result.matchAnalysis.gaps.map((g, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 bg-ink rounded-[1px] mt-[7px] flex-shrink-0" />
                    <span className="text-ink">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-surface border border-hairline rounded-lg p-5">
            <h2 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-2">
              Cover letter draft
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              This is a skeleton — the bracketed parts must come from you. Judges and recruiters can spot a pure-AI cover letter.
            </p>
            <pre className="whitespace-pre-wrap p-4 rounded-md border border-hairline bg-bg text-sm font-mono text-ink leading-relaxed">
              {result.coverLetterDraft}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
