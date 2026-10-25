/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useExtraction } from "@/hooks/useExtraction";

describe("useExtraction", () => {
  it("exposes handlers", () => {
    const handlers = {
      applyPlan: () => {},
      setIntake: () => {},
      setErrors: () => {},
      setFollowUps: () => {},
      setStatusMessage: () => {},
      setExtractionSource: () => {},
      setIsExtracting: () => {},
      setFreeText: () => {},
      setFreeTextError: () => {},
    };
    const { result } = renderHook(() =>
      useExtraction(
        "",
        {
          eventType: "wedding",
          eventDate: "",
          guests: "",
          budgetInr: "",
          city: "",
          notes: "",
        } as never,
        null,
        handlers,
      ),
    );
    expect(typeof result.current.handleExtract).toBe("function");
    expect(typeof result.current.handleDemo).toBe("function");
  });
});
