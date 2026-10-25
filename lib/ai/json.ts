/**
 * Extract a JSON object from a model response. Gemini is asked for JSON only,
 * but stripping a markdown fence keeps the boundary tolerant of small slips.
 */
export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Model response did not contain a JSON object.");
  }

  return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
}
