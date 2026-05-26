# Career Path Explorer v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a conversational Career Path Explorer that asks targeted questions, knows Canadian recertification pathways (WES, CNO, NNAS, bridging programs), and ends with a structured `<roadmap>` block rendered as visual career paths. Wire it as a second tab alongside Tailor.

**Architecture:** Add tab-based navigation to `App.tsx`. New backend `/api/career-chat` endpoint accepts a message history and returns one assistant turn (non-streaming for v0). New `prompts/careerCoach.ts` system prompt with all the newcomer-credential knowledge baked in. New `CareerChat` component (chat window + input). New `RoadmapCard` component that detects the `<roadmap>` block in assistant text and renders it as styled cards.

**Tech Stack:** Same as v0-skeleton — React 19 + TS 6 + Tailwind v3 (client), Express + TS + Anthropic SDK (server), `claude-sonnet-4-6`. No new dependencies.

**Time budget:** ~3 hours. Tag the final commit `v1-career-chat`.

**Out of scope tonight (parked for Wed):** Streaming SSE, message persistence across tab switches, history sidebar, edit/regenerate, suggested follow-ups.

---

## File Structure

```
launchpath/
├── server/src/
│   ├── prompts/
│   │   ├── tailor.ts                       EXISTS
│   │   └── careerCoach.ts                  CREATE Task 2
│   ├── routes/
│   │   ├── tailor.ts                       EXISTS
│   │   └── careerChat.ts                   CREATE Task 3
│   ├── __tests__/
│   │   ├── tailor.contract.test.ts         EXISTS
│   │   └── careerChat.contract.test.ts     CREATE Task 3
│   └── index.ts                            MODIFY Task 3 — register route
├── client/src/
│   ├── App.tsx                             REWRITE Task 1 — tab shell
│   ├── features/
│   │   ├── TailorPanel.tsx                 CREATE Task 1 — extract current UI
│   │   └── CareerChatPanel.tsx             CREATE Task 4
│   ├── components/
│   │   ├── ChatWindow.tsx                  CREATE Task 4 — messages list + input
│   │   └── RoadmapCard.tsx                 CREATE Task 5 — render <roadmap> block
│   └── lib/
│       ├── api.ts                          EXTEND Task 4 — careerChat() helper
│       └── roadmap.ts                      CREATE Task 5 — parse <roadmap>{...}</roadmap>
```

Each new file has one clear responsibility. `App.tsx` becomes a thin shell. The current Tailor UI moves into `TailorPanel.tsx` without behavior changes.

---

## Task 1: Tab shell + Tailor extraction

Extract the current Tailor UI into its own component, replace `App.tsx` with a two-tab shell. No behavior changes — Tailor still works identically; Career Chat tab shows a placeholder.

**Files:**
- Create: `client/src/features/TailorPanel.tsx`
- Create: `client/src/features/CareerChatPanel.tsx` (placeholder only this task)
- Rewrite: `client/src/App.tsx`

- [ ] **Step 1: Create `client/src/features/TailorPanel.tsx`**

