// Items are measured by weight (kg) or by count (pcs).
// Older items have no unit, so they are treated as kg.
export function formatAmount(item) {
  return item.unit === "pcs" ? `${item.quantity} pcs` : `${item.weightKg} kg`;
}
