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

const round2 = (n) => Math.round(n * 100) / 100;

// "Use some": takes part of an item and returns what is left.
// `usedText` is pieces for counted items and kg for weighed items.
// Returns { changes, used, finished }:
//   changes  = the new amount of the item
//   used     = the amount that was used (saved as its own eaten record for Impact)
//   finished = nothing left, so the whole item is marked as eaten
// Throws a friendly error when the amount is not valid.
export function remainingAfterUse(item, usedText) {
  const used = parseFloat(String(usedText).replace(",", "."));

  if (item.unit === "pcs") {
    if (!Number.isInteger(used) || used < 1 || used > item.quantity)
      throw new Error(`Enter a whole number from 1 to ${item.quantity}.`);
    const quantity = item.quantity - used;
    // Keep the total weight in step when the weight of one piece is known
    const weightKg = item.weightPerItemKg ? round2(quantity * item.weightPerItemKg) : item.weightKg;
    const usedPart = {
      unit: "pcs",
      quantity: used,
      weightKg: item.weightPerItemKg ? round2(used * item.weightPerItemKg) : null,
    };
    return { changes: { quantity, weightKg }, used: usedPart, finished: quantity === 0 };
  }

  if (isNaN(used) || used <= 0 || used > item.weightKg)
    throw new Error(`Enter an amount more than 0 and up to ${item.weightKg} kg.`);
  const weightKg = round2(item.weightKg - used);
  return { changes: { weightKg }, used: { unit: "kg", weightKg: round2(used) }, finished: weightKg <= 0 };
}
