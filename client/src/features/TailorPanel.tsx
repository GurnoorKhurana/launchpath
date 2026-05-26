import { useEffect, useRef, useState } from "react";
import { ApiError, tailor, type JdAnalysis, type TailorResult } from "@/lib/api";

type JobInputMode = "paste" | "url";
type Phase = "idle" | "fetching" | "analyzing" | "tailoring" | "done";

const PHASE_LABEL: Record<Exclude<Phase, "idle" | "done">, string> = {
  fetching: "Reading job posting…",
  analyzing: "Analyzing requirements…",
  tailoring: "Tailoring your resume…",
};

export default function TailorPanel() {
  const [resumeText, setResumeText] = useState("");
  const [jobMode, setJobMode] = useState<JobInputMode>("paste");
  const [jobText, setJobText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [triedUrl, setTriedUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);

  const phaseTimers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      phaseTimers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  function startPhaseSchedule(usingUrl: boolean) {
    phaseTimers.current.forEach((t) => window.clearTimeout(t));
    phaseTimers.current = [];

    if (usingUrl) {
      setPhase("fetching");
      phaseTimers.current.push(window.setTimeout(() => setPhase("analyzing"), 1800));
      phaseTimers.current.push(window.setTimeout(() => setPhase("tailoring"), 5500));
    } else {
      setPhase("analyzing");
      phaseTimers.current.push(window.setTimeout(() => setPhase("tailoring"), 3500));
    }
  }

  function stopPhaseSchedule() {
    phaseTimers.current.forEach((t) => window.clearTimeout(t));
    phaseTimers.current = [];
  }

  async function onTailor() {
    setError(null);
    setResult(null);
    setTriedUrl(null);

    const usingUrl = jobMode === "url";
    if (usingUrl && jobUrl.trim() === "") {
      setError("Paste a job URL or switch to paste mode.");
      return;
    }
    if (!usingUrl && jobText.trim() === "") {
      setError("Paste the job description or switch to URL mode.");
      return;
    }
    if (resumeText.trim() === "") {
      setError("Paste your resume first.");
      return;
    }

    startPhaseSchedule(usingUrl);

    try {
      const out = await tailor({
        resumeText,
        ...(usingUrl ? { jobUrl: jobUrl.trim() } : { jobText: jobText.trim() }),
      });
      stopPhaseSchedule();
      setPhase("done");
      setResult(out);
    } catch (e: any) {
      stopPhaseSchedule();
      setPhase("idle");
      if (e instanceof ApiError && e.status === 422) {
        setTriedUrl(jobUrl.trim());
        setJobMode("paste");
        setError(e.message);
      } else {
        setError(e?.message ?? "Something went wrong");
      }
    }
  }

  const loading = phase !== "idle" && phase !== "done";
  const canSubmit =
    !loading &&
    resumeText.trim().length > 0 &&
    (jobMode === "url" ? jobUrl.trim().length > 0 : jobText.trim().length > 0);

  return (
    <div>
      <section className="grid md:grid-cols-2 gap-4 mb-5">
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
              Job posting
            </label>
            <div className="inline-flex rounded-md border border-hairline bg-bg p-0.5 text-[12px]">
              <button
                type="button"
                onClick={() => setJobMode("paste")}
                className={
                  "px-2.5 py-1 rounded-sm font-medium transition-colors " +
                  (jobMode === "paste" ? "bg-surface text-ink shadow-sm" : "text-muted-foreground hover:text-body")
                }
              >
                Paste
              </button>
              <button
                type="button"
                onClick={() => setJobMode("url")}
                className={
                  "px-2.5 py-1 rounded-sm font-medium transition-colors " +
                  (jobMode === "url" ? "bg-surface text-ink shadow-sm" : "text-muted-foreground hover:text-body")
                }
              >
                URL
              </button>
            </div>
          </div>

          {jobMode === "paste" ? (
            <>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the full job posting here..."
                className="w-full h-64 p-3.5 rounded-lg border border-hairline bg-surface text-sm font-mono text-ink resize-none outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent"
              />
              {triedUrl && (
                <p className="mt-1.5 text-[12px] text-muted-foreground italic">
                  Tried: <span className="font-mono">{triedUrl}</span> — couldn't read it, so paste it here instead.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://example.com/jobs/12345"
                className="w-full h-11 px-3 rounded-lg border border-hairline bg-surface text-sm font-mono text-ink outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <p className="text-[12px] text-muted-foreground leading-snug">
                Works best with Greenhouse, Lever, Indeed, and company career pages. LinkedIn jobs usually require pasting because they hide content behind login.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={onTailor}
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 h-11 px-[18px] bg-accent text-white font-sans font-semibold text-sm rounded-lg tracking-[-0.005em] shadow-[0_1px_0_rgba(10,10,10,0.04),inset_0_-1px_0_rgba(0,0,0,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Working…" : "Tailor my resume"}
          {!loading && <span className="font-mono font-medium">→</span>}
        </button>
        {loading && (
          <PhaseIndicator phase={phase} />
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {result.jdAnalysis && (
            <JdAnalysisSection analysis={result.jdAnalysis} fetched={result.fetched} />
          )}

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

function PhaseIndicator({ phase }: { phase: Phase }) {
  if (phase === "idle" || phase === "done") return null;
  return (
    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      <span>{PHASE_LABEL[phase]}</span>
    </div>
  );
}

function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "muted" | "keyword" | "warn" }) {
  const cls =
    tone === "muted"
      ? "border-hairline bg-bg text-muted-foreground"
      : tone === "keyword"
        ? "border-accent text-accent bg-accent-soft font-mono"
        : tone === "warn"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-hairline bg-[#F5F5F5] text-ink";
  return (
    <span className={"inline-block px-2 py-1 rounded-sm border text-[12px] leading-none " + cls}>
      {children}
    </span>
  );
}

function JdAnalysisSection({
  analysis,
  fetched,
}: {
  analysis: JdAnalysis;
  fetched?: { source: string; title?: string };
}) {
  const hasRedFlags = analysis.redFlags && analysis.redFlags.length > 0;
  return (
    <section className="bg-surface border border-hairline rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-ink">
          What we found in the job
        </h2>
        {fetched && (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Source: {fetched.source === "json-ld" ? "Structured data" : "Page text"}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[15px] font-semibold text-ink">{analysis.roleTitle}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-sm border border-hairline bg-[#F5F5F5] text-body">
          {analysis.seniority}
        </span>
      </div>

      {analysis.mustHaves.length > 0 && (
        <div className="mb-3">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-1.5">
            Must-haves
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.mustHaves.map((m, i) => <Chip key={i}>{m}</Chip>)}
          </div>
        </div>
      )}

      {analysis.niceToHaves.length > 0 && (
        <div className="mb-3">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-1.5">
            Nice-to-haves
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.niceToHaves.map((m, i) => <Chip key={i} tone="muted">{m}</Chip>)}
          </div>
        </div>
      )}

      {analysis.keywords.length > 0 && (
        <div className="mb-3">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-1.5">
            Keywords mirrored in your bullets
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.keywords.map((k, i) => <Chip key={i} tone="keyword">{k}</Chip>)}
          </div>
        </div>
      )}

      {analysis.employerSignals.length > 0 && (
        <p className="text-[12px] text-muted-foreground italic mt-2">
          Employer signals: {analysis.employerSignals.join(" · ")}
        </p>
      )}

      {hasRedFlags && (
        <div className="mt-3">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-red-900 font-medium mb-1.5">
            Things to watch out for
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.redFlags!.map((r, i) => <Chip key={i} tone="warn">{r}</Chip>)}
          </div>
        </div>
      )}
    </section>
  );
}