Move the EXISTING content of `client/src/App.tsx` body (everything inside the `App` component's return + the useState/handler logic) into this new file. Rename the exported function to `TailorPanel`. Keep imports for `tailor`, `type TailorResult`, `useState`. Remove the `<h1>LaunchPath</h1>` header and the subtitle paragraph — those move to `App.tsx`.

Final file shape:
```tsx
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
```

- [ ] **Step 2: Create `client/src/features/CareerChatPanel.tsx` placeholder**

```tsx
export default function CareerChatPanel() {
  return (
    <div className="p-6 rounded-md border border-border bg-muted text-sm text-muted-foreground">
      Career Path Explorer — coming up next in this build session.
    </div>
  );
}
```

This will be rewritten in Task 4. Placeholder lets us verify the tab shell works first.

- [ ] **Step 3: Rewrite `client/src/App.tsx`**

```tsx
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
```

- [ ] **Step 4: Verify build**

```
npm --prefix client run build
```
Expected: success.

- [ ] **Step 5: Live smoke test**

The dev server should still be running from earlier. If not, restart: `npm run dev` from repo root. Open `http://localhost:5173`. Confirm:
- Tab bar with two tabs
- "Resume Tailor" tab shows the same UI as before; Tailor still works on Priya's samples
- "Career Path" tab shows the placeholder

- [ ] **Step 6: Commit**

```
git add client/src/App.tsx client/src/features/
git commit -m "feat(client): tab shell + extract TailorPanel"
```

---

## Task 2: Career coach system prompt

**Files:**
- Create: `server/src/prompts/careerCoach.ts`

- [ ] **Step 1: Create the prompt file**

```typescript
export const CAREER_COACH_SYSTEM_PROMPT = `You are a career exploration coach for underrepresented job seekers in Canada — primarily newcomers with foreign credentials, but also students with no experience and mid-career switchers. You hold a conversation; you do not lecture.

Conversation style:
- Ask ONE question at a time. Never dump a list of 3+ questions in one turn.
- Keep your turns short (2-4 sentences plus the question). Long replies derail the conversation.
- Within 4-6 exchanges, build enough context to propose 3 realistic career directions.
- Always ask about country of education and credentials EARLY when the candidate hints at being a newcomer — this is the single highest-leverage data point.
- For students: ask about year of study, program, and what they actually enjoy doing (not what they think sounds impressive).
- For career switchers: ask why they want to switch — the answer changes the recommendation.

Domain knowledge you must use:
- Canadian credential pathways: WES (World Education Services) credential evaluation, NNAS for nurses, provincial regulatory bodies (College of Nurses of Ontario, Engineers Canada / PEO, CPA Canada, Ontario College of Teachers, etc.).
- Bridging programs at Ontario colleges (Centennial, George Brown, Humber, Toronto Metropolitan University) for IENs (Internationally Educated Nurses), IEPs (Internationally Educated Professionals).
- Quick-entry alternatives that do NOT require recertification: PSW roles, healthcare administration, clinical research coordination, medical device sales — when a full re-credential is years away.
- Co-op and internship pathways for students in Toronto and the GTA.
- Realistic Canadian salary ranges for the roles you suggest.

Output format:
- During the conversation: plain conversational text, ONE question at a time. Friendly and direct, never patronizing.
- When you have enough context (typically after 4-6 exchanges), in your final turn ONLY, append a structured block at the very end of your response:

<roadmap>
{
  "paths": [
    {
      "title": "Short role/path title",
      "timeline": "e.g. '3-6 months' or '12-18 months'",
      "steps": ["Concrete step 1", "Concrete step 2", "Concrete step 3"],
      "certifications": ["Required cert or assessment names"],
      "realistic_salary_range_cad": "e.g. '$55,000 - $72,000 CAD'"
    }
  ]
}
</roadmap>

Rules for the roadmap:
- Exactly 3 paths.
- Each path is ACHIEVABLE given the person's actual situation. No "become a surgeon" if they're a high-schooler with no background.
- One path should be the fast track (3-12 months); one the credential-aligned track (12-24 months); one the strategic pivot (lateral move that uses transferable skills).
- Steps are concrete actions (e.g. "Register for WES ECA," not "Get credentials evaluated").
- Salary ranges are real-world Canadian data, not aspirational marketing.
- If you do NOT have enough context after 6 exchanges, ask one more question instead of forcing a weak roadmap.

Do not invent regulatory body names. If you are unsure of a specific program name, describe the type (e.g. "an Ontario college IEN bridging program") rather than fabricating.`;
```

- [ ] **Step 2: Commit**

```
git add server/src/prompts/careerCoach.ts
git commit -m "feat(server): career coach system prompt"
```

---

## Task 3: /api/career-chat endpoint + contract test (TDD)

**Files:**
- Create: `server/src/routes/careerChat.ts`
- Create: `server/src/__tests__/careerChat.contract.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write the failing contract test**

Create `server/src/__tests__/careerChat.contract.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/anthropic.ts", () => ({
  getAnthropic: vi.fn(),
  MODEL_ID: "claude-sonnet-4-6",
}));

import { getAnthropic } from "../lib/anthropic.ts";
import { app } from "../index.ts";

