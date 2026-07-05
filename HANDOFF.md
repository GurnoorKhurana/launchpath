# LaunchPath Handoff — Resume Point (2026-05-27)

> Point the next Claude session at this file after `/clear` so it can pick up cold.

## TL;DR

**v2-wizard-and-url is shipped, committed, pushed, and live on origin/main.** Working tree is clean except for a few cosmetic untracked files (HANDOFF.md, mockups, demo screenshots). No outstanding work from the v2 plan — every item green, all tests passing, manual walkthrough verified.

## Where we are

- **Submission deadline: Thursday 2026-05-28 14:00 ET — tomorrow.**
- Friday 2026-05-29 12:00–16:00 — expo + awards at Wisedocs office.
- Branch `main` is up to date with `origin/main`. Last commit `991a02b`. Tag `v2-wizard-and-url` pushed.
- Repo: https://github.com/GurnoorKhurana/launchpath
- Release: https://github.com/GurnoorKhurana/launchpath/releases/tag/v2-wizard-and-url
- Dev servers stopped at end of session. Ports 3001 and 5173 free.
- `server/.env` still holds the real Anthropic API key. `.gitignore` already excludes it.

## Git log (recent)

```
991a02b feat(client): career-path wizard + tailor URL/analysis UI
752de2c feat(server): job-url fetch + 2-stage tailor pipeline + structured career-paths
cdb2228 feat(client): newcomer-empathy pass — pinned roadmap, markdown, PDF, mobile, privacy
c8b7421 feat(server): plain-text replies + program links in system prompt
e0890f2 design: variant exploration + live UI verification screenshots
```

Tags shipped: `v0-skeleton` → `v1-career-chat` → `v1.1-newcomer-pass` → `v2-wizard-and-url`.

## What's in v2 (shipped today)

**Career Path** is no longer a chat. It's a 7-step questionnaire that branches by user type:

- Step 1 — User type: Newcomer / Student / Career switcher / Currently employed
- Step 2 — Geography: province (dropdown), city, open-to-relocate
- Step 3 — Field of interest: category + sub-specialty
- Step 4 — **Branched** by user type (newcomer asks about credentials/docs/language; student asks about program/grad date; switcher asks about reasons; currently-employed asks about change shape)
- Step 5 — Constraints: income runway, retraining willingness, hours/week
- Step 6 — RIASEC-lite: six 1–5 sliders for interest types
- Step 7 — Optional free-text notes
- Submit → `POST /api/career-paths` → same 3-card RoadmapCard (Fast Track / Credential-Aligned / Strategic Pivot) rendered in the pinned section with Download-as-PDF.

**Resume Tailor** now accepts a job URL alongside pasted text:

- Segmented `[Paste] [URL]` toggle.
- URL mode: server fetches the page (10s timeout, SSRF guards), extracts JSON-LD `JobPosting` if present (works on Greenhouse/Indeed/Lever/Workable) or falls back to main-text extraction.
- 422 → inline error, auto-flip toggle back to Paste, preserve the failed URL as a "Tried: <url>" hint.
- Tailoring is a **2-stage Claude pipeline**: Stage 1 JD analyzer extracts roleTitle/seniority/mustHaves/niceToHaves/keywords/employerSignals/redFlags; Stage 2 tailor takes the resume + that analysis + raw JD and produces tailoredBullets/strengths/gaps/coverLetter.
- New "What we found in the job" panel above the tailored output shows the analysis as chips.
- Time-stepped phase indicator: "Reading job posting… → Analyzing requirements… → Tailoring your resume…".

## Critical files (for next session's mental model)

**Server**
- `server/src/routes/careerPaths.ts` — structured-input career-paths handler
- `server/src/routes/tailor.ts` — 2-stage pipeline + URL branch
- `server/src/lib/jobFetcher.ts` — fetch + JSON-LD extractor + main-text fallback + SSRF guards
- `server/src/prompts/careerPathsFromProfile.ts` — system prompt for structured profile → roadmap
- `server/src/prompts/jdAnalyzer.ts` — Stage 1 prompt for JD → analysis JSON
- `server/src/prompts/tailor.ts` — Stage 2 prompt, rewritten to consume the analysis
- `server/src/__tests__/*` — 3 test files, 18/18 green

