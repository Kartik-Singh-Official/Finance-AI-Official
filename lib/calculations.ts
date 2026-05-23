/**
 * Calculates the monthly EMI for a loan.
 * P × r × (1+r)^n / ((1+r)^n - 1)
 */
export function calculateEMI(principal: number, annualInterestRate: number, tenureMonths: number): number {
  if (principal <= 0 || annualInterestRate <= 0 || tenureMonths <= 0) return 0;
  const r = annualInterestRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi);
}

/**
 * Calculates the savings rate percentage.
 */
export function calculateSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}

/**
 * Calculates financial health score (0-100) based on simple rules.
 * This can be supplemented by Gemini for more nuance.
 */
export function calculateBaseHealthScore(
  income: number,
  expenses: number,
  totalEMI: number,
  emergencyFund: number
): number {
  if (income <= 0) return 0;

  let score = 0;

  // Savings rate (up to 30 pts)
  const savingsRate = calculateSavingsRate(income, expenses);
  if (savingsRate >= 20) score += 30;
  else if (savingsRate >= 10) score += 20;
  else if (savingsRate > 0) score += 10;

  // Emergency fund (up to 30 pts)
  const monthlyExpenses = expenses;
  const emergencyMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
  if (emergencyMonths >= 6) score += 30;
  else if (emergencyMonths >= 3) score += 20;
  else if (emergencyMonths >= 1) score += 10;

  // Debt-to-Income ratio (up to 40 pts)
  const dti = (totalEMI / income) * 100;
  if (dti <= 30) score += 40;
  else if (dti <= 40) score += 30;
  else if (dti <= 50) score += 15;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculates simple SIP returns.
 */
export function calculateSIPMaturity(monthlyAmount: number, annualReturn: number, years: number): {
  totalInvested: number;
  maturityValue: number;
  wealthGained: number;
} {
  const n = years * 12;
  const totalInvested = monthlyAmount * n;

  if (annualReturn <= 0) {
    return {
      totalInvested: Math.round(totalInvested),
      maturityValue: Math.round(totalInvested),
      wealthGained: 0,
    };
  }

  const i = annualReturn / 12 / 100;
  const maturityValue = monthlyAmount * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  
  return {
    totalInvested: Math.round(totalInvested),
    maturityValue: Math.round(maturityValue),
    wealthGained: Math.round(maturityValue - totalInvested),
  };
}
