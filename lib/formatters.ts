/**
 * Formats a number to Indian Rupee (INR) string.
 * Example: 100000 -> ₹1,00,000.00
 */
export function formatCurrency(amount: number, showDecimals: boolean = true): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Formats a number to Indian Rupee (INR) string in a compact way.
 * Example: 150000 -> ₹1.5L
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount, false);
}

/**
 * Formats a number as a percentage string.
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
