"use client";

import { useEffect } from "react";
import { EXAMPLE_PROMPTS } from "@/lib/constants";
import { formatCalendarDate, startOfUtcDay } from "@/lib/engine/date";
import {
  INTAKE_FIELDS,
  type IntakeErrors,
  type IntakeField,
  type IntakeFormValues,
} from "@/lib/intake";
import type { FollowUp } from "@/types/ai";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { EVENT_TYPES } from "@/types/event";
import { Notice } from "@/components/ui/Notice";

interface IntakePanelProps {
  values: IntakeFormValues;
  errors: IntakeErrors;
  freeText: string;
  freeTextError: string | null;
  followUps: FollowUp[];
  restoreNotice: string | null;
  isExtracting: boolean;
  statusMessage: string;
  onFreeTextChange: (value: string) => void;
  onExample: (text: string) => void;
  onDemo: () => void;
  onExtract: () => void;
  onFieldChange: (field: IntakeField, value: string) => void;
  onSubmit: () => void;
}

function buildDescribedBy(
  field: IntakeField,
  errors: IntakeErrors,
  hint?: string,
): string | undefined {
  const ids: string[] = [];
  if (hint) ids.push(`intake-${field}-hint`);
  if (errors[field]) ids.push(`intake-${field}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function IntakePanel({
  values,
  errors,
  freeText,
  freeTextError,
  followUps,
  restoreNotice,
  isExtracting,
  statusMessage,
  onFreeTextChange,
  onExample,
  onDemo,
  onExtract,
  onFieldChange,
  onSubmit,
}: IntakePanelProps) {
  const minDate = formatCalendarDate(startOfUtcDay(new Date()));
  const firstErrorField = INTAKE_FIELDS.find((field) => errors[field]);
  const focusField = followUps[0]?.field ?? firstErrorField;

  useEffect(() => {
    if (!focusField) return;
    const element = document.getElementById(`intake-field-${focusField}`);
    element?.focus();
  }, [focusField]);

  function handleField(field: IntakeField, value: string) {
    onFieldChange(field, value);
  }

  return (
    <div id="plan-workspace">
      <section className="hero" aria-labelledby="hero-heading">
        <p className="eyebrow">Weddings · Birthdays · Community</p>
        <h1 id="hero-heading" className="hero-title" tabIndex={-1}>
          Plan the celebration. Keep the budget in sight.
        </h1>
        <p className="hero-copy">
          Describe your event in plain language. Utsav AI turns it into a practical
          budget, a countdown timeline, a vendor checklist and ideas that sound like your
          family, not a brochure.
        </p>
        <ul className="hero-points" aria-label="What you get">
          <li>Exact rupee budget</li>
          <li>Back-planned timeline</li>
          <li>What to verify with vendors</li>
          <li>Ideas you can refine</li>
          <li>Print-ready plan</li>
        </ul>
      </section>

      {restoreNotice ? (
        <Notice tone="warning" live title="Starting fresh" className="mb-4">
          {restoreNotice}
        </Notice>
      ) : null}

      <div className="intake-grid">
        <section className="card card-warm card-pad" aria-labelledby="describe-heading">
          <p className="eyebrow">Start here</p>
          <h2 id="describe-heading" className="section-heading mt-1">
            Tell us about the celebration
          </h2>
          <p className="section-copy">
            A sentence is enough. Include the city, date, guest count and budget if you
            know them.
          </p>

          <div className="mt-4 grid gap-1.5">
            <label className="field-label" htmlFor="free-text">
              Describe your event
            </label>
            <textarea
              id="free-text"
              className="field-textarea"
              value={freeText}
              maxLength={1200}
              aria-invalid={freeTextError ? "true" : undefined}
              aria-describedby={
                freeTextError ? "free-text-hint free-text-error" : "free-text-hint"
              }
              placeholder="Example: A 7th birthday party in Pune for 30 guests, budget ₹25,000, with a cake, games and simple snacks."
              onChange={(event) => onFreeTextChange(event.target.value)}
            />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p id="free-text-hint" className="field-hint">
                We use Gemini when configured, with a local parser as a fallback.{" "}
                {freeText.length}/1200 characters.
              </p>
            </div>
            {freeTextError ? (
              <p id="free-text-error" className="field-error">
                {freeTextError}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <p className="field-label" id="examples-label">
              Try an example
            </p>
            <div
              className="chip-row mt-1.5"
              role="group"
              aria-labelledby="examples-label"
            >
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  className="chip"
                  onClick={() => onExample(example.text)}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onExtract}
              disabled={isExtracting}
              aria-describedby="extract-status"
            >
              {isExtracting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Reading your note…
                </>
              ) : (
                "Read my note & build a plan"
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onDemo}
              disabled={isExtracting}
            >
              Try the demo
            </button>
          </div>
          <p id="extract-status" className="status-line mt-2" aria-live="polite">
            {statusMessage}
          </p>
        </section>

        <form
          className="card card-pad"
          aria-labelledby="details-heading"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          noValidate
        >
          <p className="eyebrow">Or be precise</p>
          <h2 id="details-heading" className="section-heading mt-1">
            Set the details yourself
          </h2>
          <p className="section-copy">
            The fallback form works without an API key. Every field except notes is
            required.
          </p>

          {followUps.length > 0 ? (
            <Notice
              tone="warning"
              live
              title="A couple of details to confirm"
              className="followups"
            >
              <ol>
                {followUps.map((followUp) => (
                  <li key={followUp.field}>{followUp.question}</li>
                ))}
              </ol>
              <p className="mt-1">
                We have filled in what we understood. Complete the highlighted fields and
                build your plan.
              </p>
            </Notice>
          ) : null}

          <div className="mt-4 grid gap-3">
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="intake-field-eventType">
                  Event type
                </label>
                <select
                  id="intake-field-eventType"
                  className="field-select"
                  value={values.eventType}
                  onChange={(event) => handleField("eventType", event.target.value)}
                >
                  {EVENT_TYPES.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {EVENT_TYPE_LABELS[eventType]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="intake-field-eventDate">
                  Event date
                </label>
                <input
                  id="intake-field-eventDate"
                  className="field-input"
                  type="date"
                  min={minDate}
                  value={values.eventDate}
                  aria-invalid={errors.eventDate ? "true" : undefined}
                  aria-describedby={buildDescribedBy(
                    "eventDate",
                    errors,
                    "Use a future date.",
                  )}
                  onChange={(event) => handleField("eventDate", event.target.value)}
                />
                <p id="intake-eventDate-hint" className="field-hint">
                  Used for the countdown and vendor timeline.
                </p>
                {errors.eventDate ? (
                  <p id="intake-eventDate-error" className="field-error">
                    {errors.eventDate}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="intake-field-guests">
                  Guests
                </label>
                <input
                  id="intake-field-guests"
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={5000}
                  value={values.guests}
                  aria-invalid={errors.guests ? "true" : undefined}
                  aria-describedby={buildDescribedBy(
                    "guests",
                    errors,
                    "A close estimate is fine.",
                  )}
                  onChange={(event) => handleField("guests", event.target.value)}
                />
                <p id="intake-guests-hint" className="field-hint">
                  Include children and out-of-town family.
                </p>
                {errors.guests ? (
                  <p id="intake-guests-error" className="field-error">
                    {errors.guests}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="intake-field-budgetInr">
                  Total budget
                </label>
                <div className="input-wrap">
                  <span className="input-prefix" aria-hidden="true">
                    ₹
                  </span>
                  <input
                    id="intake-field-budgetInr"
                    className="field-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100000000}
                    step={1000}
                    value={values.budgetInr}
                    aria-invalid={errors.budgetInr ? "true" : undefined}
                    aria-describedby={buildDescribedBy(
                      "budgetInr",
                      errors,
                      "Whole rupees.",
                    )}
                    onChange={(event) => handleField("budgetInr", event.target.value)}
                  />
                </div>
                <p id="intake-budgetInr-hint" className="field-hint">
                  In INR. We allocate the whole amount, to the rupee.
                </p>
                {errors.budgetInr ? (
                  <p id="intake-budgetInr-error" className="field-error">
                    {errors.budgetInr}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="intake-field-city">
                City or town
              </label>
              <input
                id="intake-field-city"
                className="field-input"
                type="text"
                maxLength={80}
                autoComplete="address-level2"
                value={values.city}
                aria-invalid={errors.city ? "true" : undefined}
                aria-describedby={buildDescribedBy("city", errors)}
                placeholder="Jaipur"
                onChange={(event) => handleField("city", event.target.value)}
              />
              {errors.city ? (
                <p id="intake-city-error" className="field-error">
                  {errors.city}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="intake-field-notes">
                Food, ceremonies and must-haves
              </label>
              <textarea
                id="intake-field-notes"
                className="field-textarea"
                value={values.notes}
                maxLength={1200}
                aria-invalid={errors.notes ? "true" : undefined}
                aria-describedby={buildDescribedBy("notes", errors)}
                placeholder="Vegetarian food, haldi and mehendi at home, live chaat counter, elderly-friendly seating."
                onChange={(event) => handleField("notes", event.target.value)}
              />
              {errors.notes ? (
                <p id="intake-notes-error" className="field-error">
                  {errors.notes}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isExtracting}
            >
              Build from these details
            </button>
            <p className="field-hint">
              Your plan is saved in this browser, so edits survive a refresh.
            </p>
          </div>
        </form>
      </div>

      <section id="how-it-works" className="about-strip" aria-labelledby="how-heading">
        <h2 id="how-heading" className="sr-only">
          How Utsav AI works
        </h2>
        <p>
          <strong>1. Read.</strong> Free text is extracted, validated and turned into a
          form you can correct.
        </p>
        <p>
          <strong>2. Build.</strong> Budget, timeline and vendor checks come from
          deterministic rules, so they work even without AI.
        </p>
        <p>
          <strong>3. Personalise.</strong> Gemini adds curated ideas and vendor drafts
          when available, with a transparent fallback.
        </p>
        <p>
          <strong>4. Keep.</strong> Edit amounts, tick tasks and record vendor quotes.
          Print the whole plan or save it in this browser.
        </p>
      </section>
    </div>
  );
}
