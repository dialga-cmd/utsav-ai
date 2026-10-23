import type { EventBrief } from "@/types/event";

export type BudgetTier = "economy" | "standard" | "premium";

/** One editable line in the budget. All amounts are whole rupees. */
export interface BudgetCategory {
  id: string;
  label: string;
  plannedInr: number;
  sharePct: number;
  guidance: string;
}

export interface BudgetBreakdown {
  totalInr: number;
  perGuestInr: number;
  tier: BudgetTier;
  categories: BudgetCategory[];
}

export type TaskUrgency = "on_track" | "tight" | "urgent";

export interface TimelineTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  leadDays: number;
  /** YYYY-MM-DD calendar date. */
  dueDate: string;
  urgency: TaskUrgency;
  compressed: boolean;
  done: boolean;
}

export interface TimelinePlan {
  eventDate: string;
  daysUntil: number;
  compressed: boolean;
  tasks: TimelineTask[];
}

export type TimelineBuildResult =
  | { ok: true; plan: TimelinePlan }
  | { ok: false; code: "PAST_DATE" | "INVALID_DATE"; error: string };

export const VENDOR_STATUSES = [
  "not_contacted",
  "contacted",
  "quoted",
  "booked",
] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export interface VendorEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  checklist: string[];
  status: VendorStatus;
  quoteInr: number | null;
}

export type AiSource = "ai" | "fallback";

export interface IdeaSet {
  theme: string;
  menu: string[];
  activities: string[];
  decor: string[];
  gifts: string[];
  savings: string[];
  source: AiSource;
}

export interface PlanSnapshot {
  brief: EventBrief;
  budget: BudgetBreakdown;
  timeline: TimelinePlan;
  vendors: VendorEntry[];
  ideas: IdeaSet | null;
}
