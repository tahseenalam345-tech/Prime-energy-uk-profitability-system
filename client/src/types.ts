export interface User {
  id: string;
  name: string;
  email: string;
  role_id?: string;
  role_name?: 'ADMIN' | 'SALES' | 'SURVEYOR' | 'ESTIMATOR' | 'READ_ONLY' | string;
  role?: string;
  role_description?: string;
}

export interface CommercialSettings {
  id: string;
  version: number;
  target_gross_margin: number;
  labour_baseline: number;
  lead_generation_cost: number;
  extras_contingency: number;
  combi_conversion_allowance: number;
  microbore_repipe_allowance: number;
  effective_from: string;
  updated_by?: string;
  notes?: string;
}

export interface Lead {
  id: string;
  reference_no: string;
  customer_name: string;
  email?: string;
  phone?: string;
  lead_source: string;
  status: string;
  assigned_to?: string;
  created_at: string;
  address_line1?: string;
  postcode?: string;
  country?: string;
  epc_rating?: string;
  epc_floor_area?: number;
  property_type?: string;
  property_status?: string;
  bedrooms?: number;
  bathrooms?: number;
  boiler_type?: string;
  cylinder_space?: string;
  existing_pipework?: string;
  on_off_gas_grid?: string;
  sales_notes?: string;
}

export interface Quote {
  id: string;
  quote_reference: string;
  lead_id: string;
  customer_name: string;
  address_line1?: string;
  postcode?: string;
  mode: 'NEW_LEAD' | 'AFTER_SURVEY';
  total_job_cost: number;
  bus_grant: number;
  required_revenue: number;
  customer_contribution: number;
  actual_revenue: number;
  gross_profit: number;
  gross_margin_percent: number;
  confidence_score?: number;
  confidence_level?: string;
  profitability_grade: string;
  commercial_recommendation: string;
  status: string;
  manual_override: number;
  override_reason?: string;
  created_by: string;
  created_at: string;
}

export interface RuleEvidence {
  rule_id: string;
  rule_name: string;
  category: string;
  rule_value: string;
  authority: string;
  source_url: string;
  source_document: string;
  source_version: string;
  effective_from: string;
  effective_to?: string | null;
  last_verified_at: string;
  verification_status: 'VERIFIED_OFFICIAL_CURRENT' | 'PRIME_CONFIG' | 'ESTIMATION_HEURISTIC' | 'SOURCE_REQUIRED' | 'HISTORICAL' | 'UNVERIFIED' | 'VERIFIED_OFFICIAL';
  notes?: string;
  evidence_reference?: string;
}

export interface CalculationResult {
  mode: 'NEW_LEAD' | 'AFTER_SURVEY';
  disclaimer?: string;
  timestamp: string;
  heatDemand?: {
    baselineWPerM2: number;
    propertyMultiplier: number;
    centralDemandKw: number;
    minDemandKw: number;
    maxDemandKw: number;
    displayRange: string;
    annualHeatingKwh?: number | null;
    annualHotWaterKwh?: number | null;
    annualHeatingKwhNote?: string;
    manualReviewFlag: boolean;
    notes: string[];
    ruleEvidenceId?: string;
  };
  confirmedDesignHeatLossKw?: number;
  ashp?: {
    recommendedProduct: any;
    selectedProduct?: any;
    isManualOverride?: boolean;
    status: string;
    notes: string[];
    allAshpProducts?: any[];
    ruleEvidenceId?: string;
  };
  selectedEquipment?: any;
  cylinder?: {
    recommendedVolumeLitres: number | null;
    displayCapacity: string;
    recommendedProduct: any;
    selectedProduct?: any;
    isManualOverride?: boolean;
    overrideNote?: string;
    allCylinders?: any[];
    viabilityBlocker: boolean;
    notes: string[];
    assumptions: string[];
    error?: string;
    ruleEvidenceId?: string;
  };
  radiators?: {
    mode: string;
    estimatedReplacementCount: number;
    displayQuantity: string;
    totalRadiatorCostExVat: number;
    notes: string[];
    ruleEvidenceId?: string;
  };
  emitterCapacity?: {
    k1Count: number;
    pPlusCount: number;
    k2Count: number;
    otherCount: number;
    totalRadiatorCount: number;
    hasMissingDimensions: boolean;
    status: 'VERIFIED_DIMENSIONS' | 'PARTIAL' | 'UNKNOWN';
    estimatedOutputKwAt50: number;
    estimatedOutputKwAtTargetFlow: number;
    targetFlowTemp: number;
    targetDeltaT: number;
    plausibilityCheck: {
      estimatedHeatDemandKw: number;
      emitterCapacityKw: number;
      isAdequate: boolean;
      warningMessage?: string;
      statusLabel: string;
    };
    notes: string[];
  };
  costBreakdown: {
    equipmentMaterials?: number;
    equipmentMaterialsTotal?: number;
    radiatorsAllowance?: number;
    radiatorsCost?: number;
    cylinderCost?: number;
    pipeworkAllowance?: number;
    pipeworkCost?: number;
    accessoriesCost?: number;
    combiConversionAllowance?: number;
    electricalWorksCost?: number;
    otherCosts?: number;
    labour: number;
    leadGeneration: number;
    extrasContingency: number;
    totalJobCost: number;
  };
  bus: {
    status: 'PASS' | 'FAIL' | 'UNCERTAIN';
    grantAmount: number;
    grantType: string;
    gridStatus?: string;
    existingHeatingType?: string;
    existingFuelType?: string;
    existingOilOrLpg?: boolean;
    busUpliftEligibility?: boolean;
    conditionalUpliftAvailable?: boolean;
    conditionalUpliftAmount?: number;
    rulesetVersion: string;
    reasons: string[];
    notes: string[];
    sourceUrl?: string;
    ruleEvidenceId?: string;
  };
  commercials: {
    totalJobCost: number;
    targetGrossMargin: number;
    busGrant: number;
    requiredRevenue: number;
    customerContribution: number;
    actualRevenue: number;
    grossProfit: number;
    grossMarginPercent: number;
  };
  confidence?: {
    score: number;
    level: string;
    breakdown: any[];
  };
  confidenceDisplay?: string;
  rating: {
    baseGrade: string;
    finalGrade: string;
    isDowngraded: boolean;
    downgradeReasons: string[];
    color: string;
  };
  recommendation: {
    status: string;
    headline: string;
    reasons: string[];
    actionItems: string[];
  };
  assumptionsAndDataGaps?: string[];
  lineItems: Array<{
    category: string;
    description: string;
    quantity: number;
    unitPriceExVat: number;
    totalPriceExVat: number;
    isOverridden?: boolean;
    originalTotal?: number;
  }>;
  costAuditTrail?: Array<{
    lineItem: string;
    originalCost: number;
    overriddenCost: number;
    changedAt: string;
  }>;
  ruleEvidenceLinks?: Record<string, string>;
  commercialSettingsUsed: any;
}
