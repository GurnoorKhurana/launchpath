import { useMemo, useState } from "react";
import {
  ApiError,
  careerPaths,
  type CareerBranch,
  type CareerProfile,
  type EmployedBranch,
  type IncomeWithin,
  type NewcomerBranch,
  type OpenToRelocate,
  type StudentBranch,
  type SwitcherBranch,
  type UserType,
} from "@/lib/api";
import type { Roadmap } from "@/lib/roadmap";
import { RoadmapCard } from "@/components/RoadmapCard";

const TOTAL_STEPS = 7;

const PROVINCES = [
  "Ontario",
  "Quebec",
  "British Columbia",
  "Alberta",
  "Manitoba",
  "Saskatchewan",
  "Nova Scotia",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Prince Edward Island",
  "Northwest Territories",
  "Yukon",
  "Nunavut",
];

const FIELD_CATEGORIES = [
  "Engineering",
  "Healthcare",
  "Tech / SWE",
  "Skilled trades",
  "Business",
  "Education",
  "Skilled service",
  "Arts / Creative",
  "Other",
];

const USER_TYPE_OPTIONS: { value: UserType; label: string; hint: string }[] = [
  { value: "newcomer", label: "Newcomer to Canada", hint: "I moved here recently and want to use my background." },
  { value: "student", label: "Student / recent grad", hint: "I'm in school or just finished." },
  { value: "switcher", label: "Career switcher", hint: "I want to change fields after years in another role." },
  { value: "employed", label: "Currently employed, exploring", hint: "I have a job but I'm thinking about a change." },
];

const DEGREE_LEVELS = ["High school", "Diploma", "Bachelor's", "Master's", "PhD"];
const LANG_LEVELS = ["Native", "Fluent", "Conversational", "Beginner", "None"];
const DOCUMENT_OPTIONS = [
  "Degree certificate",
  "Transcripts",
  "Professional license",
  "Reference letters",
  "Work permit",
  "PR card",
];
const EVALUATION_STATUSES = ["Not yet", "In progress (WES)", "In progress (other)", "Completed"];

const STUDENT_LEVELS = ["High school senior", "Undergraduate", "Graduate"];

const SWITCH_REASONS = [
  "Stagnation",
  "Pay",
  "Values mismatch",
  "Industry decline",
  "Interest shift",
  "Health",
  "Other",
];

const CHANGE_SHAPES = [
  "Bigger role in same field",
  "Adjacent field",
  "Total pivot",
  "Just curious",
];

const INCOME_OPTIONS: { value: IncomeWithin; label: string }[] = [
  { value: "<3m", label: "Less than 3 months" },
  { value: "3-6m", label: "3 to 6 months" },
  { value: "6-12m", label: "6 to 12 months" },
  { value: "1y+", label: "More than 1 year" },
];

const RETRAINING_OPTIONS = [
  "Short certificate",
  "Bridging program",
  "Full degree",
  "Self-study only",
  "Not really",
];

const RIASEC_LABELS: { key: "R" | "I" | "A" | "S" | "E" | "C"; label: string }[] = [
  { key: "R", label: "Working with my hands, building or fixing things" },
  { key: "I", label: "Analyzing data, solving puzzles, doing research" },
  { key: "A", label: "Creating, designing, writing" },
  { key: "S", label: "Helping, teaching, or counseling people" },
  { key: "E", label: "Leading, persuading, or selling" },
  { key: "C", label: "Organizing, working with detail, following procedures" },
];

interface PartialProfile {
  userType?: UserType;
  geography: { province: string; city: string; openToRelocate: OpenToRelocate | "" };
  field: { category: string; subSpecialty: string };
  branch: Partial<NewcomerBranch & StudentBranch & SwitcherBranch & EmployedBranch & { documents: string[]; reasonsForSwitching: string[] }>;
  constraints: { incomeWithin: IncomeWithin | ""; retraining: string; hoursPerWeek: number | "" };
  interests: { R: number; I: number; A: number; S: number; E: number; C: number };
  notes: string;
}

function emptyProfile(): PartialProfile {
  return {
    userType: undefined,
    geography: { province: "", city: "", openToRelocate: "" },
    field: { category: "", subSpecialty: "" },
    branch: { documents: [], reasonsForSwitching: [] },
    constraints: { incomeWithin: "", retraining: "", hoursPerWeek: "" },
    interests: { R: 3, I: 3, A: 3, S: 3, E: 3, C: 3 },
    notes: "",
  };
}

