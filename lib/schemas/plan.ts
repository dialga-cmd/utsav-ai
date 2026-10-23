import { z } from "zod";
import { calendarDateSchema, eventBriefSchema } from "@/lib/schemas/event";
import { ideaSetSchema } from "@/lib/schemas/ai";
import { VENDOR_STATUSES } from "@/types/plan";

export const budgetTierSchema = z.enum(["economy", "standard", "premium"]);

export const budgetCategorySchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().min(1).max(80),
  plannedInr: z.number().int().min(0).max(100_000_000),
  actualInr: z.number().int().min(0).max(100_000_000).nullable(),
  sharePct: z.number().min(0).max(100),
  guidance: z.string().max(240),
});

export const budgetBreakdownSchema = z.object({
  totalInr: z.number().int().min(0).max(100_000_000),
  perGuestInr: z.number().int().min(0),
  tier: budgetTierSchema,
  categories: z.array(budgetCategorySchema).min(1).max(20),
});

export const timelineTaskSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  description: z.string().max(300),
  phase: z.string().min(1).max(60),
  leadDays: z.number().int().min(0).max(1_000),
  dueDate: calendarDateSchema,
  urgency: z.enum(["on_track", "tight", "urgent"]),
  compressed: z.boolean(),
  done: z.boolean(),
});

export const timelinePlanSchema = z.object({
  eventDate: calendarDateSchema,
  daysUntil: z.number().int().min(0),
  compressed: z.boolean(),
  tasks: z.array(timelineTaskSchema).min(1).max(40),
});

export const vendorEntrySchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(60),
  description: z.string().max(200),
  checklist: z.array(z.string().min(1).max(240)).min(1).max(10),
  status: z.enum(VENDOR_STATUSES),
  quoteInr: z.number().int().min(0).max(100_000_000).nullable(),
});

export const planSnapshotSchema = z.object({
  brief: eventBriefSchema,
  budget: budgetBreakdownSchema,
  timeline: timelinePlanSchema,
  vendors: z.array(vendorEntrySchema).min(1).max(20),
  ideas: ideaSetSchema.nullable(),
});

export const storedPlanSchema = z.object({
  version: z.literal(1),
  plan: planSnapshotSchema,
});

export type StoredPlan = z.infer<typeof storedPlanSchema>;
