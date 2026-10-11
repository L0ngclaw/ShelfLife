// Turns finished items (eaten / thrown away) into CO2 numbers for the Impact screen
import { DEFAULT_CO2_PER_KG } from "../constants/categories";

export const MONTHLY_GOAL_KG = 10; // CO2 the user aims to save each month

// monthPrefix: 'YYYY-MM' for one month, or leave it out for all time
export function calculateImpact(items, getCategory, monthPrefix) {
  const result = {
    savedKg: 0,
    wastedKg: 0,
    eatenCount: 0,
    wastedCount: 0,
    wastedFoodKg: 0,
    wasteByCategory: {},
  };

  for (const item of items) {
    if (item.status === "active" || !item.finishedDate) continue;
    if (monthPrefix && !item.finishedDate.startsWith(monthPrefix)) continue;

    const category = getCategory(item.category);
    const co2Kg = item.weightKg * (category.co2PerKg ?? DEFAULT_CO2_PER_KG);

    if (item.status === "eaten") {
      result.savedKg += co2Kg;
      result.eatenCount += 1;
    } else {
      result.wastedKg += co2Kg;
      result.wastedCount += 1;
      result.wastedFoodKg += item.weightKg;
      result.wasteByCategory[category.label] =
        (result.wasteByCategory[category.label] ?? 0) + co2Kg;
    }
  }

  const finished = result.eatenCount + result.wastedCount;
  result.wasteRate = finished ? result.wastedCount / finished : 0;

  // The category that wasted the most CO2 (a tip for the user)
  const top = Object.entries(result.wasteByCategory).sort(
    (a, b) => b[1] - a[1],
  )[0];
  result.topWaste = top ? { label: top[0], co2Kg: top[1] } : null;

  return result;
}
