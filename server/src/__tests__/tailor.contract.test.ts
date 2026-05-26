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

  it("recovers when Claude wraps JSON in markdown code fences", async () => {
    const fakeJson = {
      tailoredBullets: ["A"],
      matchAnalysis: { strengths: ["B"], gaps: ["C"] },
      coverLetterDraft: "[your story about why this role]",
    };
    const fenced = "```json\n" + JSON.stringify(fakeJson) + "\n```";

    (getAnthropic as any).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: fenced }],
        }),
      },
    });

    const res = await request(app)
      .post("/api/tailor")
      .send({ resumeText: "x", jobText: "y" })
      .expect(200);

    expect(res.body.tailoredBullets).toEqual(["A"]);
    expect(res.body.coverLetterDraft).toContain("[your story");
  });
});
