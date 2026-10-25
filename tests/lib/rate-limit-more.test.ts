import { describe, expect, it, beforeEach } from "vitest";
import {
  consumeRateLimit,
  getClientIp,
  resetRateLimits,
  RATE_LIMIT_MAX_REQUESTS,
} from "@/lib/api/rate-limit";

describe("rate limiter deeper", () => {
  beforeEach(() => {
    resetRateLimits();
    delete process.env.TRUST_PROXY;
  });

  it("getClientIp trusts x-real-ip when TRUST_PROXY is true", () => {
    process.env.TRUST_PROXY = "true";
    const req = new Request("http://x", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("getClientIp falls back to shared when no headers are present", () => {
    process.env.TRUST_PROXY = "true";
    const req = new Request("http://x");
    expect(getClientIp(req)).toBe("__shared__");
  });

  it("getClientIp truncates to 64 chars", () => {
    process.env.TRUST_PROXY = "true";
    const longIp = "a".repeat(200);
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": longIp },
    });
    expect(getClientIp(req).length).toBeLessThanOrEqual(64);
  });

  it("consumeRateLimit allows within the limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      const res = consumeRateLimit("client:a", now + i * 1000);
      expect(res.allowed).toBe(true);
    }
    const blocked = consumeRateLimit("client:a", now + RATE_LIMIT_MAX_REQUESTS * 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("consumeRateLimit resets after the window expires", () => {
    const now = 1_000_000;
    const res = consumeRateLimit("client:b", now);
    expect(res.allowed).toBe(true);
    // After 60s the window resets
    const later = consumeRateLimit("client:b", now + 61_000);
    expect(later.allowed).toBe(true);
    expect(later.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1);
  });
});
