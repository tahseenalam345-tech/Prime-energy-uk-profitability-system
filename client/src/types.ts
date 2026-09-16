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

export interface SubmissionEvidence {
  id: string;
  submission_id: string;
  item_id: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  file_path_or_url: string;
  reference_no?: string;
  uploaded_by?: string;
  notes?: string;
  uploaded_at: string;
}

export interface SubmissionAuditLog {
  id: string;
  submission_id: string;
  item_id?: string;
  user_id?: string;
  user_name?: string;
  field_changed: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  changed_at: string;
}

export interface SubmissionItem {
  id: string;
  submission_id: string;
  stage_code: string;
  stage_name: string;
  section_name: string;
  requirement_key: string;
  title: string;
  short_description?: string;
  what_is_this?: string;
  why_required?: string;
  who_completes?: string;
  who_submits?: string;
  customer_signature_type: 'No signature' | 'Customer signature' | 'Ofgem electronic consent' | 'Conditional' | 'Installer/portal authentication' | string;
  classification: 'OFFICIAL' | 'CONDITIONAL' | 'PRIME ENERGY INTERNAL' | 'NEEDS CONFIRMATION' | string;
  status: 'Pending' | 'In Progress' | 'Awaiting Customer' | 'Awaiting Ofgem' | 'Awaiting MCS' | 'Awaiting Supplier' | 'Completed' | 'Not Required' | 'Rejected' | 'Expired' | 'Superseded' | 'Needs Review' | string;
  is_conditional?: number;
  condition_rule?: string;
  due_date?: string;
  completed_date?: string;
  responsible_person?: string;
  reviewer_person?: string;
  evidence_required?: string;
  reference_number?: string;
  notes?: string;
  authority?: string;
  source_url?: string;
  document_version?: string;
  clause_page?: string;
  last_verified_date?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  evidenceCount?: number;
  evidenceFiles?: SubmissionEvidence[];
  auditLogs?: SubmissionAuditLog[];
}

export interface SubmissionStageSummary {
  code: string;
  name: string;
  itemsCount: number;
  applicableCount: number;
  completedCount: number;
  completionPercentage: number;
  status: 'Completed' | 'In Progress' | 'Pending' | 'Blocked' | 'Not Required' | string;
  items: SubmissionItem[];
}

export interface Submission {
  id: string;
  job_reference: string;
  lead_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  property_address: string;
  postcode?: string;
  country?: string;
  technology?: string;
  property_status?: string;
  on_off_gas_grid?: string;
  existing_fuel?: string;
  cylinder_applicable?: number;
  installation_date?: string;
  commissioning_date?: string;
  bus_voucher_reference?: string;
  bus_voucher_expiry?: string;
  mcs_certificate_number?: string;
  grant_category?: string;
  current_stage: string;
  overall_status: string;
  completion_percentage: number;
  next_action?: string;
  assigned_to?: string;
  notes?: string;
  six_year_retention_date?: string;
  created_at: string;
  updated_at: string;
  stages?: SubmissionStageSummary[];
  stats?: {
    totalItems: number;
    applicableItems: number;
    completedItems: number;
    awaitingCustomer: number;
    awaitingOfgem: number;
    awaitingMcs: number;
    overdueItems: number;
  };
  evidenceFiles?: SubmissionEvidence[];
}

export interface SubmissionSummary {
  totalActive: number;
  totalCount: number;
  pending: number;
  inProgress: number;
  awaitingCustomer: number;
  awaitingOfgem: number;
  awaitingMcs: number;
  completed: number;
  overdue: number;
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
