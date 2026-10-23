import { generateIdeas } from "@/lib/ai/service";
import { guardApiRequest, jsonResponse } from "@/lib/api/http";
import { ideasRequestSchema } from "@/lib/schemas/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return guardApiRequest(request, ideasRequestSchema, async (input) => {
    const ideas = await generateIdeas(input.brief, input.refinement ?? null);
    return jsonResponse(ideas);
  });
}
