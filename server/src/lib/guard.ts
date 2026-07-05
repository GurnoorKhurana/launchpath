import type { Request, Response, NextFunction } from "express";

// Protects the paid Claude endpoints from abuse: per-IP hourly limit plus a
// global daily cap so a stranger can't burn the API budget.
// ponytail: in-memory counters — single instance, reset on restart; move to a
// store (Redis/SQLite) only if we ever run more than one server.
const HOUR_MS = 3_600_000;
const IP_HOURLY_LIMIT = Number(process.env.IP_HOURLY_LIMIT) || 10;
const DAILY_AI_LIMIT = Number(process.env.DAILY_AI_LIMIT) || 100;

const perIp = new Map<string, { count: number; windowStart: number }>();
let dayKey = "";
let dayCount = 0;

export function aiGuard(req: Request, res: Response, next: NextFunction) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
  }
  if (dayCount >= DAILY_AI_LIMIT) {
    res.status(503).json({ error: "We've hit today's capacity. Please come back tomorrow." });
    return;
  }

  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const entry = perIp.get(ip);
  if (!entry || now - entry.windowStart > HOUR_MS) {
    if (perIp.size > 10_000) perIp.clear(); // ponytail: crude memory bound, fine at this scale
    perIp.set(ip, { count: 1, windowStart: now });
  } else if (++entry.count > IP_HOURLY_LIMIT) {
    res.status(429).json({ error: "Too many requests from this connection. Try again in an hour." });
    return;
  }

  dayCount++;
  next();
}

// test hook
export function _resetGuard() {
  perIp.clear();
  dayKey = "";
  dayCount = 0;
}
