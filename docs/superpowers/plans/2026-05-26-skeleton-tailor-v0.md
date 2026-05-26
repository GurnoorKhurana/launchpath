# LaunchPath Skeleton + Tailor v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the LaunchPath monorepo and ship a working end-to-end Resume + Cover Letter Tailor feature tonight (Monday 2026-05-26). Submittable as-is if catastrophe strikes the rest of the week.

**Architecture:** Monorepo (`/client` Vite+React+TS+Tailwind+shadcn, `/server` Express+TS+Anthropic SDK). Single feature page UI → POST `/api/tailor` → Claude Sonnet 4.6 returns JSON → render result. No router, no DB, no auth.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v3, shadcn/ui, Express 4, Anthropic SDK, vitest + supertest for the one critical contract test, concurrently for dev orchestration.

**Time budget:** ~4 hours. Tag the final commit `v0-skeleton`.

**Out of scope tonight (parked for Tue+):** React Router, multiple feature pages, template picker, Career Chat, Interview Prep, drag-drop file upload, PDF parsing, Figma theme, GitHub remote push (do it manually after Task 8 lands).

---

## File Structure

```
launchpath/                              [exists: git initialized, .gitignore present, spec committed]
├── package.json                         CREATE Task 1 — root, runs client+server concurrently
├── README.md                            CREATE Task 8 — shipping copy
├── .gitignore                           EXISTS — already excludes node_modules, .env, dist
├── samples/                             CREATE Task 8
│   ├── resume-sample.txt
│   └── job-sample.txt
├── client/                              CREATE Task 5
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json, tsconfig.node.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── components.json                  (shadcn config, Task 5)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                      CREATE Task 6 — single-page UI
│       ├── index.css                    Tailwind directives
│       ├── lib/
│       │   ├── api.ts                   CREATE Task 6 — fetch wrapper
│       │   └── utils.ts                 (shadcn cn() helper, Task 5)
│       └── components/ui/               (shadcn components, Task 5)
└── server/                              CREATE Task 2
    ├── package.json
    ├── tsconfig.json
    ├── .env                             CREATE Task 2 — gitignored
    ├── .env.example                     CREATE Task 2
    └── src/
        ├── index.ts                     CREATE Task 2 — Express bootstrap + /api/health
        ├── lib/
        │   └── anthropic.ts             CREATE Task 3 — SDK singleton
        ├── prompts/
        │   └── tailor.ts                CREATE Task 4 — Agent 1 system prompt
        ├── routes/
        │   └── tailor.ts                CREATE Task 4 — POST /api/tailor handler
        └── __tests__/
            └── tailor.contract.test.ts  CREATE Task 4 — one contract test with mocked SDK
```

---

## Task 1: Root monorepo scaffold

**Files:**
- Create: `package.json`

- [ ] **Step 1: Verify starting state**

Run from `C:\Users\bestg\OneDrive\Documents\launchpath`:
```bash
ls -la && git log --oneline
```
Expected: `.git`, `.gitignore`, `docs/` present. Git log shows the two spec commits.

- [ ] **Step 2: Create root package.json**

Create `package.json` with exactly:
```json
{
  "name": "launchpath",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm:dev:server\" \"npm:dev:client\"",
    "dev:server": "npm --prefix server run dev",
    "dev:client": "npm --prefix client run dev",
    "build": "npm --prefix client run build",
    "install:all": "npm install && npm --prefix server install && npm --prefix client install"
  },
  "devDependencies": {
    "concurrently": "^9.0.1"
  }
}
```

- [ ] **Step 3: Install root deps**

Run:
```bash
npm install
```
Expected: `node_modules/` created, `package-lock.json` written. No errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: root monorepo scaffold with concurrently"
```

---

## Task 2: Server skeleton — Express + TS + health endpoint

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env`
- Create: `server/.env.example`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server directory and package.json**

```bash
mkdir -p server/src
```

Create `server/package.json`:
```json
{
  "name": "@launchpath/server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.9.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

Note: `tsx` replaces `ts-node-dev` — faster, simpler, fewer config issues.

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create .env and .env.example**

Create `server/.env`:
```
ANTHROPIC_API_KEY=sk-ant-PASTE_REAL_KEY_HERE
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

Create `server/.env.example` (this one gets committed):
```
ANTHROPIC_API_KEY=
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

Then paste your real key into `server/.env` manually. The `.env` file is already covered by the root `.gitignore`.

- [ ] **Step 4: Create server/src/index.ts**

```typescript
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.listen(port, () => {
  console.log(`[launchpath-server] listening on http://localhost:${port}`);
});