function buildBranch(userType: UserType, b: PartialProfile["branch"]): CareerBranch {
  switch (userType) {
    case "newcomer":
      return {
        countryOfDegree: b.countryOfDegree ?? "",
        degreeLevel: b.degreeLevel ?? "",
        yearsExperience: typeof b.yearsExperience === "number" ? b.yearsExperience : 0,
        documents: b.documents ?? [],
        evaluationStatus: b.evaluationStatus ?? "",
        englishLevel: b.englishLevel ?? "",
        frenchLevel: b.frenchLevel ?? "",
      };
    case "student":
      return {
        currentLevel: b.currentLevel ?? "",
        program: b.program ?? "",
        expectedGraduation: b.expectedGraduation ?? "",
        pastWork: b.pastWork ?? "",
      };
    case "switcher":
      return {
        currentRole: b.currentRole ?? "",
        yearsInRole: typeof b.yearsInRole === "number" ? b.yearsInRole : 0,
        reasonsForSwitching: b.reasonsForSwitching ?? [],
      };
    case "employed":
      return {
        currentRole: b.currentRole ?? "",
        industry: b.industry ?? "",
        changeShape: b.changeShape ?? "",
      };
  }
}

function stepValid(step: number, p: PartialProfile): boolean {
  if (step === 0) return !!p.userType;
  if (step === 1) return p.geography.province !== "" && p.geography.city.trim() !== "" && p.geography.openToRelocate !== "";
  if (step === 2) return p.field.category !== "" && p.field.subSpecialty.trim() !== "";
  if (step === 3) {
    if (!p.userType) return false;
    if (p.userType === "newcomer") {
      const b = p.branch;
      return !!b.countryOfDegree && !!b.degreeLevel && typeof b.yearsExperience === "number" && !!b.evaluationStatus && !!b.englishLevel && !!b.frenchLevel;
    }
    if (p.userType === "student") {
      const b = p.branch;
      return !!b.currentLevel && !!b.program && !!b.expectedGraduation;
    }
    if (p.userType === "switcher") {
      const b = p.branch;
      return !!b.currentRole && typeof b.yearsInRole === "number" && (b.reasonsForSwitching ?? []).length > 0;
    }
    if (p.userType === "employed") {
      const b = p.branch;
      return !!b.currentRole && !!b.industry && !!b.changeShape;
    }
  }
  if (step === 4) {
    return p.constraints.incomeWithin !== "" && p.constraints.retraining !== "" && typeof p.constraints.hoursPerWeek === "number";
  }
  if (step === 5) return true; // interests always have defaults
  if (step === 6) return true; // notes optional
  return false;
}

function toFinalProfile(p: PartialProfile): CareerProfile {
  return {
    userType: p.userType!,
    geography: { province: p.geography.province, city: p.geography.city.trim(), openToRelocate: p.geography.openToRelocate as OpenToRelocate },
    field: { category: p.field.category, subSpecialty: p.field.subSpecialty.trim() },
    branch: buildBranch(p.userType!, p.branch),
    constraints: {
      incomeWithin: p.constraints.incomeWithin as IncomeWithin,
      retraining: p.constraints.retraining,
      hoursPerWeek: Number(p.constraints.hoursPerWeek),
    },
    interests: p.interests,
    notes: p.notes.trim() === "" ? undefined : p.notes.trim(),
  };
}

// ---- Reusable form controls -------------------------------------------------

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-1.5">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full h-10 px-3 rounded-lg border border-hairline bg-surface text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent " +
        (props.className ?? "")
      }
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className={
        "w-full h-10 px-3 rounded-lg border border-hairline bg-surface text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent " +
        (props.className ?? "")
      }
    >
      {children}
    </select>
  );
}

