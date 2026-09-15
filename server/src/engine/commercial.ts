/**
 * PRIME ENERGY UK - COMMERCIAL CALCULATION ENGINE
 * 
 * Strict Implementation of Gross Margin Mathematics:
 * DO NOT implement: Customer Contribution = Total Cost * (1 + Margin) - Grant (Markup formula)
 * 
 * True Target Gross Margin Formula:
 * - Required Revenue = Total Job Cost / (1 - Target Gross Margin)
 * - Customer Contribution = MAX(0, Required Revenue - BUS Grant)
 * - Revenue = BUS Grant + Customer Contribution
 * - Gross Profit = Revenue - Total Job Cost
 * - Gross Margin % = (Gross Profit / Revenue) * 100
 */

export interface CommercialInputs {
  totalJobCost: number;
  targetGrossMargin: number; // e.g. 0.25 for 25%
  busGrant: number;          // e.g. 7500
}

export interface CommercialOutputs {
  totalJobCost: number;
  targetGrossMargin: number;
  busGrant: number;
  requiredRevenue: number;
  customerContribution: number;
  actualRevenue: number;
  grossProfit: number;
  grossMarginPercent: number;
}

/**
 * Rounds a number to two decimal places (standard financial currency rounding)
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Evaluates the exact commercial viability figures for a domestic heat pump job
 */
export function calculateCommercials(inputs: CommercialInputs): CommercialOutputs {
  const { totalJobCost, targetGrossMargin, busGrant } = inputs;

  if (targetGrossMargin >= 1.0) {
    throw new Error('Target gross margin must be strictly less than 100% (1.0)');
  }
  if (targetGrossMargin < 0) {
    throw new Error('Target gross margin cannot be negative');
  }
  if (totalJobCost < 0) {
    throw new Error('Total job cost cannot be negative');
  }

  // Edge case: if total cost is 0
  if (totalJobCost === 0) {
    return {
      totalJobCost: 0,
      targetGrossMargin,
      busGrant,
      requiredRevenue: 0,
      customerContribution: 0,
      actualRevenue: busGrant,
      grossProfit: busGrant,
      grossMarginPercent: busGrant > 0 ? 100 : 0
    };
  }

  // Required Revenue = Total Job Cost / (1 - Target Gross Margin)
  const rawRequiredRevenue = totalJobCost / (1 - targetGrossMargin);
  const requiredRevenue = round2(rawRequiredRevenue);

  // Customer Contribution = MAX(0, Required Revenue - BUS Grant)
  const rawCustomerContribution = Math.max(0, requiredRevenue - busGrant);
  const customerContribution = round2(rawCustomerContribution);

  // Revenue = BUS Grant + Customer Contribution
  // Note: If Grant >= Required Revenue, customer pays £0, and revenue is the Grant itself!
  const actualRevenue = round2(busGrant + customerContribution);

  // Gross Profit = Revenue - Total Job Cost
  const grossProfit = round2(actualRevenue - totalJobCost);

  // Gross Margin = Gross Profit / Revenue * 100
  const rawGrossMarginPercent = actualRevenue > 0 
    ? (grossProfit / actualRevenue) * 100 
    : 0;
  const grossMarginPercent = round2(rawGrossMarginPercent);

  return {
    totalJobCost: round2(totalJobCost),
    targetGrossMargin,
    busGrant: round2(busGrant),
    requiredRevenue,
    customerContribution,
    actualRevenue,
    grossProfit,
    grossMarginPercent
  };
}
