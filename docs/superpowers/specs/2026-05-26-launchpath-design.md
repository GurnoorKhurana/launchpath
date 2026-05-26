# LaunchPath — Design Spec

**Date:** 2026-05-26
**Authors:** Gurnoor (lead dev) + cousin (design/pitch/QA)
**Hackathon submission:** Thursday 2026-05-28 14:00 ET
**Expo:** Friday 2026-05-29 12:00-16:00 ET at Wisedocs Office

---

## 1. Project identity & scope

**Name:** LaunchPath (placeholder — confirm before submission)

**One-paragraph description:**
LaunchPath is a career empowerment web app for underrepresented job seekers — newcomers to Canada, students with no experience, career changers, and women in tech. It uses Claude to tailor resumes and cover letters to specific job postings, runs a conversational career-path explorer that accounts for recertification and credential transfer, and generates role-specific interview prep. Everything runs in-session, no signup, no friction.

**MVP feature lock (Tight 3):**
1. **Resume + Cover Letter Tailor** — paste job posting URL or text, paste/drop resume → tailored resume bullets + cover letter draft with explicit personalization placeholders.
2. **Career Path Explorer (conversational chat)** — agent asks about background, credentials, country of education → proposes 3 concrete career paths with recertification steps. Critical for the newcomer audience.
3. **Interview Prep** — pick role + experience level → 4 behavioral + 4 technical questions + 3-5 presentation tips tuned to the candidate's background.

**Resume template picker** — before pasting, user picks a starting template if they don't have a resume:
- Newcomer to Canada (credentials from abroad)
- First job / no experience
- Career switcher
- Women in tech
- Generic professional

Or selects "I have my own resume" → paste/drop flow.

**Two entry paths into the Tailor:**
1. *Has resume* → paste or drop resume text + job posting → Claude runs the full Tailor prompt directly.
2. *No resume yet, picked a template* → UI shows a short structured form (name, contact, most recent role/education, top 3 skills, optional notable achievements). The form output + the chosen template's framing get sent as `resumeText` to the same `/api/tailor` endpoint, with `templateId` set so Claude follows that template's tone. No separate endpoint, no chat for this path — keeps the flow predictable for demo.

**Cover letter authenticity rule:** Output is labeled "Draft — make it yours." Claude is instructed to insert visible `[your story about X]` and `[your specific reason for this company]` placeholders. UI shows a one-line tip explaining authenticity matters. The product overcomes blank-page paralysis without producing pure-AI slop.

