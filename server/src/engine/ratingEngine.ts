export interface RatingInputs {
  grossMarginPercent: number;
  grossProfit: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'SURVEY_CONFIRMED';
  minGrossProfitCapThreshold?: number; // default £1000
}

export interface RatingOutputs {
  baseGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  finalGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  isDowngraded: boolean;
  downgradeReasons: string[];
  color: string;
}

const GRADE_ORDER = ['F', 'D', 'C', 'B', 'A', 'A+'];

function getLowerGrade(g1: string, g2: string): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const i1 = GRADE_ORDER.indexOf(g1);
  const i2 = GRADE_ORDER.indexOf(g2);
  return (i1 < i2 ? g1 : g2) as 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export function evaluateProfitabilityRating(inputs: RatingInputs): RatingOutputs {
  const { grossMarginPercent, grossProfit, confidenceLevel } = inputs;
  const minProfitThreshold = inputs.minGrossProfitCapThreshold || 1000.00;

  // Determine base grade from gross margin percentage
  let baseGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (grossMarginPercent >= 35.0) {
    baseGrade = 'A+';
  } else if (grossMarginPercent >= 28.0) {
    baseGrade = 'A';
  } else if (grossMarginPercent >= 20.0) {
    baseGrade = 'B';
  } else if (grossMarginPercent >= 12.0) {
    baseGrade = 'C';
  } else if (grossMarginPercent >= 5.0) {
    baseGrade = 'D';
  } else {
    baseGrade = 'F';
  }

  let finalGrade = baseGrade;
  const downgradeReasons: string[] = [];

  // Downgrade rule 1: If New Lead confidence is LOW, cap rating at B
  if (confidenceLevel === 'LOW') {
    if (finalGrade === 'A+' || finalGrade === 'A') {
      finalGrade = 'B';
      downgradeReasons.push('Rating capped at B due to LOW confidence level (preliminary lead data).');
    }
  }

  // Downgrade rule 2: If gross profit is below configurable minimum (£1000), cap at C
  if (grossProfit < minProfitThreshold && grossProfit > 0) {
    if (GRADE_ORDER.indexOf(finalGrade) > GRADE_ORDER.indexOf('C')) {
      finalGrade = 'C';
      downgradeReasons.push(`Rating capped at C because gross profit (£${grossProfit.toFixed(2)}) is below the £${minProfitThreshold} minimum commercial threshold.`);
    }
  }

  const isDowngraded = finalGrade !== baseGrade;

  // Grade color codes
  const colors: Record<string, string> = {
    'A+': '#047857', // dark emerald
    'A': '#059669',  // green
    'B': '#10b981',  // emerald green
    'C': '#f59e0b',  // amber
    'D': '#f97316',  // orange
    'F': '#ef4444'   // red
  };

  return {
    baseGrade,
    finalGrade,
    isDowngraded,
    downgradeReasons,
    color: colors[finalGrade] || '#6b7280'
  };
}
