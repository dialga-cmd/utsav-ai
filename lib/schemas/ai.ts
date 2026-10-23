import { z } from "zod";
import { eventBriefSchema } from "@/lib/schemas/event";
import { IDEA_REFINEMENTS } from "@/types/ai";

export const followUpSchema = z.object({
  field: z.enum(["eventType", "eventDate", "guests", "budgetInr"]),
  question: z.string().min(5).max(160),
});

export const aiExtractionSchema = z.object({
  eventType: z.enum(["wedding", "birthday", "community"]).nullable(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  guests: z.number().int().min(0).max(5_000).nullable(),
  budgetInr: z.number().int().min(0).max(100_000_000).nullable(),
  city: z.string().trim().min(1).max(80).nullable(),
});

const ideaLineSchema = z.string().trim().min(3).max(240);

export const aiIdeasSchema = z.object({
  theme: z.string().trim().min(3).max(320),
  menu: z.array(ideaLineSchema).min(2).max(6),
  activities: z.array(ideaLineSchema).min(2).max(6),
  decor: z.array(ideaLineSchema).min(2).max(6),
  gifts: z.array(ideaLineSchema).min(2).max(6),
  savings: z.array(ideaLineSchema).min(2).max(5),
});

export const ideaSetSchema = aiIdeasSchema.extend({
  source: z.enum(["ai", "fallback"]),
});

export const aiVendorMessageSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(20).max(1_200),
});

export const vendorMessageSchema = aiVendorMessageSchema.extend({
  source: z.enum(["ai", "fallback"]),
});

export const refinementSchema = z.enum(IDEA_REFINEMENTS);

export const ideasRequestSchema = z.object({
  brief: eventBriefSchema,
  refinement: refinementSchema.nullable().optional(),
});

export const vendorMessageRequestSchema = z.object({
  brief: eventBriefSchema,
  vendorName: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(500).optional(),
});

export type AiExtractionOutput = z.infer<typeof aiExtractionSchema>;
export type AiIdeasOutput = z.infer<typeof aiIdeasSchema>;
export type AiVendorMessageOutput = z.infer<typeof aiVendorMessageSchema>;
export type IdeasRequest = z.infer<typeof ideasRequestSchema>;
export type VendorMessageRequest = z.infer<typeof vendorMessageRequestSchema>;