**Client**
- `client/src/features/CareerPathForm.tsx` — the new wizard (all step components inline)
- `client/src/features/TailorPanel.tsx` — extended with URL toggle + phase indicator + JD analysis section
- `client/src/lib/api.ts` — `tailor({ resumeText, jobText?, jobUrl? })`, `careerPaths(profile)`, `ApiError` with reason codes
- `client/src/lib/roadmap.ts` — pruned to types-only (Roadmap, RoadmapPath)
- `client/src/components/RoadmapCard.tsx` — unchanged, still the 3-card renderer

**Deleted in v2**: `server/src/routes/careerChat.ts`, `server/src/prompts/careerCoach.ts`, `server/src/__tests__/careerChat.contract.test.ts`, `client/src/features/CareerChatPanel.tsx`, `client/src/components/ChatWindow.tsx`, `parseAssistantMessage` from `client/src/lib/roadmap.ts`. `/api/career-chat` now 404s as intended.

## Plan files

- v1.1: `C:\Users\bestg\.claude\plans\virtual-kindling-hedgehog.md`
- v2: `C:\Users\bestg\.claude\plans\stop-the-servers-i-iterative-matsumoto.md`
- Original feature spec: `docs/superpowers/specs/2026-05-26-launchpath-design.md`

## Verification commands (worked at end of session)

```
npm --prefix server test       # 18/18 across 3 test files
npm --prefix client run build  # clean build
npm run dev                    # boots client on 5173, server on 3001
curl -X POST http://localhost:3001/api/career-chat  # → 404 (correctly removed)
```

## Demo screenshots

Captured today at desktop 1280×900 for an email to cousin:

- `C:\Users\bestg\OneDrive\Documents\demo-screenshots\01-tailor-landing.png`
- `C:\Users\bestg\OneDrive\Documents\demo-screenshots\02-tailor-url-mode.png`
- `C:\Users\bestg\OneDrive\Documents\demo-screenshots\03-career-step1-user-type.png`
- `C:\Users\bestg\OneDrive\Documents\demo-screenshots\04-career-step2-geography.png`

These are not in the repo — they're free-standing artifacts for the cousin email.

## Open follow-ups (your call before submission)

Things deferred but candidate for Wednesday/Thursday polish:

- **Interview Prep** — the third "Tight-3" feature was never started. Would be a third tab. Highest impact remaining feature, but also the most scope.
- **Suggested-reply chips / starter prompts** — deferred from v1.1.
- **Acronym tooltips** for CNO/NNAS/WES/PEO/etc.
- **Tagline copy rewrite** (was for cousin's design pass to decide).
- **Click-to-Tailor handoff** — link a roadmap card to the Tailor tab pre-filled.
- **Provincial-aware regulator routing** — Calgary user → APEGA hints, not PEO. (The wizard now collects the province, but the prompt doesn't lean on it as hard as it could.)
- **Cost-of-living annotation on salary ranges**.
- **Cousin's Figma pass + pitch deck + demo script** — Tuesday block was 2026-05-26; status unknown from this session. Check Slack/email.

## Cousin sync state (verify before resuming)

User told prior session: cousin's 6h Tuesday block was 2026-05-26 (yesterday). At the end of today's session there was no update on whether the Figma pass / pitch deck / demo script landed. **Confirm cousin's deliverables before locking the submission package.**

## What NOT to do

- Don't re-add a chat-mode Career Path. v2 deliberately removed it after locked decision: "fully replace". A "Follow-up questions" chat under the wizard's result was discussed and explicitly deferred.
- Don't try to scrape LinkedIn job URLs server-side — they auth-wall and `jobFetcher` will 422 on them by design. The paste fallback is the supported path. UI already handles this gracefully (preserves URL in "Tried:" hint).
- Don't add new npm deps casually. v2 added `cheerio` (server, for HTML parsing) and that's the only new dep across both `v1.1-newcomer-pass` and `v2-wizard-and-url`. Anything bigger needs to be justified before submission.

## Untracked files in working tree (safe to ignore or delete)

- `HANDOFF.md` (this file)
- `mockups.zip`, `mockups (2).zip`
- `mockups/ux-01-mobile-landing.png` through `ux-04-ahmed-peo-explained.png`

None of these are referenced by the app or required for submission.
