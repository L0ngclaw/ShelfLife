// Decides an item's expiry colour. One place for the rules, used by the ring,
// the detail screen and the legend.
import { daysUntil, daysBetween } from "./dates";

// Thresholds (change these to change the rules everywhere)
const URGENT_DAYS = 1; // red when 1 day or less is left
const SOON_DAYS = 3; // amber when 3 days or less are left
const URGENT_FRACTION = 0.2; // red when less than 20% of shelf life is left
const SOON_FRACTION = 0.5; // amber when less than 50% is left

export const EXPIRY_LEVELS = {
  fresh: {
    level: "fresh",
    color: "#2E7D32",
    title: "Green – fresh",
    description: "More than 3 days and at least half of its shelf life left.",
  },
  soon: {
    level: "soon",
    color: "#F9A825",
    title: "Amber – use soon",
    description: "3 days or less, or less than half of its shelf life left.",
  },
  urgent: {
    level: "urgent",
    color: "#C62828",
    title: "Red – eat first",
    description:
      "1 day or less, or less than 20% of its shelf life left. The ring pulses.",
  },
  expired: {
    level: "expired",
    color: "#9E9E9E",
    title: "Grey – expired",
    description: "Past its expiry date.",
  },
};

export function getExpiryStatus(purchaseDate, expiryDate) {
  const days = daysUntil(expiryDate);
  const totalDays = Math.max(1, daysBetween(purchaseDate, expiryDate));
  // Share of the shelf life that is left, kept between 0 and 1
  const fractionLeft = Math.min(1, Math.max(0, days / totalDays));

  let level;
  let reason;
  if (days < 0) {
    level = "expired";
    reason = "It is past its expiry date.";
  } else if (days <= URGENT_DAYS) {
    level = "urgent";
    reason = days === 0 ? "It expires today." : "It expires tomorrow.";
  } else if (fractionLeft < URGENT_FRACTION) {
    level = "urgent";
    reason = "Less than 20% of its shelf life is left.";
  } else if (days <= SOON_DAYS) {
    level = "soon";
    reason = `It expires in ${days} days.`;
  } else if (fractionLeft < SOON_FRACTION) {
    level = "soon";
    reason = "Less than half of its shelf life is left.";
  } else {
    level = "fresh";
    reason = "It has plenty of time left.";
  }

  return { ...EXPIRY_LEVELS[level], days, fractionLeft, reason };
}
