import type { CriticalEventField, EventType } from "@/types/event";
import type { AiSource } from "@/types/plan";

/** Supported one-tap idea refinements. */
export const IDEA_REFINEMENTS = [
  "cheaper",
  "more_traditional",
  "more_modern",
  "kid_friendly",
] as const;

export type IdeaRefinement = (typeof IDEA_REFINEMENTS)[number];

export interface FollowUp {
  field: CriticalEventField;
  question: string;
}

/** Output of free-text extraction before the deterministic plan is built. */
export interface ExtractedEvent {
  eventType: EventType | null;
  eventDate: string | null;
  guests: number | null;
  budgetInr: number | null;
  city: string | null;
  notes: string;
  followUps: FollowUp[];
  source: AiSource;
}

export interface VendorMessage {
  subject: string;
  message: string;
  source: AiSource;
}
