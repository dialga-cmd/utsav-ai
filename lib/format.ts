const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Format a whole-rupee amount for display, e.g. ₹4,50,000. */
export function formatInr(amount: number): string {
  return inrFormatter.format(Math.round(amount));
}

/** Format a count with Indian digit grouping. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
