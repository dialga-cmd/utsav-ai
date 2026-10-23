"use client";

import { useState } from "react";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { VENDOR_STATUS_LABELS } from "@/lib/constants";
import { formatInr } from "@/lib/format";
import type { VendorMessage } from "@/types/ai";
import {
  VENDOR_STATUSES,
  type PlanSnapshot,
  type VendorEntry,
  type VendorStatus,
} from "@/types/plan";

export type VendorMessageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: VendorMessage }
  | { status: "error"; error: string };

export type VendorMessageMap = Record<string, VendorMessageState | undefined>;

interface VendorsPanelProps {
  plan: PlanSnapshot;
  messageStates: VendorMessageMap;
  onStatusChange: (vendorId: string, status: VendorStatus) => void;
  onQuoteChange: (vendorId: string, quoteInr: number | null) => void;
  onDraftMessage: (vendor: VendorEntry) => void;
}

export function VendorsPanel({
  plan,
  messageStates,
  onStatusChange,
  onQuoteChange,
  onDraftMessage,
}: VendorsPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copyMessage(vendor: VendorEntry, message: string) {
    setCopyError(null);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(message);
      setCopiedId(vendor.id);
    } catch {
      setCopyError(
        "Copy is not available in this browser. Select the draft text instead.",
      );
    }
  }

  return (
    <div>
      <div className="panel-toolbar">
        <div>
          <h2 id="vendors-heading" className="panel-heading">
            Vendor checklist
          </h2>
          <p className="panel-copy">
            Categories to compare, not invented vendor names. Record the quote and status
            so the next conversation starts in the right place.
          </p>
        </div>
        <span className="badge badge-neutral">{plan.vendors.length} categories</span>
      </div>

      {copyError ? (
        <p className="notice notice-danger mb-3" role="alert">
          {copyError}
        </p>
      ) : null}

      <div className="vendor-grid">
        {plan.vendors.map((vendor) => {
          const messageState = messageStates[vendor.id] ?? { status: "idle" };

          return (
            <article key={vendor.id} className="vendor-card">
              <div className="vendor-heading">
                <div>
                  <p className="vendor-category">{vendor.category}</p>
                  <h3 className="vendor-name">{vendor.name}</h3>
                  <p className="vendor-description">{vendor.description}</p>
                </div>
                <span className="print-only">
                  Status: {VENDOR_STATUS_LABELS[vendor.status]}. Quote:{" "}
                  {vendor.quoteInr === null ? "not recorded" : formatInr(vendor.quoteInr)}
                  .
                </span>
              </div>

              <ul className="vendor-checklist">
                {vendor.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="vendor-controls">
                <div className="field">
                  <label
                    className="field-label no-print"
                    htmlFor={`vendor-status-${vendor.id}`}
                  >
                    Status
                  </label>
                  <select
                    id={`vendor-status-${vendor.id}`}
                    className="field-select no-print"
                    value={vendor.status}
                    onChange={(event) =>
                      onStatusChange(vendor.id, event.target.value as VendorStatus)
                    }
                  >
                    {VENDOR_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {VENDOR_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <MoneyInput
                  id={`vendor-quote-${vendor.id}`}
                  label="Quote received (₹)"
                  value={vendor.quoteInr}
                  nullable
                  onChange={(amount) => onQuoteChange(vendor.id, amount)}
                />
              </div>

              <div className="no-print mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => onDraftMessage(vendor)}
                  disabled={messageState.status === "loading"}
                >
                  {messageState.status === "loading" ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Drafting…
                    </>
                  ) : messageState.status === "ready" ? (
                    "Draft again"
                  ) : (
                    "Draft enquiry"
                  )}
                </button>
                {messageState.status === "ready" ? (
                  <button
                    type="button"
                    className="btn btn-quiet btn-small"
                    onClick={() => void copyMessage(vendor, messageState.data.message)}
                  >
                    {copiedId === vendor.id ? "Copied" : "Copy message"}
                  </button>
                ) : null}
              </div>

              {messageState.status === "loading" ? (
                <p className="status-line mt-1" role="status">
                  Writing a short, plain-text enquiry for {vendor.name}.
                </p>
              ) : null}

              {messageState.status === "error" ? (
                <p className="field-error mt-1" role="alert">
                  {messageState.error}
                </p>
              ) : null}

              {messageState.status === "ready" ? (
                <div className="vendor-message no-print">
                  <p className="sr-only" role="status">
                    Draft ready for {vendor.name}.
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h4>{messageState.data.subject}</h4>
                    <span
                      className={`badge ${
                        messageState.data.source === "ai" ? "badge-good" : "badge-neutral"
                      }`}
                    >
                      {messageState.data.source === "ai" ? "AI draft" : "Offline draft"}
                    </span>
                  </div>
                  <pre>{messageState.data.message}</pre>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