**Explicitly cut (parked):** Job fair finder (needs real data sources we don't have), outreach coach, niche-group-specific tips pages. The career path chat covers the newcomer-recertification thread well enough for the demo.

**Audience framing for the pitch:** Lead with the newcomer recertification story. Most emotionally resonant, and the conversational career chat makes it concrete in a way the other features can't. Product remains useful for students with no experience and career switchers — copy in the UI speaks to all underrepresented job seekers — but pitch + demo persona are anchored on newcomers.

**Audience decision (2026-05-26 evening, after live v0 verification):** Cousin proposed narrowing audience. Locked on: serve all underrepresented groups, but lead pitch + demo + hero copy with newcomers. Prompts remain inclusive of students/switchers since the broader audience expands real-world utility without diluting the demo story.

---

## 2. Technical architecture

### Stack
- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui
- **Backend:** Node.js + Express + TypeScript + ts-node-dev
- **AI:** Anthropic SDK, model `claude-sonnet-4-6` across all three agents
- **Database:** none — stateless, no auth, no persistence (MongoDB cut from original brief)
- **Job-URL scraping:** cheerio with graceful fallback to "paste text instead"
- **Dev orchestration:** root `package.json` with `concurrently` runs client + server with one `npm run dev`

### Folder structure

```
launchpath/
├── client/                         Vite + React + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx                landing, 3 feature cards
│   │   │   ├── ResumeTailor.tsx        template picker → input → output
│   │   │   ├── CareerChat.tsx          conversational explorer
│   │   │   └── InterviewPrep.tsx       role picker → Q&A list
│   │   ├── components/
│   │   │   ├── DropZone.tsx            drag-drop + paste textarea combo
│   │   │   ├── TemplatePicker.tsx      5 cards
│   │   │   ├── ChatWindow.tsx          reused by CareerChat
│   │   │   └── OutputCard.tsx          resume / cover-letter / questions display
│   │   ├── lib/api.ts                  fetch wrappers for /api/*
│   │   └── App.tsx, main.tsx
│   └── package.json
├── server/                         Node + Express + Anthropic SDK
│   ├── src/
│   │   ├── index.ts                Express bootstrap, port 3001
│   │   ├── routes/
│   │   │   ├── tailor.ts           POST /api/tailor
│   │   │   ├── careerChat.ts       POST /api/career-chat (streaming)
│   │   │   └── interview.ts        POST /api/interview-prep
│   │   ├── prompts/                system prompts per agent
│   │   │   ├── tailor.ts
│   │   │   ├── careerCoach.ts
│   │   │   └── interview.ts
│   │   ├── lib/
│   │   │   ├── anthropic.ts        SDK client singleton
│   │   │   └── jobScrape.ts        fetch URL → strip to text (cheerio)
│   │   └── templates/              5 resume template JSONs
│   ├── .env                        ANTHROPIC_API_KEY (gitignored)
│   └── package.json
├── samples/                        pre-prepared demo content
│   ├── resume-newcomer-nurse.txt
│   └── job-rpn-toronto.txt
├── .gitignore
├── README.md
├── package.json                    root, runs concurrently
└── docs/superpowers/specs/         this file
```

### API contract

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/health` | GET | — | `{ok: true}` |
| `/api/tailor` | POST | `{resumeText, jobText, templateId?}` | `{tailoredBullets[], matchAnalysis{strengths, gaps}, coverLetterDraft}` |
| `/api/career-chat` | POST (SSE) | `{messages: [{role, content}]}` | streaming text; final assistant message may contain `<roadmap>{...}</roadmap>` block |
| `/api/interview-prep` | POST | `{role, level, candidateContext?}` | `{behavioral[], technical[], presentationTips[]}` |
| `/api/scrape-job` | POST | `{url}` | `{text}` or `{error}` |

### Data flow — Tailor example
1. Client: user picks template OR pastes resume; pastes job URL or job text.
2. If URL, client calls `/api/scrape-job` first. On failure, UI prompts paste instead.
3. Client `POST /api/tailor` with `{resumeText, jobText, templateId?}`.
4. Server runs `prompts/tailor.ts` system prompt + user content through `claude-sonnet-4-6`, `max_tokens: 2000`.
5. Server returns JSON.
6. Client renders in `OutputCard` with copy-to-clipboard buttons per section.

### Streaming policy
Originally: only Career Chat streams. **Revised (Monday evening):** Career Chat ships as one-shot request/response for v1 (simpler, demo-safe). Streaming is a Wednesday polish target if Tue+Wed land on schedule. Tailor and Interview Prep remain one-shot.

### Navigation
Originally: React Router with `/pages/`. **Revised (Monday evening):** Tab-based navigation inside `App.tsx` — three features, no deep linking, tabs ship in ~10 lines vs. router scaffolding. If Wednesday polish surfaces a need for shareable links to specific features, we can add Router then.

### Key tech decisions
- **TypeScript both sides** — catches dumb bugs, judges respect it.
- **shadcn/ui** — polished out of the box, themeable from Figma without touching code.
- **No state management library** — `useState` + URL state is enough for stateless.
- **No router-based code splitting** — small app, not worth the complexity.
- **Cost guard:** `max_tokens: 2000` for tailor + interview, `max_tokens: 800` per chat turn.

---

## 3. Claude prompt strategies

Three agents, three sharply-bounded prompts. Each owns one output contract.

### Agent 1 — Resume + Cover Letter Tailor
File: `server/src/prompts/tailor.ts`
Model: `claude-sonnet-4-6`, `max_tokens: 2000`

System prompt:
> You are a resume coach for underrepresented job seekers — newcomers to Canada, students with no experience, career changers, and women in tech. Your job is to rewrite the candidate's resume bullets to match a specific job posting and draft a starting-point cover letter.
>
> Rules:
> - Never invent skills, jobs, certifications, or dates the candidate didn't mention. If the gap between their experience and the job is large, say so honestly and suggest the closest legitimate framing.
> - Output exactly this JSON shape: `{"tailoredBullets": [string], "matchAnalysis": {"strengths": [string], "gaps": [string]}, "coverLetterDraft": string}`.
> - In the cover letter, insert `[your story about why this role]` and `[your specific reason for this company]` as visible placeholders. Do not write fake personal anecdotes.
> - Use strong action verbs, quantified impact when the candidate provided numbers, and the exact keyword vocabulary from the job posting.
> - If the candidate's background suggests they're a newcomer with foreign credentials, briefly call out which credentials likely transfer and which may need recertification.

User message format: `Resume:\n<resumeText>\n\nJob posting:\n<jobText>\n\nTemplate context (if any): <templateContext>`.

### Agent 2 — Career Path Explorer (conversational, streaming)
File: `server/src/prompts/careerCoach.ts`
Model: `claude-sonnet-4-6`, `max_tokens: 800` per turn, streaming via SSE

System prompt:
> You are a career exploration coach for people who don't know what's realistic for them — newcomers to Canada with foreign credentials, students with no experience, mid-career switchers. You have a conversation, you don't lecture.
>
> Style:
> - Ask one question at a time. Never dump a list of 5 questions.
> - Within 4-6 exchanges, build enough context to propose 3 concrete career directions with the candidate.
> - Always ask about country of education and credentials early — this is the highest-leverage info for newcomers.
> - For newcomers, you must know about Canadian recertification pathways: WES credential evaluation, provincial regulatory bodies (engineers, nurses, teachers, accountants), bridging programs at colleges, and quick-entry alternatives that don't require recertification.
>
> Output:
> - During conversation: plain conversational text, one question at a time.
> - When you have enough context, end your turn with a special block: `<roadmap>{"paths": [{"title": string, "timeline": string, "steps": [string], "certifications": [string], "realistic_salary_range_cad": string}]}</roadmap>`. The client renders this as a visual roadmap.

### Agent 3 — Interview Prep
File: `server/src/prompts/interview.ts`
Model: `claude-sonnet-4-6`, `max_tokens: 2000`

System prompt:
> You generate role-specific interview prep for a candidate at a stated experience level. Your job is realistic preparation, not generic advice.
>
> Output exactly this JSON: `{"behavioral": [{"q": string, "what_theyre_really_asking": string, "sample_structure": string}], "technical": [{"q": string, "key_concepts_to_cover": [string]}], "presentation_tips": [string]}`. Behavioral: 4 questions. Technical: 4 questions. Tips: 3-5 lines.
>
> Rules:
> - Technical questions match the actual role and seniority — no generic "what is polymorphism" for a senior data engineer.
> - `sample_structure` uses STAR format with a one-line skeleton, not a full fake answer.
> - Presentation tips are tuned to the candidate context (e.g., newcomer talking about foreign experience without underselling; career switcher framing transferable skills).

### Why three separate prompts, not one big agent
Each agent has a sharply defined output contract (JSON shape or streaming + roadmap block). One unified agent would have to decide which mode it's in, which is a failure mode under demo pressure. Three single-purpose agents are dramatically more reliable.

---

## 4. Day-by-day build order

Core principle: **vertical slices, never horizontal.** Demo-able app by end of Monday. Each day adds a feature without breaking what works.

### TONIGHT (Monday) — Skeleton + Tailor v0 (~4 hours)
Goal: paste resume + paste job → get tailored output. Submittable as-is if catastrophe strikes.

1. Create GitHub repo `launchpath`, public, MIT license.
2. Monorepo scaffold: root `package.json` with `concurrently`, `/client` (Vite+React+TS+Tailwind+shadcn init), `/server` (Express+TS+ts-node-dev).
3. `.env` in server with `ANTHROPIC_API_KEY`, gitignored.
4. Express boots on `:3001`, GET `/api/health` returns `{ok:true}`.
5. Anthropic SDK wired, `lib/anthropic.ts` singleton.
6. POST `/api/tailor` with the Agent 1 prompt — returns JSON.
7. Single page: 2 textareas + "Tailor" button + result area. No router yet.
8. Smoke test with a real sample resume + a real job posting.
9. Commit. Push. Tag `v0-skeleton`.

### TUESDAY (Gurnoor full day, Cousin 6h)

**Gurnoor:**
- AM: React Router. Split into `Home` + 3 feature pages. shadcn theme pass.
- Late AM: TemplatePicker component + 5 template JSONs on server.
- PM: Career Chat — streaming endpoint, ChatWindow component, message state.
- Evening: Parse `<roadmap>` block from chat → render visual roadmap card.
- Done state: Tailor + Career Chat both working end-to-end. Tag `v1-two-features`.

**Cousin (6h):**
- 2h Figma — landing page, feature cards, color palette, typography.
- 2h UI copy — hero, feature card text, button labels, empty states.
- 1h Demo script outline (rough beats).
- 1h QA pass on tonight's build, file bugs in `BUGS.md`.

### WEDNESDAY (Gurnoor full day, Cousin 9h)

**Gurnoor:**
- AM: Interview Prep feature — backend + UI, full vertical slice.
- Late AM: Drag-drop upload UI. `.txt` parses today; `.pdf` via `pdf-parse` if AM finishes ahead.
- PM: Integrate cousin's Figma — colors, spacing, copy, polish.
- Evening: Error states, loading states, retry on API failure, mobile responsive check.
- 9 PM: Full dress rehearsal with cousin doing live demo.
- 10 PM: Record 2-minute backup demo video.
- Done state: All 3 features polished. Tag `v2-feature-complete`.

**Cousin (9h):**
- 3h Pitch deck (5-7 slides: problem, audience, what we built, tech, team, ask).
- 2h Refine UI copy now that real product is visible.
- 2h Demo script — exact words, exact timing (target 3 min).
- 2h QA + accessibility check (color contrast, keyboard nav, screen reader friendliness).

### THURSDAY (Gurnoor until 2 PM, Cousin 4h morning)

**Gurnoor:**
- 09:00-11:00: Fix bugs from Wed QA. **No new features past 11 AM.**
- 11:00-12:00: README, screenshots, repo cleanup, samples directory.
- 12:00-13:00: STRETCH only if green — deploy to Vercel + Render. Otherwise stay localhost.
- 13:00-13:45: Fill submission form, double-check checklist.
- **13:45: SUBMIT. 15-minute buffer is non-negotiable.**

**Cousin:**
- Final 2 demo rehearsals.
- Deck final pass.
- Last copy tweaks.

### FRIDAY (Expo 12-4 PM, Wisedocs)
- Cousin leads pitch + demo narration.
- Gurnoor drives laptop + answers tech questions.
- One sample resume + one sample job posting pre-loaded in `samples/`.

### Hard scope cuts if Tue or Wed slips
1. Cut PDF parsing → text-paste only.
2. Cut Figma integration → ship default shadcn theme.
3. Cut roadmap visual block → render as text list.
4. Cut Interview Prep last (career story is the demo's emotional core; Tailor is the technical hook).

---

## 5. Submission checklist (Thursday by 13:45)

### Repo state
- [ ] `README.md`: name, 1-paragraph description, screenshot, "what's built this week vs prior work", setup instructions, `.env.example`, samples reference
- [ ] `.gitignore` confirmed excluding `.env`, `node_modules`, `dist`
- [ ] No API keys committed (`git log -p` grep for `sk-ant`)
- [ ] All commits pushed to `main`
- [ ] Repo public
- [ ] MIT license file

### Submission form (text-file draft ready)
- [ ] Team number (from organizers)
- [ ] Team name
- [ ] Both members: full name + email (Gurnoor: harkirat.khurana2@gmail.com; cousin: TBD)
- [ ] Project name: LaunchPath
- [ ] One-paragraph description (Section 1, polished)
- [ ] What was built this week: "Everything. Repo initialized 2026-05-26, all features built Monday-Thursday." Prior work: "None."
- [ ] Repo link
- [ ] Live build link (Vercel URL if deployed, else omit — brief allows repo-only)
- [ ] Demo plan: "Live demo at Friday expo. Backup video at `/demo.mp4` in repo."

### Backup demo video (record Wed evening)
- [ ] 2-minute screen recording of full happy path
- [ ] Uploaded to repo `/demo.mp4` or unlisted YouTube
- [ ] Linked from README

### Final smoke test (Thu 13:30)
- [ ] Fresh `git clone` into new folder
- [ ] `npm install && npm run dev` from scratch
- [ ] Run all 3 features with sample data → submit

---

## 6. Demo script outline (Friday, ~3 min per judge group)

Cousin narrates. Gurnoor drives.

**Beat 1 — Hook (20s)**
Cousin: *"Meet Priya. Trained as a nurse in India, immigrated to Toronto last year. Eight months job-hunting, no offers, no idea what's realistic. This is who we built for."*

**Beat 2 — Career Path Explorer (60s)** — lead with emotion
Gurnoor opens Career Chat. Types: *"I was a nurse in India, my degree is from Mumbai, I'm in Toronto now."* Streams Claude asking about credential evaluation, College of Nurses of Ontario, bridging programs. After 3-4 exchanges, roadmap renders with 3 paths + timelines.
Cousin: *"This isn't a chatbot reading off a list. It knows WES evaluation, bridging programs, recertification timelines — what actually matters to a newcomer."*

**Beat 3 — Resume + Cover Letter Tailor (60s)** — technical hook
Gurnoor pastes Priya's resume + an RPN role at a Toronto hospital. Click Tailor. Show tailored bullets reframing India experience in Canadian healthcare vocabulary. Scroll to cover letter, highlight `[your story]` placeholders.
Cousin: *"It writes the skeleton. It will not pretend to be her — pure-AI cover letters are easy to spot, so we made authenticity a feature."*

**Beat 4 — Interview Prep (30s)** — quick close
Gurnoor picks "RPN, entry-level Canadian healthcare." Show behavioral + technical questions + presentation tips ("how to talk about your India experience without underselling").

**Beat 5 — Close (20s)**
Cousin: *"Three agents, one cohesive flow, built in three days by a two-person team. Resume tailoring, conversational career exploration with real recertification awareness, role-specific interview prep. Built for the people the standard job-search tools forget."*

### Demo discipline
- Pre-load sample data in `samples/`, paste from there. Never type live.
- Laptop on power, notifications off, single browser window.
- Alternate "career switcher" sample ready if cousin wants flexibility per judge.

---

## 7. Future expansion (post-hackathon, parked)

Recorded so nothing gets lost.

- **Outreach coach** — templates and personalized tips for reaching out to employers.
- **Job fair finder** — relevant job fairs, events, networking opportunities by location and field. Needs real data sources (Eventbrite API, manual curation).
- **Niche-specific tips pages** — dedicated content for each underrepresented group.
- **User accounts + saved sessions** — MongoDB persistence, Google OAuth.
- **Multi-language UI** — French/Mandarin/Spanish for newcomer audience.
- **Deeper recertification database** — structured data on Canadian provincial regulatory bodies, bridging programs, WES requirements per credential type.
- **PDF parsing of uploaded resumes** — `pdf-parse` backend integration (will likely land Wed if AM goes fast).

---

## 8. Open items / TBDs

- [ ] Cousin's email for submission form
- [ ] Final project name (LaunchPath placeholder)
- [ ] Team number from organizers
- [ ] Confirm whether Anthropic API key has sufficient credits for ~3 days of dev iteration + Friday demo
