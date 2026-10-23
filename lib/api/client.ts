import {
  extractedEventSchema,
  ideaSetSchema,
  vendorMessageSchema,
} from "@/lib/schemas/ai";
import type { IdeaRefinement } from "@/types/ai";
import type { EventBrief } from "@/types/event";
import type { IdeaSet } from "@/types/plan";
import type { ExtractedEvent, VendorMessage } from "@/types/ai";

const REQUEST_TIMEOUT_MS = 20_000;

interface ApiErrorBody {
  error?: unknown;
}

function combineSignals(signal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();

  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forwardAbort);
    },
  };
}

async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const combined = combineSignals(signal);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: combined.signal,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const body = payload as ApiErrorBody | null;
      const message =
        typeof body?.error === "string"
          ? body.error
          : "The request failed. Please try again.";
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (combined.signal.aborted) {
      throw new DOMException("The request was aborted.", "AbortError");
    }
    throw error;
  } finally {
    combined.cleanup();
  }
}

export async function extractEvent(
  text: string,
  signal?: AbortSignal,
): Promise<ExtractedEvent> {
  const payload = await postJson("/api/extract", { text }, signal);
  const parsed = extractedEventSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("We could not read the planning response. Please try again.");
  }
  return parsed.data;
}

export async function requestIdeas(
  brief: EventBrief,
  refinement: IdeaRefinement | null,
  signal?: AbortSignal,
): Promise<IdeaSet> {
  const payload = await postJson("/api/ideas", { brief, refinement }, signal);
  const parsed = ideaSetSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("We could not read the ideas response. Please try again.");
  }
  return parsed.data;
}

export async function requestVendorMessage(
  brief: EventBrief,
  vendorName: string,
  notes: string,
  signal?: AbortSignal,
): Promise<VendorMessage> {
  const payload = await postJson(
    "/api/vendor-message",
    { brief, vendorName, notes: notes.slice(0, 500) },
    signal,
  );
  const parsed = vendorMessageSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("We could not read the draft. Please try again.");
  }
  return parsed.data;
}
