import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getClientIp, resetRateLimits } from "@/lib/api/rate-limit";

describe("rate limit extras", () => {
  beforeEach(() => {
    resetRateLimits();
    delete process.env.TRUST_PROXY;
    delete process.env.VERCEL;
  });

  afterEach(() => {
    delete process.env.TRUST_PROXY;
    delete process.env.VERCEL;
  });

  it("getClientIp falls back to shared when no proxy env vars are set", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4" } });
    expect(getClientIp(req)).toBe("__shared__");
  });

  it("TRUST_PROXY=true uses x-forwarded-for", () => {
    process.env.TRUST_PROXY = "true";
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("VERCEL=1 uses x-forwarded-for without needing TRUST_PROXY", () => {
    process.env.VERCEL = "1";
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "2.3.4.5, 9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("2.3.4.5");
  });

  it("VERCEL=1 trusts x-real-ip when x-forwarded-for is absent", () => {
    process.env.VERCEL = "1";
    const req = new Request("http://x", { headers: { "x-real-ip": "3.4.5.6" } });
    expect(getClientIp(req)).toBe("3.4.5.6");
  });

  it("ignores a spoofed x-forwarded-for when neither env var is set", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "8.8.8.8" },
    });
    expect(getClientIp(req)).toBe("__shared__");
  });

  it("ignores x-forwarded-for when TRUST_PROXY is false and VERCEL is unset", () => {
    process.env.TRUST_PROXY = "false";
    const req = new Request("http://x", { headers: { "x-forwarded-for": "6.7.8.9" } });
    expect(getClientIp(req)).toBe("__shared__");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent but TRUST_PROXY is true", () => {
    process.env.TRUST_PROXY = "true";
    const req = new Request("http://x", { headers: { "x-real-ip": "7.7.7.7" } });
    expect(getClientIp(req)).toBe("7.7.7.7");
  });

  it("shared bucket is still used when VERCEL is set but no forwarded headers exist", () => {
    process.env.VERCEL = "1";
    const req = new Request("http://x");
    expect(getClientIp(req)).toBe("__shared__");
  });
});
