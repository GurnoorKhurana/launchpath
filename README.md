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
