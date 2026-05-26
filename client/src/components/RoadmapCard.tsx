import type { Roadmap } from "@/lib/roadmap";

interface Props {
  roadmap: Roadmap;
}

export function RoadmapCard({ roadmap }: Props) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
        Suggested paths
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        {roadmap.paths.map((p, i) => (
          <div key={i} className="p-4 rounded-md border border-border bg-background shadow-sm">
            <h3 className="font-semibold text-sm mb-1">{p.title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{p.timeline}</p>

            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
              Steps
            </p>
            <ol className="list-decimal pl-4 text-xs space-y-1 mb-3">
              {p.steps.map((s, j) => <li key={j}>{s}</li>)}
            </ol>

            {p.certifications.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                  Certifications
                </p>
                <ul className="text-xs space-y-1 mb-3">
                  {p.certifications.map((c, j) => <li key={j}>• {c}</li>)}
                </ul>
              </>
            )}

            <p className="text-xs">
              <span className="text-muted-foreground">Realistic salary:</span>{" "}
              <span className="font-medium">{p.realistic_salary_range_cad}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