export { app };
```

The `export { app }` is so the contract test in Task 4 can import the app without binding a port.

- [ ] **Step 5: Install server deps**

```bash
npm --prefix server install
```
Expected: completes without error. `server/node_modules/` exists.

- [ ] **Step 6: Smoke test the health endpoint**

In one terminal:
```bash
npm --prefix server run dev
```
Expected: log line `[launchpath-server] listening on http://localhost:3001`.

In another terminal:
```bash
curl http://localhost:3001/api/health
```
Expected: `{"ok":true,"ts":<some number>}`.

Stop the dev server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json server/.env.example server/src/index.ts
git commit -m "feat(server): bootstrap Express + TS with /api/health"
```

Verify `.env` was NOT staged:
```bash
git log -p HEAD | grep -i "sk-ant" || echo "clean"
```
Expected: `clean`.

---

## Task 3: Anthropic SDK client singleton

**Files:**
- Create: `server/src/lib/anthropic.ts`

- [ ] **Step 1: Create the client wrapper**

```bash
mkdir -p server/src/lib
```

Create `server/src/lib/anthropic.ts`:
```typescript
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Check server/.env");
  }
  client = new Anthropic({ apiKey });
  return client;
}

export const MODEL_ID = "claude-sonnet-4-6";
```

The lazy singleton means tests can stub before the client is constructed.

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/anthropic.ts
git commit -m "feat(server): add Anthropic SDK client singleton"
```

---

## Task 4: Tailor prompt + endpoint (TDD)

This is the highest-risk integration. One contract test up front protects us when the frontend depends on this shape later.

**Files:**
- Create: `server/src/prompts/tailor.ts`
- Create: `server/src/routes/tailor.ts`
- Create: `server/src/__tests__/tailor.contract.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create the system prompt**

```bash
mkdir -p server/src/prompts server/src/routes server/src/__tests__
```

Create `server/src/prompts/tailor.ts`:
```typescript
export const TAILOR_SYSTEM_PROMPT = `You are a resume coach for underrepresented job seekers — newcomers to Canada, students with no experience, career changers, and women in tech. Your job is to rewrite the candidate's resume bullets to match a specific job posting and draft a starting-point cover letter.

Rules:
- Never invent skills, jobs, certifications, or dates the candidate did not mention. If the gap between their experience and the job is large, say so honestly in matchAnalysis.gaps and suggest the closest legitimate framing.
- Output exactly this JSON shape with no surrounding prose, no markdown fences, no commentary:
{"tailoredBullets": [string], "matchAnalysis": {"strengths": [string], "gaps": [string]}, "coverLetterDraft": string}
- In coverLetterDraft, insert the literal placeholders [your story about why this role] and [your specific reason for this company] where the candidate must personalize. Do not write fake personal anecdotes.
- Use strong action verbs, quantified impact when the candidate provided numbers, and the exact keyword vocabulary from the job posting.
- If the candidate's background suggests they are a newcomer with foreign credentials, briefly note in matchAnalysis.gaps which credentials likely transfer and which may need recertification.

Return ONLY the JSON object. No prose before or after.`;
```

- [ ] **Step 2: Write the failing contract test**

Create `server/src/__tests__/tailor.contract.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/anthropic.ts", () => ({
  getAnthropic: vi.fn(),
  MODEL_ID: "claude-sonnet-4-6",
}));

import { getAnthropic } from "../lib/anthropic.ts";
import { app } from "../index.ts";

