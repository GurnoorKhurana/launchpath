import { useState } from "react";
import TailorPanel from "@/features/TailorPanel";
import CareerPathForm from "@/features/CareerPathForm";

type Tab = "tailor" | "career";

const tabs: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "tailor", label: "Resume Tailor", hint: "Paste a job description or URL — we'll analyze it and tailor your resume" },
  { id: "career", label: "Career Path", hint: "Answer a few questions to see realistic paths" },
];

export default function App() {
  const [active, setActive] = useState<Tab>("tailor");
  const activeMeta = tabs.find((t) => t.id === active)!;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1140px] mx-auto px-6 md:px-8 py-10 pb-20">
        <header className="flex items-start md:items-center gap-4 pb-6 border-b border-hairline">
          <div
            aria-hidden="true"
            className="w-6 h-6 bg-accent rounded-sm flex-shrink-0 mt-1 md:mt-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
          />
          <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 flex-1 min-w-0">
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink leading-none">
              LaunchPath
            </h1>
            <p className="text-[13px] text-muted-foreground m-0 leading-snug">
              Career empowerment for newcomers, students, and anyone who has been told to wait their turn.
            </p>
          </div>
        </header>

        <nav
          className="mt-7 flex gap-1 border-b border-hairline relative"
          role="tablist"
        >
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                className={
                  "relative px-3.5 pt-2.5 pb-3 text-sm font-medium cursor-pointer bg-transparent border-0 rounded-t-md tracking-[-0.005em] " +
                  (isActive
                    ? "text-ink"
                    : "text-muted-foreground hover:text-body")
                }
              >
                {t.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-2.5 right-2.5 -bottom-px h-0.5 bg-accent rounded-sm"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <p className="mt-3.5 text-[13px] text-muted-foreground tracking-[-0.005em]">
          {activeMeta.hint}
        </p>

        <div className="mt-9">
          {active === "tailor" && <TailorPanel />}
          {active === "career" && <CareerPathForm />}
        </div>

        <footer className="mt-12 pt-5 border-t border-hairline">
          <p className="text-[11px] text-muted-foreground leading-snug tracking-[-0.003em]">
            Nothing you type is saved or sent anywhere except Claude. No accounts, no tracking, no immigration system.
          </p>
        </footer>
      </div>
    </div>
  );
}
