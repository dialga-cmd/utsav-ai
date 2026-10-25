import { extractEventDetails } from "@/lib/ai/service";
import { guardApiRequest, jsonResponse } from "@/lib/api/http";
import { extractRequestSchema } from "@/lib/schemas/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return guardApiRequest(
    request,
    extractRequestSchema,
    async ({ text }) => {
      const extracted = await extractEventDetails(text);
      return jsonResponse(extracted);
    },
    "extract",
  );
}
