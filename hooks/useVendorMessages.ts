"use client";

import { useCallback, useRef, useState } from "react";
import { requestVendorMessage } from "@/lib/api/client";
import type { PlanSnapshot } from "@/types/plan";
import type { VendorMessageMap } from "@/components/plan/VendorsPanel";

function describeError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "The request took too long. Please try again.";
  }
  if (error instanceof Error && error.message && error.name !== "TypeError") {
    return error.message;
  }
  return "The service could not be reached. Check your connection and try again.";
}

/**
 * Per-vendor abortable draft-request state for the vendor message panel.
 */
export function useVendorMessages(plan: PlanSnapshot | null) {
  const [vendorMessageStates, setVendorMessageStates] = useState<VendorMessageMap>({});
  const vendorControllersRef = useRef(new Map<string, AbortController>());

  const abortVendorRequests = useCallback(() => {
    for (const controller of vendorControllersRef.current.values()) {
      controller.abort();
    }
    vendorControllersRef.current.clear();
  }, []);

  const handleDraftVendorMessage = useCallback(
    async (vendor: { id: string; name: string }) => {
      if (!plan) return;

      vendorControllersRef.current.get(vendor.id)?.abort();
      const controller = new AbortController();
      vendorControllersRef.current.set(vendor.id, controller);
      setVendorMessageStates((current) => ({
        ...current,
        [vendor.id]: { status: "loading" },
      }));

      try {
        const message = await requestVendorMessage(
          plan.brief,
          vendor.name,
          plan.brief.notes,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setVendorMessageStates((current) => ({
          ...current,
          [vendor.id]: { status: "ready", data: message },
        }));
      } catch (error) {
        if (controller.signal.aborted) return;
        setVendorMessageStates((current) => ({
          ...current,
          [vendor.id]: { status: "error", error: describeError(error) },
        }));
      } finally {
        if (vendorControllersRef.current.get(vendor.id) === controller) {
          vendorControllersRef.current.delete(vendor.id);
        }
      }
    },
    [plan],
  );

  return {
    vendorMessageStates,
    setVendorMessageStates,
    handleDraftVendorMessage,
    abortVendorRequests,
  };
}
