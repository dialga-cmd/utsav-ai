"use client";

import { useCallback } from "react";
import {
  setBudgetActual,
  setBudgetPlanned,
  setVendorQuote,
  setVendorStatus,
  toggleTimelineTask,
} from "@/lib/plan";
import type { PlanSnapshot, VendorStatus } from "@/types/plan";

/**
 * Pure plan-mutation handlers bound to a `setPlan` dispatcher.
 * The ideas cache is cleared when the budget changes so stale ideas are
 * regenerated on the next load.
 */
export function usePlanMutations(
  setPlan: React.Dispatch<React.SetStateAction<PlanSnapshot | null>>,
  clearIdeasCache?: () => void,
) {
  const handleBudgetPlannedChange = useCallback(
    (categoryId: string, amount: number) => {
      setPlan((current) =>
        current ? setBudgetPlanned(current, categoryId, amount) : current,
      );
      clearIdeasCache?.();
    },
    [setPlan, clearIdeasCache],
  );

  const handleBudgetActualChange = useCallback(
    (categoryId: string, amount: number | null) => {
      setPlan((current) =>
        current ? setBudgetActual(current, categoryId, amount) : current,
      );
    },
    [setPlan],
  );

  const handleToggleTask = useCallback(
    (taskId: string) => {
      setPlan((current) => (current ? toggleTimelineTask(current, taskId) : current));
    },
    [setPlan],
  );

  const handleVendorStatusChange = useCallback(
    (vendorId: string, status: VendorStatus) => {
      setPlan((current) =>
        current ? setVendorStatus(current, vendorId, status) : current,
      );
    },
    [setPlan],
  );

  const handleVendorQuoteChange = useCallback(
    (vendorId: string, quoteInr: number | null) => {
      setPlan((current) =>
        current ? setVendorQuote(current, vendorId, quoteInr) : current,
      );
    },
    [setPlan],
  );

  return {
    handleBudgetPlannedChange,
    handleBudgetActualChange,
    handleToggleTask,
    handleVendorStatusChange,
    handleVendorQuoteChange,
  };
}
