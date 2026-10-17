// Turns finished items (eaten / thrown away) into the numbers on the Impact screen.
// Only COUNTS are used, so nothing is estimated: the app does not know what is
// inside ready-made food or how much counted items weigh, so CO2 or kg figures
// would be guesses.
import { getExpiryStatus } from "./expiryStatus";

export const RESCUE_GOAL = 90; // target: eat at least 90% of the food you finish

// monthPrefix: 'YYYY-MM' for one month, or leave it out for all time
export function calculateImpact(items, getCategory, monthPrefix) {
  const result = { eatenCount: 0, wastedCount: 0, justInTimeCount: 0, wasteByCategory: {} };

  for (const item of items) {
    if (!item.finishedDate || (item.status !== "eaten" && item.status !== "wasted")) continue;
    if (monthPrefix && !item.finishedDate.startsWith(monthPrefix)) continue;

    if (item.status === "eaten") {
      result.eatenCount += 1;
      // Saved just in time = eaten while its ring was red or amber
      const level = getExpiryStatus(item.purchaseDate, item.expiryDate, item.finishedDate).level;
      if (level === "urgent" || level === "soon") result.justInTimeCount += 1;
    } else {
      result.wastedCount += 1;
      // Family-shelf items carry their own label (it may be another member's category)
      const label = item.categoryLabel ?? getCategory(item.category).label;
      result.wasteByCategory[label] = (result.wasteByCategory[label] ?? 0) + 1;
    }
  }

  const finished = result.eatenCount + result.wastedCount;
  result.finishedCount = finished;
  // Rescue rate = share of finished food that was eaten, not thrown away
  result.rescueRate = finished ? Math.round((result.eatenCount / finished) * 100) : 0;

  // The category thrown away most often (a tip for the user)
  const top = Object.entries(result.wasteByCategory).sort((a, b) => b[1] - a[1])[0];
  result.topWaste = top ? { label: top[0], count: top[1] } : null;

  return result;
}
