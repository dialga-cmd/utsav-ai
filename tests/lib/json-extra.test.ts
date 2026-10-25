import { describe, expect, it } from "vitest";
import { parseModelJson } from "@/lib/ai/json";

describe("parseModelJson", () => {
  it("parses plain JSON", () => {
    const result = parseModelJson('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });
  it("parses markdown-fenced JSON", () => {
    const result = parseModelJson('```json\n{"a": 1}\n```');
    expect(result).toEqual({ a: 1 });
  });
  it("extracts the JSON object from surrounding text", () => {
    const result = parseModelJson('Here is the result: {"b": "c"} hope that helps');
    expect(result).toEqual({ b: "c" });
  });
  it("throws when no JSON object is present", () => {
    expect(() => parseModelJson("no json here")).toThrow();
  });
});
