import { createHash } from "node:crypto";
import type { z } from "zod";
import type { EventBrief } from "@/types/event";
import type { ExtractedEvent, IdeaRefinement, VendorMessage } from "@/types/ai";
import type { IdeaSet } from "@/types/plan";
import { buildBudget } from "@/lib/engine/budget";
import { formatCalendarDate } from "@/lib/engine/date";
import type { AiProvider, CompletionRequest } from "@/lib/ai/provider";
import { getAiProvider } from "@/lib/ai/provider";
import { readCachedResponse, writeCachedResponse } from "@/lib/ai/cache";
import { parseModelJson } from "@/lib/ai/json";
import {
  aiExtractionSchema,
  aiIdeasSchema,
  aiVendorMessageSchema,
} from "@/lib/schemas/ai";
import {
  buildFallbackIdeas,
  buildFallbackVendorMessage,
  buildFollowUps,
  extractEventFallback,
} from "@/lib/ai/fallback";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "@/lib/ai/prompts/extract";
import { IDEAS_SYSTEM_PROMPT, buildIdeasPrompt } from "@/lib/ai/prompts/ideas";
import {
  VENDOR_MESSAGE_SYSTEM_PROMPT,
  buildVendorMessagePrompt,
} from "@/lib/ai/prompts/vendor-message";

export interface AiServiceDeps {
  provider?: AiProvider | null;
  now?: Date;
}

async function validatedCompletion<T>(
  provider: AiProvider,
  request: CompletionRequest,
  schema: z.ZodType<T>,
  cacheSeed: string,
): Promise<T> {
  const cacheKey = createHash("sha256").update(cacheSeed).digest("hex");
  const cached = readCachedResponse(cacheKey);
  if (cached) {
    const parsedCache = schema.safeParse(parseModelJson(cached));
    if (parsedCache.success) return parsedCache.data;
  }

  const raw = await provider.complete(request);
  const parsed = schema.parse(parseModelJson(raw));
  writeCachedResponse(cacheKey, raw);
  return parsed;
}

function resolveProvider(deps: AiServiceDeps): AiProvider | null {
  return deps.provider === undefined ? getAiProvider() : deps.provider;
}

/**
 * Extract an event brief from free text. Uses a deterministic parser when the
 * provider is absent or returns malformed output.
 */
export async function extractEventDetails(
  text: string,
  deps: AiServiceDeps = {},
): Promise<ExtractedEvent> {
  const fallback = extractEventFallback(text, deps.now);
  const provider = resolveProvider(deps);
  if (!provider) return fallback;

  try {
    const ai = await validatedCompletion(
      provider,
      {
        system: EXTRACTION_SYSTEM_PROMPT,
        prompt: buildExtractionPrompt(text, formatCalendarDate(deps.now ?? new Date())),
        temperature: 0.1,
        maxOutputTokens: 1_024,
      },
      aiExtractionSchema,
      `extract:${text}`,
    );

    const extracted: ExtractedEvent = {
      eventType: ai.eventType ?? fallback.eventType,
      eventDate: ai.eventDate ?? fallback.eventDate,
      guests: ai.guests ?? fallback.guests,
      budgetInr: ai.budgetInr ?? fallback.budgetInr,
      city: ai.city ?? fallback.city,
      notes: text.trim().slice(0, 1_200),
      source: "ai",
      followUps: [],
    };

    return { ...extracted, followUps: buildFollowUps(extracted) };
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "AI extraction failed, using deterministic fallback:",
        error instanceof Error ? error.message : error,
      );
    }
    return fallback;
  }
}

/** Generate personalised ideas and savings, with a curated fallback. */
export async function generateIdeas(
  brief: EventBrief,
  refinement: IdeaRefinement | null = null,
  deps: AiServiceDeps = {},
): Promise<IdeaSet> {
  const budget = buildBudget(brief);
  const fallback = buildFallbackIdeas(brief, refinement, budget);
  const provider = resolveProvider(deps);
  if (!provider) return fallback;

  const promptBudget = {
    totalInr: budget.totalInr,
    perGuestInr: budget.perGuestInr,
    tier: budget.tier,
    categories: budget.categories.map((category) => ({
      label: category.label,
      plannedInr: category.plannedInr,
    })),
  };

  try {
    const ai = await validatedCompletion(
      provider,
      {
        system: IDEAS_SYSTEM_PROMPT,
        prompt: buildIdeasPrompt({
          briefJson: JSON.stringify(brief),
          budgetJson: JSON.stringify(promptBudget),
          refinement,
        }),
        temperature: 0.65,
        maxOutputTokens: 1_600,
      },
      aiIdeasSchema,
      `ideas:${JSON.stringify({ brief, refinement })}`,
    );

    return { ...ai, source: "ai" };
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "AI ideas generation failed, using deterministic fallback:",
        error instanceof Error ? error.message : error,
      );
    }
    return fallback;
  }
}

/** Draft a vendor enquiry without inventing contact details. */
export async function draftVendorMessage(
  brief: EventBrief,
  vendorName: string,
  notes = "",
  deps: AiServiceDeps = {},
): Promise<VendorMessage> {
  const fallback = buildFallbackVendorMessage(brief, vendorName, notes);
  const provider = resolveProvider(deps);
  if (!provider) return fallback;

  try {
    const ai = await validatedCompletion(
      provider,
      {
        system: VENDOR_MESSAGE_SYSTEM_PROMPT,
        prompt: buildVendorMessagePrompt({
          briefJson: JSON.stringify(brief),
          vendorName,
          notes,
        }),
        temperature: 0.4,
        maxOutputTokens: 900,
      },
      aiVendorMessageSchema,
      `vendor:${JSON.stringify({ brief, vendorName, notes })}`,
    );

    return { ...ai, source: "ai" };
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "AI vendor drafting failed, using deterministic fallback:",
        error instanceof Error ? error.message : error,
      );
    }
    return fallback;
  }
}
