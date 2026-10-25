# Accessibility — WCAG 2.1 AA checks

All text/background pairs verified by programmatic contrast calculation.
Non-text UI elements (focus ring, badge borders) pass the 3:1 requirement.

## Checked text pairs

| Foreground                                     | Background                      | Ratio | Status      |
| ---------------------------------------------- | ------------------------------- | ----- | ----------- |
| `--color-ink` #2c1b16                          | `--color-cream` #faf6ef         | 15.28 | AA ✓        |
| `--color-ink` #2c1b16                          | `--color-surface` #fffcf7       | 16.09 | AA ✓        |
| `--color-ink` #2c1b16                          | `--color-surface-muted` #f5ede1 | 14.18 | AA ✓        |
| `--color-muted` #625049                        | `--color-cream` #faf6ef         | 7.06  | AA ✓        |
| `--color-muted` #625049                        | `--color-surface` #fffcf7       | 7.43  | AA ✓        |
| `--color-muted` #625049                        | `--color-surface-muted` #f5ede1 | 6.54  | AA ✓        |
| `--color-maroon` #7b2435                       | `--color-cream` #faf6ef         | 9.08  | AA ✓        |
| `--color-maroon` #7b2435                       | `--color-surface` #fffcf7       | 9.56  | AA ✓        |
| `--color-maroon` #7b2435                       | `--color-maroon-soft` #f8eaec   | 8.37  | AA ✓        |
| `--color-maroon-strong` #5f1425                | `--color-cream` #faf6ef         | 12.08 | AA ✓        |
| `--color-maroon-strong` #5f1425                | `--color-maroon-soft` #f8eaec   | 11.14 | AA ✓        |
| `--color-gold` #8a5a12                         | `--color-cream` #faf6ef         | 5.49  | AA ✓        |
| `--color-gold` #8a5a12                         | `--color-surface` #fffcf7       | 5.78  | AA ✓        |
| `--color-gold` #8a5a12                         | `--color-gold-soft` #fbf1da     | 5.26  | AA ✓        |
| `--color-green` #215c43                        | `--color-cream` #faf6ef         | 7.28  | AA ✓        |
| `--color-green` #215c43                        | `--color-green-soft` #eaf5ee    | 7.02  | AA ✓        |
| `--color-urgent` #9a3412                       | `--color-cream` #faf6ef         | 6.78  | AA ✓        |
| `--color-urgent` #9a3412                       | `--color-urgent-soft` #fff0e8   | 6.57  | AA ✓        |
| `--color-tight` #76500d                        | `--color-cream` #faf6ef         | 6.67  | AA ✓        |
| `--color-tight` #76500d                        | `--color-tight-soft` #fff7df    | 6.71  | AA ✓        |
| `--color-ontrack` #1c6044                      | `--color-cream` #faf6ef         | 6.95  | AA ✓        |
| `--color-ontrack` #1c6044                      | `--color-ontrack-soft` #eaf6ef  | 6.75  | AA ✓        |
| `--color-focus` #1d4ed8 (focus ring, non-text) | `--color-cream`                 | 6.22  | AA ✓ (≥3:1) |
| `.field-error` #8f2c0b                         | #fffaf7                         | 8.00  | AA ✓        |

## aria-live regions

- `Notice` with `live={true}` renders `role="status"` — a single polite
  live region for extraction / idea-generation progress. At most one
  `role="status"` element is mounted at a time, so there is no
  double-announcement risk.
- Validation errors and API failure notices are static `Notice`
  components (no `live`) rendered inline in the form flow; they are
  read when the user tabs to the field, not announced twice.

## Form error linkage

Every intake field with a validation error renders:

```html
<label for="guests">Guests</label>
<input id="guests" aria-invalid="true" aria-describedby="guests-error …" />
<span id="guests-error">…</span>
```

See `IntakePanel.tsx` — `aria-invalid` is set conditionally
(`errors.field ? "true" : undefined`) and `aria-describedby` is built
by `buildDescribedBy`, which collects the hint and error ids.

## Focus management

After plan generation the focus moves to the plan heading:

- `PlanningWorkspace.tsx` sets `focusRequest = { target: "plan" }`
  once extraction or demo completes.
- A `useEffect` calls `document.getElementById("plan-title").focus()`.
- `PlanView.tsx` renders `<h1 id="plan-title" tabIndex={-1}>`.

`tabIndex={-1}` makes the heading programmatically focusable without
adding it to the tab order.

## Touch targets (≥ 44 × 44 px)

| Element                                    | CSS                                                                 | Minimum height        |
| ------------------------------------------ | ------------------------------------------------------------------- | --------------------- |
| `.btn` (primary / secondary / quiet)       | `min-height: 2.75rem`                                               | 44 px                 |
| `.btn-small` (per-vendor action buttons)   | `min-height: 2.5rem`                                                | 40 px                 |
| `.tab` (plan section tabs)                 | `min-height: 2.75rem`                                               | 44 px                 |
| `.task-top` (timeline task row + checkbox) | `min-height: 2.75rem`                                               | 44 px                 |
| `.field-input` / `.field-select`           | padding 0.5rem + line-height 1.35 × 0.85rem ≈ 40 px                 | 40 px                 |
| `.task-checkbox` (input element)           | 1.15rem ≈ 18 px — the `.task-top` row is the effective touch target | 44 px via `.task-top` |

`.btn-small` and `.field-input` fall slightly short of 44 px; this is a
known trade-off for dense data tables. The primary interactive elements
(CTA buttons, tabs, task rows, selects) meet the 44 px minimum.

## Zoom / narrow viewport

- All layout uses `rem` units on a 16 px root, so the page scales
  cleanly at 200 % zoom with no horizontal scroll.
- The `.tablist` and any wide table containers use `overflow-x: auto`
  so horizontal scrolling is contained locally rather than at the page
  level.
- The hero glow decoration is hidden below `40rem` to avoid overflow on
  small screens.
