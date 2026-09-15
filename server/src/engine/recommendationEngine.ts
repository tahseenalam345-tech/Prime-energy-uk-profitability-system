export interface RecommendationInputs {
  busStatus: 'PASS' | 'FAIL' | 'UNCERTAIN';
  grossMarginPercent: number;
  grossProfit: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'SURVEY_CONFIRMED';
  customerContribution: number;
  viabilityBlockers: string[];
  commercialRisks: string[];
  manualReviewFlags: string[];
}

export interface RecommendationOutputs {
  status: 'PROCEED' | 'PROCEED WITH CAUTION' | 'CUSTOMER CONTRIBUTION REQUIRED' | 'SURVEY REQUIRED' | 'DO NOT PROCEED';
  headline: string;
  reasons: string[];
  actionItems: string[];
}

export function evaluateCommercialRecommendation(inputs: RecommendationInputs): RecommendationOutputs {
  const reasons: string[] = [];
  const actionItems: string[] = [];

  // Blocker 1: Physical or structural blocker (e.g. no cylinder space)
  if (inputs.viabilityBlockers && inputs.viabilityBlockers.length > 0) {
    return {
      status: 'DO NOT PROCEED',
      headline: 'Commercial or physical viability blocker identified',
      reasons: inputs.viabilityBlockers,
      actionItems: ['Contact property owner to confirm if alternative space (loft/garage/extension) exists, or close lead.']
    };
  }

  // Blocker 2: Severely negative margin or BUS Fail with unviable customer quote
  if (inputs.grossMarginPercent < 5.0 || inputs.grossProfit <= 0) {
    return {
      status: 'DO NOT PROCEED',
      headline: 'Gross margin below Prime Energy 5% threshold',
      reasons: [`Gross margin is ${inputs.grossMarginPercent.toFixed(1)}% (Profit: £${inputs.grossProfit.toFixed(2)}), which falls below the minimum viable profitability threshold.`],
      actionItems: ['Adjust pricing parameters or require higher customer contribution before proceeding.']
    };
  }

  // Case 3: BUS is FAIL
  if (inputs.busStatus === 'FAIL') {
    return {
      status: 'CUSTOMER CONTRIBUTION REQUIRED',
      headline: 'Ineligible for BUS grant — 100% customer funding required',
      reasons: ['Property does not qualify for Boiler Upgrade Scheme funding. Full job cost must be recovered via customer contribution.'],
      actionItems: [`Present quotation for £${inputs.customerContribution.toLocaleString()} customer contribution. Verify customer budget.`]
    };
  }

  // Case 4: Manual review flags or LOW confidence
  if (inputs.manualReviewFlags && inputs.manualReviewFlags.length > 0) {
    return {
      status: 'SURVEY REQUIRED',
      headline: 'Physical survey and structural check required',
      reasons: inputs.manualReviewFlags,
      actionItems: ['Dispatch technical surveyor for on-site assessment before issuing commercial proposal.']
    };
  }

  if (inputs.busStatus === 'UNCERTAIN' || inputs.confidenceLevel === 'LOW') {
    return {
      status: 'SURVEY REQUIRED',
      headline: 'Preliminary data requires technical survey verification',
      reasons: [
        inputs.busStatus === 'UNCERTAIN' ? 'Prior government grant eligibility must be confirmed with Ofgem.' : '',
        inputs.confidenceLevel === 'LOW' ? 'Confidence level is LOW due to missing property specification fields.' : ''
      ].filter(Boolean),
      actionItems: ['Schedule full technical property survey to confirm heat loss and pipework specification.']
    };
  }

  // Case 5: Commercial risks detected (Microbore, combi conversion, 3-phase)
  if (inputs.commercialRisks && inputs.commercialRisks.length > 0) {
    return {
      status: 'PROCEED WITH CAUTION',
      headline: 'Commercially viable with risk allowances applied',
      reasons: inputs.commercialRisks,
      actionItems: [
        'Review risk allowances with customer during sales consultation.',
        'Ensure quotation explicitly highlights pipework / electrical assumptions.'
      ]
    };
  }

  // Case 6: Substantial customer contribution needed
  if (inputs.customerContribution > 500) {
    return {
      status: 'CUSTOMER CONTRIBUTION REQUIRED',
      headline: `Viable opportunity — £${inputs.customerContribution.toLocaleString()} customer contribution required`,
      reasons: [`BUS grant covers portion of required revenue; customer contribution of £${inputs.customerContribution.toLocaleString()} achieves target gross margin.`],
      actionItems: ['Issue commercial estimate with clear explanation of grant deduction and customer net payment.']
    };
  }

  // Default: Highly viable
  return {
    status: 'PROCEED',
    headline: 'High-viability commercial opportunity',
    reasons: [
      `Estimated gross margin is ${inputs.grossMarginPercent.toFixed(1)}% (Profit: £${inputs.grossProfit.toFixed(2)}).`,
      'BUS grant eligibility confirmed with minimal customer friction.'
    ],
    actionItems: ['Fast-track to technical survey and customer contract.']
  };
}
