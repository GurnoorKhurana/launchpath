import { useState } from "react";
import TailorPanel from "@/features/TailorPanel";
import CareerChatPanel from "@/features/CareerChatPanel";

type Tab = "tailor" | "career";

const tabs: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "tailor", label: "Resume Tailor", hint: "Match your resume to a job posting" },
  { id: "career", label: "Career Path", hint: "Explore realistic paths and recertification" },
];

export default function App() {
  const [active, setActive] = useState<Tab>("tailor");
  const activeMeta = tabs.find((t) => t.id === active)!;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">LaunchPath</h1>
        <p className="text-muted-foreground mt-1">
          Career empowerment for newcomers, students, and anyone who has been told to wait their turn.
        </p>
      </header>

      <nav className="flex gap-2 mb-6 border-b border-border" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={
              "px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors " +
              (active === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <p className="text-sm text-muted-foreground mb-6">{activeMeta.hint}</p>

      {active === "tailor" && <TailorPanel />}
      {active === "career" && <CareerChatPanel />}
    </div>
  );
}
