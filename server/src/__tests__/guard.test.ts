import { describe, it, expect, beforeEach } from "vitest";
import { aiGuard, _resetGuard } from "../lib/guard.ts";

function call(ip: string) {
  let status = 200;
  const req = { ip } as any;
  const res = {
    status(s: number) {
      status = s;
      return this;
    },
    json() {
      return this;
    },
  } as any;
  let passed = false;
  aiGuard(req, res, () => {
    passed = true;
  });
  return { passed, status };
}

describe("aiGuard", () => {
  beforeEach(() => _resetGuard());

  it("lets normal traffic through", () => {
    expect(call("1.1.1.1").passed).toBe(true);
  });

  it("blocks an IP after the hourly limit, others unaffected", () => {
    for (let i = 0; i < 10; i++) expect(call("2.2.2.2").passed).toBe(true);
    const blocked = call("2.2.2.2");
    expect(blocked.passed).toBe(false);
    expect(blocked.status).toBe(429);
    expect(call("3.3.3.3").passed).toBe(true);
  });

  it("blocks everyone once the daily cap is hit", () => {
    for (let i = 0; i < 100; i++) call(`10.0.${Math.floor(i / 250)}.${i % 250}`);
    const blocked = call("9.9.9.9");
    expect(blocked.passed).toBe(false);
    expect(blocked.status).toBe(503);
  });
});
