export const CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Investment",
  "Income",
  "Other"
] as const;

export type Category = typeof CATEGORIES[number];

/**
 * Normalizes any category string (lowercase, matching or alternate) into the standard UI categories
 */
export function normalizeCategory(categoryStr: string): Category {
  const clean = categoryStr.trim().toLowerCase();

  if (clean.includes("food") || clean.includes("dining") || clean.includes("restaurant") || clean.includes("cafe") || clean.includes("zomato") || clean.includes("swiggy")) {
    return "Food & Dining";
  }
  if (clean.includes("shop") || clean.includes("clothes") || clean.includes("clothing") || clean.includes("grocery") || clean.includes("amazon") || clean.includes("flipkart") || clean.includes("myntra")) {
    return "Shopping";
  }
  if (clean.includes("transport") || clean.includes("travel") || clean.includes("uber") || clean.includes("ola") || clean.includes("fuel") || clean.includes("petrol") || clean.includes("metro")) {
    return "Transport";
  }
  if (clean.includes("utilit") || clean.includes("bill") || clean.includes("electricity") || clean.includes("water") || clean.includes("wifi") || clean.includes("broadband") || clean.includes("recharge")) {
    return "Utilities";
  }
  if (clean.includes("entertain") || clean.includes("netflix") || clean.includes("prime") || clean.includes("movie") || clean.includes("cinema") || clean.includes("music") || clean.includes("spotify")) {
    return "Entertainment";
  }
  if (clean.includes("health") || clean.includes("doctor") || clean.includes("hospital") || clean.includes("medicine") || clean.includes("pharmacy")) {
    return "Health";
  }
  if (clean.includes("educat") || clean.includes("school") || clean.includes("college") || clean.includes("fee") || clean.includes("course") || clean.includes("book")) {
    return "Education";
  }
  if (clean.includes("invest") || clean.includes("stock") || clean.includes("mutual") || clean.includes("sip") || clean.includes("share") || clean.includes("groww")) {
    return "Investment";
  }
  if (clean.includes("income") || clean.includes("salary") || clean.includes("bonus") || clean.includes("dividend")) {
    return "Income";
  }

  // Handle previous raw lowercase categories list in the audit file
  const map: Record<string, Category> = {
    housing: "Utilities",
    food: "Food & Dining",
    transport: "Transport",
    health: "Health",
    education: "Education",
    utilities: "Utilities",
    emi_loans: "Other",
    insurance: "Other",
    subscriptions: "Entertainment",
    clothing: "Shopping",
    personal_care: "Other",
    entertainment: "Entertainment",
    family_support: "Other",
    charity: "Other",
    investment: "Investment",
    income: "Income",
  };

  return map[clean] || "Other";
}