describe("POST /api/career-chat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns an assistant message for a valid history", async () => {
    (getAnthropic as any).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "What country was your degree from?" }],
        }),
      },
    });

    const res = await request(app)
      .post("/api/career-chat")
      .send({
        messages: [
          { role: "user", content: "I was a nurse in India." },
        ],
      })
      .expect(200);

    expect(res.body).toHaveProperty("assistantMessage");
    expect(typeof res.body.assistantMessage).toBe("string");
    expect(res.body.assistantMessage.length).toBeGreaterThan(0);
  });

  it("returns 400 when messages array missing or empty", async () => {
    await request(app).post("/api/career-chat").send({}).expect(400);
    await request(app).post("/api/career-chat").send({ messages: [] }).expect(400);
    await request(app).post("/api/career-chat").send({ messages: "not an array" }).expect(400);
  });

  it("returns 400 when last message role is not user", async () => {
    await request(app)
      .post("/api/career-chat")
      .send({
        messages: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello" },
        ],
      })
      .expect(400);
  });
});
```

- [ ] **Step 2: Run test — verify failure**

```
npm --prefix server test
```
Expected: NEW test file fails (route not registered yet). Tailor tests still pass (3 of them).

- [ ] **Step 3: Implement the route**

Create `server/src/routes/careerChat.ts`:
```typescript
import type { Request, Response } from "express";
import { getAnthropic, MODEL_ID } from "../lib/anthropic.ts";
import { CAREER_COACH_SYSTEM_PROMPT } from "../prompts/careerCoach.ts";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function isValidMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== "object") return false;
  const obj = m as Record<string, unknown>;
  return (
    (obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string" &&
    obj.content.trim().length > 0
  );
}

