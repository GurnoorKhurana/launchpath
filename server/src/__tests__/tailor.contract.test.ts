import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

vi.mock("../lib/anthropic.ts", () => ({
  getAnthropic: vi.fn(),
  MODEL_ID: "claude-sonnet-4-6",
}));

import { getAnthropic } from "../lib/anthropic.ts";
import { app } from "../index.ts";

const validJdAnalysis = {
  roleTitle: "Senior Backend Engineer",
  seniority: "senior",
  mustHaves: ["5+ years Node.js", "PostgreSQL"],
  niceToHaves: ["GraphQL"],
  keywords: ["Node.js", "TypeScript", "PostgreSQL", "REST"],
  employerSignals: ["remote-first", "fast-paced startup"],
  redFlags: [],
};

const validTailorOutput = {
  tailoredBullets: ["Led X driving Y%"],
  matchAnalysis: { strengths: ["Z"], gaps: ["W"] },
  coverLetterDraft: "Dear hiring team... [your story about why this role] ...",
};

/**
 * Mocks two sequential Claude calls: first returns the JD analysis, second returns the tailor JSON.
 */
function mockTwoStage(analysisText: string, tailorText: string) {
  const create = vi
    .fn()
    .mockResolvedValueOnce({ content: [{ type: "text", text: analysisText }] })
    .mockResolvedValueOnce({ content: [{ type: "text", text: tailorText }] });

  (getAnthropic as any).mockReturnValue({ messages: { create } });
  return create;
}

describe("POST /api/tailor — jobText path", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("runs JD analyzer + tailor and returns enriched shape", async () => {
    mockTwoStage(JSON.stringify(validJdAnalysis), JSON.stringify(validTailorOutput));

    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "I was a nurse in India.", jobText: "RPN at Toronto hospital." })
      .expect(200);

    expect(res.body).toHaveProperty("jdAnalysis.roleTitle", "Senior Backend Engineer");
    expect(Array.isArray(res.body.jdAnalysis.keywords)).toBe(true);
    expect(res.body).toHaveProperty("tailoredBullets");
    expect(res.body).toHaveProperty("matchAnalysis.strengths");
    expect(res.body.coverLetterDraft).toContain("[your story");
    expect(res.body).not.toHaveProperty("fetched");
  });

  it("returns 400 when resumeText is missing", async () => {
    await request(app).post("/api/tailor").send({ jobText: "x" }).expect(400);
  });

  it("returns 400 when neither jobText nor jobUrl is provided", async () => {
    const res = await request(app).post("/api/tailor").send({ resumeText: "x" }).expect(400);
    expect(res.body.error).toMatch(/jobText or jobUrl/);
  });

  it("recovers when Claude wraps the tailor JSON in markdown code fences", async () => {
    const fenced = "```json\n" + JSON.stringify(validTailorOutput) + "\n```";
    mockTwoStage(JSON.stringify(validJdAnalysis), fenced);

    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "x", jobText: "y" })
      .expect(200);

    expect(res.body.tailoredBullets).toEqual(["Led X driving Y%"]);
  });
});

describe("POST /api/tailor — jobUrl path", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("fetches via JSON-LD JobPosting and returns fetched.source = json-ld", async () => {
    const jdHtml = `<html><head><title>SBE</title>
      <script type="application/ld+json">${JSON.stringify({
        "@type": "JobPosting",
        title: "Senior Backend Engineer",
        description:
          "We are hiring a senior backend engineer with 5+ years of experience in Node.js, Postgres, and distributed systems. You will lead the design of our payments platform and mentor junior engineers. Remote-first team based in Toronto.",
      })}</script></head><body></body></html>`;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(jdHtml, { status: 200, headers: { "Content-Type": "text/html" } }),
    );
    mockTwoStage(JSON.stringify(validJdAnalysis), JSON.stringify(validTailorOutput));

    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "x", jobUrl: "https://example.com/jobs/sbe" })
      .expect(200);

    expect(res.body.fetched).toMatchObject({ source: "json-ld" });
    expect(res.body.jdAnalysis.roleTitle).toBe("Senior Backend Engineer");
    fetchSpy.mockRestore();
  });

  it("falls back to main-text when no JSON-LD is present", async () => {
    const longText = "We are hiring a Registered Practical Nurse for a long-term care facility in Toronto. The successful candidate will provide direct patient care, administer medications, and document charts. Must be registered with the College of Nurses of Ontario. Two years of LTC experience preferred. Shift work including weekends.";
    const html = `<html><head><title>RPN</title></head><body><main><h1>RPN</h1><p>${longText}</p></main></body></html>`;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(html, { status: 200, headers: { "Content-Type": "text/html" } }),
    );
    mockTwoStage(JSON.stringify(validJdAnalysis), JSON.stringify(validTailorOutput));

    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "x", jobUrl: "https://example.com/jobs/rpn" })
      .expect(200);

    expect(res.body.fetched.source).toBe("main-text");
    fetchSpy.mockRestore();
  });

  it("returns 422 with reason=too_short when the page response is tiny", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html><body>nope</body></html>", { status: 200, headers: { "Content-Type": "text/html" } }),
    );

    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "x", jobUrl: "https://example.com/empty" })
      .expect(422);

    expect(res.body.reason).toBe("too_short");
    fetchSpy.mockRestore();
  });

  it("returns 422 with reason=no_jd_found when body has lots of HTML but no real text", async () => {
    // ~600 chars of HTML, but the visible text is well under 200 chars.
    const html = `<html><head><title>tiny</title></head><body><script>const x=1;const y=2;const z=3;const a=4;const b=5;const c=6;const d=7;const e=8;</script><style>.a{}.b{}.c{}.d{}.e{}.f{}.g{}.h{}.i{}.j{}.k{}.l{}.m{}</style><nav>Home</nav><footer>tiny</footer><div>hi</div></body></html>`;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(html, { status: 200, headers: { "Content-Type": "text/html" } }),
    );

    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "x", jobUrl: "https://example.com/sparse" })
      .expect(422);

    expect(res.body.reason).toBe("no_jd_found");
    fetchSpy.mockRestore();
  });

  it("returns 422 with reason=invalid_url for a non-http URL", async () => {
    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "x", jobUrl: "file:///etc/passwd" })
      .expect(422);
    expect(res.body.reason).toBe("invalid_url");
  });
});
