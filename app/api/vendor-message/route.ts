import { draftVendorMessage } from "@/lib/ai/service";
import { guardApiRequest, jsonResponse } from "@/lib/api/http";
import { vendorMessageRequestSchema } from "@/lib/schemas/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return guardApiRequest(
    request,
    vendorMessageRequestSchema,
    async ({ brief, vendorName, notes }) => {
      const message = await draftVendorMessage(brief, vendorName, notes ?? "");
      return jsonResponse(message);
    },
    "vendor-message",
  );
}