function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | "" | undefined;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => {
        const isActive = value === o.value;
        return (
          <label
            key={o.value}
            className={
              "flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors " +
              (isActive
                ? "border-accent bg-accent-soft"
                : "border-hairline bg-surface hover:border-[#C7D2FE]")
            }
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={isActive}
              onChange={() => onChange(o.value)}
              className="mt-1 accent-accent"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm text-ink font-medium">{o.label}</span>
              {o.hint && <span className="text-[12px] text-muted-foreground">{o.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CheckboxGroup({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {options.map((o) => {
        const isActive = values.includes(o);
        return (
          <label
            key={o}
            className={
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors " +
              (isActive ? "border-accent bg-accent-soft text-ink" : "border-hairline bg-surface text-body hover:border-[#C7D2FE]")
            }
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => toggle(o)}
              className="accent-accent"
            />
            {o}
          </label>
        );
      })}
    </div>
  );
}

function Slider({ value, onChange, ariaLabel }: { value: number; onChange: (n: number) => void; ariaLabel: string }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="flex-1 accent-accent"
      />
      <span className="font-mono text-[12px] text-ink w-6 text-right">{value}</span>
    </div>
  );
}

// ---- Step components --------------------------------------------------------

function Step0UserType({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">Pick the option that fits you best. The next questions adapt to your answer.</p>
      <RadioGroup<UserType>
        name="userType"
        value={p.userType}
        options={USER_TYPE_OPTIONS}
        onChange={(v) => set({ ...p, userType: v, branch: { documents: [], reasonsForSwitching: [] } })}
      />
    </div>
  );
}

function Step1Geography({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Province</Label>
        <Select
          value={p.geography.province}
          onChange={(e) => set({ ...p, geography: { ...p.geography, province: e.target.value } })}
        >
          <option value="">Select a province…</option>
          {PROVINCES.map((pr) => (
            <option key={pr} value={pr}>{pr}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>City or town</Label>
        <TextInput
          value={p.geography.city}
          onChange={(e) => set({ ...p, geography: { ...p.geography, city: e.target.value } })}
          placeholder="e.g. Toronto, Calgary, Halifax"
        />
      </div>
      <div>
        <Label>Open to relocating within Canada?</Label>
        <RadioGroup<OpenToRelocate>
          name="openToRelocate"
          value={p.geography.openToRelocate === "" ? undefined : p.geography.openToRelocate}
          options={[
            { value: "yes", label: "Yes" },
            { value: "maybe", label: "Maybe — depends on the opportunity" },
            { value: "no", label: "No" },
          ]}
          onChange={(v) => set({ ...p, geography: { ...p.geography, openToRelocate: v } })}
        />
      </div>
    </div>
  );
}

function Step2Field({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Field of interest</Label>
        <Select
          value={p.field.category}
          onChange={(e) => set({ ...p, field: { ...p.field, category: e.target.value } })}
        >
          <option value="">Select a category…</option>
          {FIELD_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Sub-specialty or focus area</Label>
        <TextInput
          value={p.field.subSpecialty}
          onChange={(e) => set({ ...p, field: { ...p.field, subSpecialty: e.target.value } })}
          placeholder='e.g. "roads and bridges", "ICU nursing", "back-end Python"'
        />
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Be specific — this helps shape realistic paths instead of generic ones.
        </p>
      </div>
    </div>
  );
}

function Step3Newcomer({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  const b = p.branch;
  function update(patch: Partial<typeof b>) {
    set({ ...p, branch: { ...b, ...patch } });
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Country your degree was earned in</Label>
        <TextInput
          value={b.countryOfDegree ?? ""}
          onChange={(e) => update({ countryOfDegree: e.target.value })}
          placeholder="e.g. Syria, India, Philippines"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Highest degree level</Label>
          <Select value={b.degreeLevel ?? ""} onChange={(e) => update({ degreeLevel: e.target.value })}>
            <option value="">Select…</option>
            {DEGREE_LEVELS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </div>
        <div>
          <Label>Years of professional experience</Label>
          <TextInput
            type="number"
            min={0}
            value={b.yearsExperience ?? ""}
            onChange={(e) => update({ yearsExperience: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="e.g. 10"
          />
        </div>
      </div>
      <div>
        <Label>Documents you have</Label>
        <CheckboxGroup
          options={DOCUMENT_OPTIONS}
          values={b.documents ?? []}
          onChange={(next) => update({ documents: next })}
        />
      </div>
      <div>
        <Label>Credential evaluation status</Label>
        <Select value={b.evaluationStatus ?? ""} onChange={(e) => update({ evaluationStatus: e.target.value })}>
          <option value="">Select…</option>
          {EVALUATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>English level</Label>
          <Select value={b.englishLevel ?? ""} onChange={(e) => update({ englishLevel: e.target.value })}>
            <option value="">Select…</option>
            {LANG_LEVELS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </div>
        <div>
          <Label>French level</Label>
          <Select value={b.frenchLevel ?? ""} onChange={(e) => update({ frenchLevel: e.target.value })}>
            <option value="">Select…</option>
            {LANG_LEVELS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </div>
      </div>
    </div>
  );
}

function Step3Student({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  const b = p.branch;
  function update(patch: Partial<typeof b>) {
    set({ ...p, branch: { ...b, ...patch } });
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Current education level</Label>
        <RadioGroup
          name="currentLevel"
          value={(b.currentLevel as any) ?? undefined}
          options={STUDENT_LEVELS.map((l) => ({ value: l, label: l }))}
          onChange={(v) => update({ currentLevel: v })}
        />
      </div>
      <div>
        <Label>Program or major</Label>
        <TextInput
          value={b.program ?? ""}
          onChange={(e) => update({ program: e.target.value })}
          placeholder="e.g. Computer Science, Civil Engineering"
        />
      </div>
      <div>
        <Label>Expected graduation</Label>
        <TextInput
          type="month"
          value={b.expectedGraduation ?? ""}
          onChange={(e) => update({ expectedGraduation: e.target.value })}
        />
      </div>
      <div>
        <Label>Past internships or part-time jobs (optional)</Label>
        <textarea
          value={b.pastWork ?? ""}
          onChange={(e) => update({ pastWork: e.target.value })}
          rows={3}
          className="w-full p-3 rounded-lg border border-hairline bg-surface text-sm text-ink resize-none outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="Describe briefly — anything that taught you skills."
        />
      </div>
    </div>
  );
}

function Step3Switcher({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  const b = p.branch;
  function update(patch: Partial<typeof b>) {
    set({ ...p, branch: { ...b, ...patch } });
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
        <div>
          <Label>Current or most recent role</Label>
          <TextInput
            value={b.currentRole ?? ""}
            onChange={(e) => update({ currentRole: e.target.value })}
            placeholder="e.g. Pharmacy Technician, Marketing Manager"
          />
        </div>
        <div>
          <Label>Years in that role</Label>
          <TextInput
            type="number"
            min={0}
            value={b.yearsInRole ?? ""}
            onChange={(e) => update({ yearsInRole: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label>Why switching?</Label>
        <CheckboxGroup
          options={SWITCH_REASONS}
          values={b.reasonsForSwitching ?? []}
          onChange={(next) => update({ reasonsForSwitching: next })}
        />
      </div>
    </div>
  );
}

function Step3Employed({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  const b = p.branch;
  function update(patch: Partial<typeof b>) {
    set({ ...p, branch: { ...b, ...patch } });
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Current role</Label>
          <TextInput
            value={b.currentRole ?? ""}
            onChange={(e) => update({ currentRole: e.target.value })}
            placeholder="e.g. Product Manager"
          />
        </div>
        <div>
          <Label>Industry</Label>
          <TextInput
            value={b.industry ?? ""}
            onChange={(e) => update({ industry: e.target.value })}
            placeholder="e.g. fintech, healthcare"
          />
        </div>
      </div>
      <div>
        <Label>What would change feel like?</Label>
        <RadioGroup
          name="changeShape"
          value={(b.changeShape as any) ?? undefined}
          options={CHANGE_SHAPES.map((c) => ({ value: c, label: c }))}
          onChange={(v) => update({ changeShape: v })}
        />
      </div>
    </div>
  );
}

function Step4Constraints({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>How soon do you need income?</Label>
        <RadioGroup<IncomeWithin>
          name="incomeWithin"
          value={p.constraints.incomeWithin === "" ? undefined : p.constraints.incomeWithin}
          options={INCOME_OPTIONS}
          onChange={(v) => set({ ...p, constraints: { ...p.constraints, incomeWithin: v } })}
        />
      </div>
      <div>
        <Label>How willing are you to retrain?</Label>
        <RadioGroup
          name="retraining"
          value={p.constraints.retraining === "" ? undefined : p.constraints.retraining}
          options={RETRAINING_OPTIONS.map((r) => ({ value: r, label: r }))}
          onChange={(v) => set({ ...p, constraints: { ...p.constraints, retraining: v } })}
        />
      </div>
      <div>
        <Label>Hours per week you can spend on upskilling</Label>
        <TextInput
          type="number"
          min={0}
          value={p.constraints.hoursPerWeek === "" ? "" : p.constraints.hoursPerWeek}
          onChange={(e) =>
            set({
              ...p,
              constraints: { ...p.constraints, hoursPerWeek: e.target.value === "" ? "" : Number(e.target.value) },
            })
          }
          placeholder="e.g. 10"
        />
      </div>
    </div>
  );
}

function Step5Interests({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        For each activity, drag the slider to show how much you enjoy it (1 = not at all, 5 = love it).
      </p>
      {RIASEC_LABELS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Label>{label}</Label>
          <Slider
            value={p.interests[key]}
            onChange={(n) => set({ ...p, interests: { ...p.interests, [key]: n } })}
            ariaLabel={label}
          />
        </div>
      ))}
    </div>
  );
}

function Step6Notes({ p, set }: { p: PartialProfile; set: (next: PartialProfile) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Label>Anything else important? (optional)</Label>
      <textarea
        value={p.notes}
        onChange={(e) => set({ ...p, notes: e.target.value })}
        rows={5}
        className="w-full p-3 rounded-lg border border-hairline bg-surface text-sm text-ink resize-none outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent"
        placeholder="Family situation, health, prior bad experiences, employers you've tried, languages you speak…"
      />
      <p className="text-[12px] text-muted-foreground">
        Skip this if nothing comes to mind. We'll generate your roadmap from what you've already told us.
      </p>
    </div>
  );
}

// ---- Main panel -------------------------------------------------------------

const STEP_TITLES = [
  "Who are you?",
  "Where you are",
  "Field of interest",
  "Your background",
  "Constraints and runway",
  "What energizes you",
  "Anything else?",
];

export default function CareerPathForm() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<PartialProfile>(emptyProfile());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  const canAdvance = useMemo(() => stepValid(step, profile), [step, profile]);

  function onNext() {
    if (!canAdvance) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      void onSubmit();
    }
  }

  function onBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const finalProfile = toFinalProfile(profile);
      const { roadmap: r } = await careerPaths(finalProfile);
      setRoadmap(r);
    } catch (e: any) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError(e?.message ?? "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onEdit() {
    setRoadmap(null);
    setStep(0);
  }

  function onPrint() {
    window.print();
  }

  if (roadmap) {
    return (
      <div className="space-y-4">
        <section data-print="roadmap" className="border border-hairline bg-surface rounded-lg p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-baseline gap-3">
              <h2 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                Your career roadmap
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Built from your answers
              </span>
            </div>
            <button
              onClick={onPrint}
              data-print-hide="true"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-bg text-ink font-sans font-medium text-[13px] rounded-lg border border-hairline tracking-[-0.005em] hover:border-accent hover:text-accent"
            >
              <span className="font-mono text-[11px]">↓</span> Download as PDF
            </button>
          </div>
          <RoadmapCard roadmap={roadmap} />
          <p className="mt-4 text-[11px] text-muted-foreground italic">
            Tip: choose <span className="font-mono">Save as PDF</span> in the print dialog to keep this roadmap.
          </p>
        </section>

        <button
          onClick={onEdit}
          className="text-xs text-muted-foreground hover:text-body border-b border-dashed border-[#D4D4D4] pb-px"
        >
          Edit my answers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Step {step + 1} of {TOTAL_STEPS}
        </span>
        <div className="flex-1 ml-3 h-1 bg-[#F5F5F5] rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <section className="border border-hairline bg-surface rounded-lg p-5">
        <h2 className="m-0 mb-4 text-[18px] font-semibold tracking-[-0.018em] text-ink leading-tight">
          {STEP_TITLES[step]}
        </h2>

        {step === 0 && <Step0UserType p={profile} set={setProfile} />}
        {step === 1 && <Step1Geography p={profile} set={setProfile} />}
        {step === 2 && <Step2Field p={profile} set={setProfile} />}
        {step === 3 && profile.userType === "newcomer" && <Step3Newcomer p={profile} set={setProfile} />}
        {step === 3 && profile.userType === "student" && <Step3Student p={profile} set={setProfile} />}
        {step === 3 && profile.userType === "switcher" && <Step3Switcher p={profile} set={setProfile} />}
        {step === 3 && profile.userType === "employed" && <Step3Employed p={profile} set={setProfile} />}
        {step === 4 && <Step4Constraints p={profile} set={setProfile} />}
        {step === 5 && <Step5Interests p={profile} set={setProfile} />}
        {step === 6 && <Step6Notes p={profile} set={setProfile} />}
      </section>

      {error && (
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={step === 0 || submitting}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-bg text-ink font-sans font-medium text-[13px] rounded-lg border border-hairline tracking-[-0.005em] disabled:opacity-30 disabled:cursor-not-allowed hover:border-accent"
        >
          <span className="font-mono text-[11px]">←</span> Back
        </button>
        <button
          onClick={onNext}
          disabled={!canAdvance || submitting}
          className="inline-flex items-center gap-1.5 h-11 px-[18px] bg-accent text-white font-sans font-semibold text-sm rounded-lg tracking-[-0.005em] shadow-[0_1px_0_rgba(10,10,10,0.04),inset_0_-1px_0_rgba(0,0,0,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Building roadmap…" : step === TOTAL_STEPS - 1 ? "Generate my roadmap" : "Next"}
          {!submitting && <span className="font-mono font-medium">→</span>}
        </button>
      </div>
    </div>
  );
}
