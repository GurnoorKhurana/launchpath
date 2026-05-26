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
