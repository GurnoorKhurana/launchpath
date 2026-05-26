import type { Roadmap } from "@/lib/roadmap";
import { Markdown } from "@/lib/markdown";

interface Props {
  roadmap: Roadmap;
}

const CHIP_LABELS = ["FAST TRACK", "CREDENTIAL-ALIGNED", "STRATEGIC PIVOT"];

function chipLabelFor(index: number, total: number): string {
  if (total === 3) return CHIP_LABELS[index];
  return `PATH ${String(index + 1).padStart(2, "0")}`;
}

export function RoadmapCard({ roadmap }: Props) {
  const total = roadmap.paths.length;

  return (
    <div className="mt-4 grid md:grid-cols-3 gap-4">
      {/* Local styles for leading-zero ordered list counters + selected variants */}
      <style>{`
        .lp-steps {
          list-style: none;
          margin: 4px 0 0 0;
          padding: 0;
          counter-reset: step;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lp-steps > li {
          counter-increment: step;
          position: relative;
          padding-left: 28px;
          font-size: 13px;
          color: #525252;
          line-height: 1.5;
        }
        .lp-steps > li::before {
          content: counter(step, decimal-leading-zero);
          position: absolute;
          left: 0;
          top: 1px;
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: 10px;
          font-weight: 500;
          color: #A3A3A3;
          background: #F5F5F5;
          border: 1px solid #E5E5E5;
          border-radius: 3px;
          padding: 2px 4px;
          line-height: 1;
          letter-spacing: 0.02em;
        }
        .lp-card-selected .lp-steps > li::before {
          color: #4F46E5;
          background: #EEF2FF;
          border-color: #C7D2FE;
        }
        .lp-certs {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .lp-certs > li {
          font-size: 13px;
          color: #0A0A0A;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.45;
        }
        .lp-certs > li::before {
          content: "";
          width: 6px;
          height: 6px;
          background: #0A0A0A;
          margin-top: 7px;
          flex-shrink: 0;
          border-radius: 1px;
        }
        .lp-card-selected .lp-certs > li::before {
          background: #4F46E5;
        }
      `}</style>

      {roadmap.paths.map((p, i) => {
        const selected = total >= 3 && i === 1; // middle card is the "selected" emphasis
        const chip = chipLabelFor(i, total);

        return (
          <article
            key={i}
            className={
              "relative flex flex-col gap-3.5 bg-surface border rounded-lg p-5 pt-[22px] " +
              (selected
                ? "lp-card-selected border-accent shadow-[0_0_0_3px_rgba(79,70,229,0.25),0_4px_20px_rgba(79,70,229,0.12)] -translate-y-0.5"
                : "border-hairline")
            }
            aria-current={selected ? "true" : undefined}
          >
            {/* Head: chip + index */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={
                  "font-mono text-[10px] font-medium uppercase tracking-[0.08em] px-2 py-1 rounded-sm border leading-none " +
                  (selected
                    ? "text-accent bg-accent-soft border-[#C7D2FE]"
                    : "text-body bg-[#F5F5F5] border-hairline")
                }
              >
                {chip}
              </span>
              <span
                className={
                  "font-mono text-[11px] tracking-[0.05em] " +
                  (selected ? "text-accent" : "text-muted-foreground")
                }
              >
                {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>

            {/* Title */}
            <h3 className="m-0 text-[18px] font-semibold tracking-[-0.018em] text-ink leading-[1.25]">
              {p.title}
            </h3>

            {/* Timeline meta row */}
            <div className="flex items-center justify-between gap-2 py-2 border-y border-dashed border-hairline">
              <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
                Timeline
              </span>
              <span className="font-mono text-[12px] text-ink font-medium">
                {p.timeline}
              </span>
            </div>

            {/* Steps */}
            <div>
              <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
                Steps
              </span>
              <ol className="lp-steps">
                {p.steps.map((s, j) => (
                  <li key={j}>
                    <Markdown text={s} preserveWhitespace={false} />
                  </li>
                ))}
              </ol>
            </div>

            {/* Certifications */}
            {p.certifications.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
                  Certifications
                </span>
                <ul className="lp-certs">
                  {p.certifications.map((c, j) => (
                    <li key={j}>
                      <Markdown text={c} preserveWhitespace={false} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Salary */}
            <div className="mt-auto pt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
                Realistic salary
              </span>
              <span
                className={
                  "font-mono text-sm font-semibold tracking-[-0.01em] " +
                  (selected ? "text-accent" : "text-ink")
                }
              >
                {p.realistic_salary_range_cad}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
