"use client";

import { useState } from "react";
import { formatInr } from "@/lib/format";

interface MoneyInputProps {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  nullable?: boolean;
  max?: number;
  describedBy?: string;
}

/**
 * A controlled rupee input with a local draft so clearing the field does not
 * immediately rewrite the saved plan. The value commits on blur or Enter.
 */
export function MoneyInput({
  id,
  label,
  value,
  onChange,
  nullable = false,
  max = 100_000_000,
  describedBy,
}: MoneyInputProps) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onChange(nullable ? null : 0);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(value === null ? "" : String(value));
      return;
    }

    const rounded = Math.min(max, Math.round(parsed));
    onChange(rounded);
    setDraft(String(rounded));
  }

  return (
    <div className="money-field">
      <label htmlFor={id} className="field-label no-print">
        {label}
      </label>
      <input
        id={id}
        className="field-input no-print"
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={1}
        value={draft}
        aria-describedby={describedBy}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
          }
        }}
      />
      <span className="print-value">
        {label}: {value === null ? "Not recorded" : formatInr(value)}
      </span>
    </div>
  );
}
