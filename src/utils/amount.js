// Items are measured by weight (kg) or by count (pcs).
// Older items have no unit, so they are treated as kg.
// Counted items show the total weight too when the weight per item is known,
// e.g. "6 pcs (1.2 kg)".
export function formatAmount(item) {
  if (item.unit === "pcs") {
    return item.weightKg ? `${item.quantity} pcs (${item.weightKg} kg)` : `${item.quantity} pcs`;
  }
  return `${item.weightKg} kg`;
}