describe("POST /api/tailor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns tailored output with required shape", async () => {
    const fakeJson = {
      tailoredBullets: ["Led X driving Y%"],
      matchAnalysis: { strengths: ["Z"], gaps: ["W"] },
      coverLetterDraft: "Dear hiring team... [your story about why this role] ...",
    };

    (getAnthropic as any).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify(fakeJson) }],
        }),
      },
    });

    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "I was a nurse in India.", jobText: "RPN at Toronto hospital." })
      .expect(200);

    expect(res.body).toHaveProperty("tailoredBullets");
    expect(Array.isArray(res.body.tailoredBullets)).toBe(true);
    expect(res.body).toHaveProperty("matchAnalysis.strengths");
    expect(res.body).toHaveProperty("matchAnalysis.gaps");
    expect(res.body.coverLetterDraft).toContain("[your story");
  });

  it("returns 400 when required fields missing", async () => {
    await request(app).post("/api/tailor").send({ resumeText: "x" }).expect(400);
    await request(app).post("/api/tailor").send({ jobText: "x" }).expect(400);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm --prefix server test
```
Expected: FAILS. Either compile error (route doesn't exist) or 404 from supertest.

- [ ] **Step 4: Implement the route**

Create `server/src/routes/tailor.ts`:
```typescript
import type { Request, Response } from "express";
import { getAnthropic, MODEL_ID } from "../lib/anthropic.ts";
import { TAILOR_SYSTEM_PROMPT } from "../prompts/tailor.ts";

export async function tailorHandler(req: Request, res: Response) {
  const { resumeText, jobText, templateId } = req.body ?? {};

  if (typeof resumeText !== "string" || resumeText.trim().length === 0) {
    return res.status(400).json({ error: "resumeText is required" });
  }
  if (typeof jobText !== "string" || jobText.trim().length === 0) {
    return res.status(400).json({ error: "jobText is required" });
  }

  const userContent = [
    `Resume:`,
    resumeText.trim(),
    ``,
    `Job posting:`,
    jobText.trim(),
    ``,
    templateId ? `Template context: ${templateId}` : `Template context: none`,
  ].join("\n");

  try {
    const client = getAnthropic();
    const message = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 2000,
      system: TAILOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = message.content.find((b: any) => b.type === "text") as { text: string } | undefined;
    if (!textBlock) {
      return res.status(502).json({ error: "Model returned no text" });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return res.status(502).json({ error: "Model output was not valid JSON", raw: textBlock.text });
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("[tailor] error:", err);
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
```

- [ ] **Step 5: Wire the route into Express**

Edit `server/src/index.ts`. Replace the entire file with:
```typescript
import "dotenv/config";
import express from "express";
import cors from "cors";
import { tailorHandler } from "./routes/tailor.ts";

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.post("/api/tailor", tailorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`[launchpath-server] listening on http://localhost:${port}`);
  });
}

export { app };
```

The `NODE_ENV !== "test"` guard prevents supertest from racing on `listen()`.

- [ ] **Step 6: Run the test to verify it passes**

```bash
npm --prefix server test
```
Expected: 2 tests pass.

If a test fails because of `.ts` extension resolution, change the imports in `tailor.contract.test.ts` to drop the `.ts` extension. If Vitest can't find supertest types, double-check `server/package.json` devDependencies installed cleanly.

- [ ] **Step 7: Commit**

```bash
git add server/src/prompts server/src/routes server/src/__tests__ server/src/index.ts
git commit -m "feat(server): /api/tailor with Claude Sonnet 4.6 + contract test"
```

---

## Task 5: Client scaffold — Vite + React + TS + Tailwind + shadcn/ui

**Files:** all under `client/`

- [ ] **Step 1: Scaffold Vite app**

From the repo root:
```bash
npm create vite@latest client -- --template react-ts
```
When prompted: confirm yes if anything is asked. Expected: `client/` directory created with starter files.

- [ ] **Step 2: Install client deps**

```bash
npm --prefix client install
```

- [ ] **Step 3: Install Tailwind v3 + shadcn prerequisites**

```bash
npm --prefix client install -D tailwindcss@^3.4.14 postcss@^8.4.47 autoprefixer@^10.4.20
npm --prefix client install class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 4: Initialize Tailwind config**

Create `client/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 32% 91%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222 47% 11%)",
        primary: { DEFAULT: "hsl(222 47% 11%)", foreground: "hsl(210 40% 98%)" },
        muted: { DEFAULT: "hsl(210 40% 96%)", foreground: "hsl(215 16% 47%)" },
      },
      borderRadius: { lg: "0.5rem", md: "0.375rem", sm: "0.25rem" },
    },
  },
  plugins: [],
};
```

Create `client/postcss.config.js`:
```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Replace client/src/index.css with Tailwind directives**

Replace the entire contents of `client/src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-background text-foreground antialiased; font-family: ui-sans-serif, system-ui, sans-serif; }
```

- [ ] **Step 6: Add the shadcn cn() helper**

```bash
mkdir -p client/src/lib client/src/components/ui
```

Create `client/src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

We're skipping the full shadcn CLI init tonight — manually adding only the helper. Components for Tuesday.

- [ ] **Step 7: Configure path alias for `@/`**

Edit `client/tsconfig.json`. In the `compilerOptions` object add:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

Install vite-tsconfig-paths and wire it:
```bash
npm --prefix client install -D vite-tsconfig-paths
```

Replace `client/vite.config.ts` with:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

The proxy means client-side `fetch("/api/tailor")` reaches the server without CORS surprises in dev.

- [ ] **Step 8: Smoke test the client**

```bash
npm --prefix client run dev
```
Expected: Vite reports `Local: http://localhost:5173/`. Open in browser, see Vite + React starter page. Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add client/
git commit -m "feat(client): scaffold Vite+React+TS+Tailwind+shadcn helpers"
```

---

## Task 6: Single-page Tailor UI wired to /api/tailor

**Files:**
- Create: `client/src/lib/api.ts`
- Modify: `client/src/App.tsx` (replace entirely)
- Modify: `client/src/main.tsx` (verify imports `./index.css`)

- [ ] **Step 1: Create the API wrapper**

Create `client/src/lib/api.ts`:
```typescript
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
```

- [ ] **Step 2: Replace client/src/App.tsx**

Replace the entire file with:
```tsx
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
```

- [ ] **Step 3: Verify main.tsx imports index.css**

Open `client/src/main.tsx`. It should already contain `import "./index.css";` from the Vite template — confirm it's there. If missing, add it as the first import line.

- [ ] **Step 4: Smoke test the UI (without hitting Claude yet)**

From the repo root:
```bash
npm run dev
```
Expected: both client (5173) and server (3001) start. Open `http://localhost:5173`. See the LaunchPath UI with two textareas + button. Button stays disabled until both fields have content.

Leave both running for the next task.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/api.ts client/src/App.tsx
git commit -m "feat(client): single-page Tailor UI wired to /api/tailor"
```

---

## Task 7: Live end-to-end smoke test with real Claude

**Files:** none modified — this is a manual verification step.

- [ ] **Step 1: Paste real Anthropic API key**

Open `server/.env`. Replace `sk-ant-PASTE_REAL_KEY_HERE` with the real key. Save.

Restart the dev server (Ctrl+C the `npm run dev` from Task 6, then `npm run dev` again from root) so the new env loads.

- [ ] **Step 2: Run the live happy path**

In the browser at `http://localhost:5173`:

Paste this as the resume:
```
Priya Sharma
Mumbai, India → Toronto, ON | priya@example.com

EDUCATION
B.Sc. Nursing, Mumbai University, 2019

EXPERIENCE
Staff Nurse, Lilavati Hospital, Mumbai (2019-2024)
- Provided direct patient care on a 40-bed medical-surgical ward
- Administered medications, IV therapy, wound care, post-op monitoring
- Trained 6 junior nurses on infection control protocols
- Collaborated with multidisciplinary teams on care plans

CERTIFICATIONS
Registered Nurse, India Nursing Council (2019)
BLS certification (2023)
```

Paste this as the job posting:
```
Registered Practical Nurse (RPN) — Toronto General Hospital
Full-time, days/evenings

We are seeking a compassionate RPN to join our medical-surgical unit. Responsibilities include direct patient care, medication administration, IV therapy, wound care, and collaboration with the interdisciplinary team. Must be registered with the College of Nurses of Ontario (CNO) or eligible to register.

Required: RPN diploma, CNO registration or eligibility, BLS, strong communication skills, ability to work shifts.
Preferred: experience with electronic health records, post-surgical care, multi-cultural patient populations.
```

Click "Tailor my resume."

Expected within ~10-20 seconds:
- Tailored bullets list with Canadian healthcare vocabulary (CNO, interdisciplinary, electronic health records)
- Strengths mention med-surg experience and BLS
- Gaps explicitly mention CNO registration / WES credential evaluation
- Cover letter draft contains the literal text `[your story about why this role]` and `[your specific reason for this company]`

- [ ] **Step 3: Capture the result**

If the happy path works: take a screenshot of the result page. Save it to `samples/screenshot-v0.png` (create the dir if needed). This is for the README.

If the model returns invalid JSON or a non-200 response: read the server console error. Most common fixes:
- JSON parse error → the prompt's last line "Return ONLY the JSON object" usually fixes it; if not, retry once (Claude is non-deterministic)
- 401 from Anthropic → API key wrong or has no credits
- Timeout → network; retry

- [ ] **Step 4: Commit the screenshot if you saved one**

```bash
git add samples/screenshot-v0.png
git commit -m "docs: capture v0 smoke-test screenshot"
```

Skip this commit if you didn't save a screenshot.

---

## Task 8: README + samples + tag v0-skeleton

**Files:**
- Create: `README.md`
- Create: `samples/resume-sample.txt`
- Create: `samples/job-sample.txt`

- [ ] **Step 1: Save the smoke-test samples**

Create `samples/` if it doesn't exist, then write Priya's resume to `samples/resume-sample.txt` and the job posting to `samples/job-sample.txt` using the exact text from Task 7 Step 2.

- [ ] **Step 2: Write the README**

Create `README.md`:
```markdown
# LaunchPath

Career empowerment web app for underrepresented job seekers — newcomers to Canada, students with no experience, career switchers, and women in tech.

Built for a hackathon by a two-person team. Submission target: Thu 2026-05-28 14:00 ET.

## What works today (v0-skeleton)

- **Resume + Cover Letter Tailor** — paste a resume and a job posting, get back tailored bullets, a strengths/gaps analysis, and a cover-letter skeleton with explicit `[your story]` placeholders for authenticity.

## Roadmap

- Career Path Explorer — conversational chat agent that knows Canadian recertification pathways (WES, provincial bodies, bridging programs) — Tuesday
- Interview Prep — role-specific behavioral + technical questions with presentation tips — Wednesday
- Resume template picker, drag-drop upload, polished theme — Tue/Wed

## What was built this week vs prior work

Everything. Repo initialized 2026-05-26. No prior work.

## Tech stack

Vite + React + TypeScript + Tailwind + shadcn helpers (client). Express + TypeScript + Anthropic SDK (server). Claude Sonnet 4.6 for all agentic features.

## Local setup

```bash
# 1. Install all deps
npm run install:all

# 2. Configure the server
cp server/.env.example server/.env
# Edit server/.env and paste your Anthropic API key

# 3. Run both client and server
npm run dev
```

Open http://localhost:5173.

Sample data lives in `samples/` if you want a fast demo without writing your own resume.

## Repo structure

- `client/` — Vite + React frontend on port 5173
- `server/` — Express backend on port 3001, holds the Anthropic API key
- `docs/superpowers/specs/` — design spec
- `docs/superpowers/plans/` — implementation plans
- `samples/` — demo data

## Submission

- Repo: this URL
- Demo: live at Friday expo, backup video link TBD

## License

MIT
```

- [ ] **Step 3: Add MIT license**

Create `LICENSE`:
```
MIT License

Copyright (c) 2026 Gurnoor + team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

- [ ] **Step 4: Verify the test suite still passes**

```bash
npm --prefix server test
```
Expected: green.

- [ ] **Step 5: Final commit + tag**

```bash
git add README.md LICENSE samples/
git commit -m "docs: README, MIT license, sample resume + job posting"
git tag v0-skeleton
git log --oneline
```
Expected: tag visible. Multiple commits leading from the two initial spec commits through Tasks 1-8.

- [ ] **Step 6: (Manual, outside this plan) Create GitHub remote and push**

When you're ready, in the browser create a new public repo on GitHub named `launchpath` — DO NOT let GitHub initialize it with README/license/.gitignore (we already have them). Then:
```bash
git remote add origin git@github.com:<your-username>/launchpath.git
git push -u origin main --tags
```

This is left out of the plan steps because it requires your GitHub account interaction.

---

## Self-Review Notes

Coverage of tonight's spec section (Section 4, "TONIGHT"):
- ✅ Repo scaffold + `.gitignore` (Task 1, also pre-existing)
- ✅ Monorepo with `concurrently` (Task 1)
- ✅ `/client` Vite+React+TS+Tailwind+shadcn helpers (Task 5)
- ✅ `/server` Express+TS (Task 2)
- ✅ `.env` + `ANTHROPIC_API_KEY` (Task 2)
- ✅ `/api/health` (Task 2)
- ✅ Anthropic SDK singleton (Task 3)
- ✅ `POST /api/tailor` with Agent 1 prompt (Task 4)
- ✅ Single-page UI (Task 6)
- ✅ Live smoke test (Task 7)
- ✅ Tag `v0-skeleton` (Task 8)
- ⚠️ "Push to GitHub" is Step 6 of Task 8 but marked manual — requires user's GitHub credentials.

No TBDs, no placeholders, no "implement later." Every code block is complete and copy-pasteable. Type and signature names are consistent across tasks (`tailor()`, `TailorResult`, `tailorHandler`, `TAILOR_SYSTEM_PROMPT`).
