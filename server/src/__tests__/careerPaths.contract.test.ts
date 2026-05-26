import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/anthropic.ts", () => ({
  getAnthropic: vi.fn(),
  MODEL_ID: "claude-sonnet-4-6",
}));

import { getAnthropic } from "../lib/anthropic.ts";
import { app } from "../index.ts";

const validProfile = {
  userType: "newcomer",
  geography: { province: "Ontario", city: "Toronto", openToRelocate: "no" },
  field: { category: "Engineering", subSpecialty: "roads and bridges" },
  branch: {
    countryOfDegree: "Syria",
    degreeLevel: "Bachelor's",
    yearsExperience: 10,
    documents: ["degree certificate", "transcripts"],
    evaluationStatus: "Not yet",
    englishLevel: "Conversational",
    frenchLevel: "Beginner",
  },
  constraints: { incomeWithin: "<3m", retraining: "Bridging program", hoursPerWeek: 10 },
  interests: { R: 5, I: 4, A: 2, S: 3, E: 2, C: 4 },
  notes: "Family needs income soon.",
};

const validRoadmap = {
  paths: [
    {
      title: "Construction Inspector",
      timeline: "3-6 months",
      steps: ["Register with WES", "Apply to inspector roles"],
      certifications: ["WHMIS"],
      realistic_salary_range_cad: "$55,000 - $75,000 CAD",
    },
    {
      title: "P.Eng licensed engineer",
      timeline: "12-24 months",
      steps: ["PEO application", "Pass technical exams"],
      certifications: ["P.Eng"],
      realistic_salary_range_cad: "$80,000 - $110,000 CAD",
    },
    {
      title: "Project coordinator",
      timeline: "6-12 months",
      steps: ["Learn CAD", "Apply to coordinator roles"],
      certifications: [],
      realistic_salary_range_cad: "$60,000 - $80,000 CAD",
    },
  ],
};

describe("POST /api/career-paths", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns { roadmap } for a valid profile", async () => {
    const wrapped = `<roadmap>${JSON.stringify(validRoadmap)}</roadmap>`;
    (getAnthropic as any).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: wrapped }] }),
      },
    });

    const res = await request(app).post("/api/career-paths").send(validProfile).expect(200);
    expect(res.body).toHaveProperty("roadmap.paths");
    expect(Array.isArray(res.body.roadmap.paths)).toBe(true);
    expect(res.body.roadmap.paths).toHaveLength(3);
    expect(res.body.roadmap.paths[0].title).toBe("Construction Inspector");
  });

  it("accepts a bare JSON object without <roadmap> tags as a fallback", async () => {
    (getAnthropic as any).mockReturnValue({
      messages: {
        create: vi
          .fn()
          .mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(validRoadmap) }] }),
      },
    });

    const res = await request(app).post("/api/career-paths").send(validProfile).expect(200);
    expect(res.body.roadmap.paths).toHaveLength(3);
  });

  it("returns 400 when userType is invalid", async () => {
    const bad = { ...validProfile, userType: "alien" };
    const res = await request(app).post("/api/career-paths").send(bad).expect(400);
    expect(res.body.error).toMatch(/userType/);
  });

  it("returns 400 when geography.province is missing", async () => {
    const bad = { ...validProfile, geography: { ...validProfile.geography, province: "" } };
    const res = await request(app).post("/api/career-paths").send(bad).expect(400);
    expect(res.body.error).toMatch(/province/);
  });

  it("returns 400 when an interests value is out of range", async () => {
    const bad = { ...validProfile, interests: { ...validProfile.interests, R: 9 } };
    const res = await request(app).post("/api/career-paths").send(bad).expect(400);
    expect(res.body.error).toMatch(/interests\.R/);
  });
});
