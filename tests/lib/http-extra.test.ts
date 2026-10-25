import { describe, expect, it } from "vitest";
import { jsonResponse, errorResponse } from "@/lib/api/http";

describe("http", () => {
  it("jsonResponse has no-store", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
  it("errorResponse", async () => {
    const res = errorResponse(400, "bad");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad");
  });
});