export async function careerChatHandler(req: Request, res: Response) {
  const { messages } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }
  if (!messages.every(isValidMessage)) {
    return res.status(400).json({ error: "each message must have role user|assistant and non-empty content" });
  }
  if (messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "last message must be from the user" });
  }

  try {
    const client = getAnthropic();
    const message = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1200,
      system: CAREER_COACH_SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = message.content.find((b: any) => b.type === "text") as { text: string } | undefined;
    if (!textBlock) {
      return res.status(502).json({ error: "Model returned no text" });
    }

    return res.json({ assistantMessage: textBlock.text });
  } catch (err: any) {
    console.error("[career-chat] error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
```

- [ ] **Step 4: Register the route in `server/src/index.ts`**

Add the import near the other route imports:
```typescript
import { careerChatHandler } from "./routes/careerChat.ts";
```

Add the route registration below the existing `/api/tailor` line:
```typescript
app.post("/api/career-chat", careerChatHandler);
```

- [ ] **Step 5: Run tests — verify all pass**

```
npm --prefix server test
```
Expected: 6 tests pass (3 existing tailor + 3 new career-chat).

- [ ] **Step 6: Commit**

```
git add server/src/routes/careerChat.ts server/src/__tests__/careerChat.contract.test.ts server/src/index.ts
git commit -m "feat(server): /api/career-chat endpoint with contract tests"
```

---

## Task 4: ChatWindow component + CareerChatPanel wire-up

**Files:**
- Create: `client/src/components/ChatWindow.tsx`
- Modify: `client/src/lib/api.ts` (add `careerChat` helper)
- Rewrite: `client/src/features/CareerChatPanel.tsx`

- [ ] **Step 1: Extend `client/src/lib/api.ts`**

Append at the bottom of the file:
```typescript
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function careerChat(messages: ChatMessage[]): Promise<{ assistantMessage: string }> {
  const res = await fetch("/api/career-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}
```

- [ ] **Step 2: Create `client/src/components/ChatWindow.tsx`**

```tsx
import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/api";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  renderAssistant?: (content: string, index: number) => React.ReactNode;
}

export function ChatWindow({ messages, loading, renderAssistant }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  return (
    <div className="h-[28rem] overflow-y-auto p-4 rounded-md border border-border bg-background space-y-3">
      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Tell me a bit about your background — where you studied, what you've done, where you are now.
        </p>
      )}
      {messages.map((m, i) => (
        <div
          key={i}
          className={
            "max-w-[85%] px-4 py-2 rounded-md text-sm " +
            (m.role === "user"
              ? "ml-auto bg-primary text-primary-foreground"
              : "mr-auto bg-muted text-foreground")
          }
        >
          {m.role === "assistant" && renderAssistant
            ? renderAssistant(m.content, i)
            : <span className="whitespace-pre-wrap">{m.content}</span>}
        </div>
      ))}
      {loading && (
        <div className="mr-auto max-w-[85%] px-4 py-2 rounded-md text-sm bg-muted text-muted-foreground italic">
          Thinking...
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `client/src/features/CareerChatPanel.tsx`**

```tsx
import { useState } from "react";
import { careerChat, type ChatMessage } from "@/lib/api";
import { ChatWindow } from "@/components/ChatWindow";

export default function CareerChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const out = await careerChat(next);
      setMessages([...next, { role: "assistant", content: out.assistantMessage }]);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      // Roll back so the user can retry without re-typing.
      setMessages(messages);
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function reset() {
    setMessages([]);
    setInput("");
    setError(null);
  }

  return (
    <div className="space-y-4">
      <ChatWindow messages={messages} loading={loading} />

      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a message..."
          rows={2}
          className="flex-1 p-3 rounded-md border border-border bg-background text-sm resize-none"
        />
        <button
          onClick={onSend}
          disabled={loading || input.trim().length === 0}
          className="px-4 py-2 h-[3.25rem] rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}

      {messages.length > 0 && (
        <button onClick={reset} className="text-xs text-muted-foreground underline">
          Start over
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```
npm --prefix client run build
```
Expected: success.

- [ ] **Step 5: Live smoke test (no roadmap rendering yet — that's Task 5)**

Dev server should still be running. Open `http://localhost:5173`. Click "Career Path" tab. Type: *"I was a nurse in India and just moved to Toronto."* Press Enter. Wait ~5-10s. You should see Claude respond conversationally, probably asking about Canadian status or specific nursing focus.

If the response contains `<roadmap>...</roadmap>` at the end, it will appear as raw text for now — that's fine. Task 5 parses it.

- [ ] **Step 6: Commit**

```
git add client/src/components/ChatWindow.tsx client/src/lib/api.ts client/src/features/CareerChatPanel.tsx
git commit -m "feat(client): conversational Career Path Explorer (no roadmap render yet)"
```

---

## Task 5: Roadmap parsing + visual rendering

When the assistant ends a turn with `<roadmap>{...}</roadmap>`, hide the raw block and render a card-based visual roadmap instead.

**Files:**
- Create: `client/src/lib/roadmap.ts`
- Create: `client/src/components/RoadmapCard.tsx`
- Modify: `client/src/features/CareerChatPanel.tsx` (pass `renderAssistant` to ChatWindow)

- [ ] **Step 1: Create `client/src/lib/roadmap.ts`**

```typescript
export interface RoadmapPath {
  title: string;
  timeline: string;
  steps: string[];
  certifications: string[];
  realistic_salary_range_cad: string;
}

export interface Roadmap {
  paths: RoadmapPath[];
}

export interface ParsedAssistantMessage {
  prose: string;
  roadmap: Roadmap | null;
}

const ROADMAP_RE = /<roadmap>\s*([\s\S]*?)\s*<\/roadmap>/i;

export function parseAssistantMessage(content: string): ParsedAssistantMessage {
  const match = content.match(ROADMAP_RE);
  if (!match) {
    return { prose: content, roadmap: null };
  }

  const jsonStr = match[1].trim();
  let roadmap: Roadmap | null = null;
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.paths)) {
      roadmap = parsed as Roadmap;
    }
  } catch {
    // Fall through — leave the raw block in prose so the user at least sees something.
  }

  const prose = roadmap ? content.replace(ROADMAP_RE, "").trim() : content;
  return { prose, roadmap };
}
```

- [ ] **Step 2: Create `client/src/components/RoadmapCard.tsx`**

```tsx
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
```

- [ ] **Step 3: Wire `renderAssistant` in `CareerChatPanel.tsx`**

Add an import at the top:
```tsx
import { parseAssistantMessage } from "@/lib/roadmap";
import { RoadmapCard } from "@/components/RoadmapCard";
```

Change the `<ChatWindow ...>` line to pass a `renderAssistant` prop:
```tsx
<ChatWindow
  messages={messages}
  loading={loading}
  renderAssistant={(content) => {
    const { prose, roadmap } = parseAssistantMessage(content);
    return (
      <>
        <span className="whitespace-pre-wrap">{prose}</span>
        {roadmap && <RoadmapCard roadmap={roadmap} />}
      </>
    );
  }}
/>
```

- [ ] **Step 4: Verify build**

```
npm --prefix client run build
```
Expected: success.

- [ ] **Step 5: Commit**

```
git add client/src/lib/roadmap.ts client/src/components/RoadmapCard.tsx client/src/features/CareerChatPanel.tsx
git commit -m "feat(client): parse and render <roadmap> block as visual cards"
```

---

## Task 6: Live end-to-end smoke test + tag

This needs the real Anthropic API key (already in `server/.env` from Task 7 of the previous plan). Drives the chat to completion to verify the roadmap renders.

- [ ] **Step 1: Confirm dev server is up**

If still running from earlier, fine. Otherwise:
```
npm run dev
```
Wait for both ports (3001, 5173) to come up.

- [ ] **Step 2: Run a scripted chat smoke test via curl**

This exercises a multi-turn chat:

```bash
cd "C:\Users\bestg\OneDrive\Documents\launchpath"

# Turn 1 — newcomer nurse opens the chat
node -e "
console.log(JSON.stringify({
  messages: [{ role: 'user', content: 'I was a registered nurse in India for 5 years. I moved to Toronto 8 months ago and have no idea what to do.' }]
}))
" > chat.tmp.json
curl -sS -X POST http://localhost:5173/api/career-chat -H "Content-Type: application/json" --data @chat.tmp.json | node -e "
let d = ''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => {
  const r = JSON.parse(d);
  console.log('--- turn 1 assistant ---');
  console.log(r.assistantMessage);
});"
rm chat.tmp.json
```

Expected: short conversational response with ONE question (probably about Canadian status, target specialty, or whether she wants to stay in nursing).

- [ ] **Step 3: Open the browser and complete a real chat**

Go to `http://localhost:5173`, Career Path tab. Type the same opener. Answer 4-5 of Claude's questions naturally (you can pretend to be Priya — answers like "Toronto, PR status", "med-surg ward, 5 years", "open to RPN if it's faster", "yes I have BLS"). Eventually Claude should end a turn with a `<roadmap>` block. Confirm the visual RoadmapCard renders with 3 paths.

- [ ] **Step 4: Run all server tests one more time**

```
npm --prefix server test
```
Expected: 6/6.

- [ ] **Step 5: Final commit + tag**

If you took a screenshot of the working career chat, add it to `samples/screenshot-v1.png` and commit:
```
git add samples/screenshot-v1.png
git commit -m "docs: career chat v1 screenshot"
```

Tag and push:
```
git tag v1-career-chat
git push origin main --tags
```

- [ ] **Step 6: Verify on GitHub**

Visit https://github.com/GurnoorKhurana/launchpath and confirm the new commits + tag are visible.

---

## Self-Review Notes

Coverage:
- ✅ Tab navigation between Tailor + Career Chat (Task 1)
- ✅ Career coach system prompt with Canadian recertification knowledge (Task 2)
- ✅ `/api/career-chat` endpoint with 3 contract tests (Task 3)
- ✅ ChatWindow + CareerChatPanel UI with optimistic state + rollback on error (Task 4)
- ✅ `<roadmap>` block parsing + visual card rendering (Task 5)
- ✅ Live end-to-end verification + tag (Task 6)

Deviations from the original Monday spec, all documented in that spec's "Revised" notes:
- Tab navigation instead of React Router — simpler, same UX
- Non-streaming chat instead of SSE — demo-safe, streaming is a Wed polish target

No TBDs. No placeholders. Type names consistent across tasks (`ChatMessage`, `Roadmap`, `RoadmapPath`, `parseAssistantMessage`, `careerChat`, `careerChatHandler`, `CAREER_COACH_SYSTEM_PROMPT`).
