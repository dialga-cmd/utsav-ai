import type { z } from "zod";
import { consumeRateLimit, getClientIp } from "@/lib/api/rate-limit";

const MAX_REQUEST_BYTES = 16_384;

class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export function errorResponse(
  status: number,
  message: string,
  headers: Record<string, string> = {},
): Response {
  return jsonResponse({ error: message }, status, headers);
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiRequestError(415, "Send a JSON request body.");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new ApiRequestError(413, "The request is too large.");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    throw new ApiRequestError(413, "The request is too large.");
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ApiRequestError(400, "The request body is not valid JSON.");
  }
}

/**
 * Apply rate limiting, body limits, schema validation and generic error
 * handling around an AI route handler.
 *
 * Pass a `routeName` so the limiter keeps a separate fixed-window bucket per
 * (client, route) pair — a burst on one route does not exhaust the budget on
 * another.
 */
export async function guardApiRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
  handler: (input: T) => Promise<Response>,
  routeName?: string,
): Promise<Response> {
  const clientKey = getClientIp(request);
  const bucketKey = routeName ? `${clientKey}:${routeName}` : clientKey;
  const rate = consumeRateLimit(bucketKey);
  if (!rate.allowed) {
    return errorResponse(429, "Too many requests. Please wait a moment.", {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  try {
    const body = await readJsonBody(request);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Check the request fields and try again.");
    }

    return await handler(parsed.data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return errorResponse(error.status, error.message, error.headers);
    }
    return errorResponse(500, "Something went wrong. Please try again.");
  }
}
