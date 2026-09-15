import { db } from '../db/connection.js';

export interface HeatDemandInputs {
  floorAreaM2: number;
  epcRating?: string | null;       // A/B, C, D, E, F/G or individual letters A, B, C, D, E, F, G
  propertyType: string;           // Detached, Semi detached, End terrace, Mid terrace, Bungalow, Flat
  wallInsulation?: string | null; // Insulated, Uninsulated, Unknown
  roofInsulation?: string | null; // Insulated, Uninsulated, Unknown
  annualHeatingKwh?: number | null; // Annual heating energy from EPC (e.g. 14,120 kWh/year)
  annualHotWaterKwh?: number | null; // Annual hot water energy from EPC (e.g. 1,814 kWh/year)
  epcCertificateNumber?: string | null;
  epcDate?: string | null;
  storeys?: number | null;
}

export interface HeatDemandOutputs {
  baselineWPerM2: number;
  baselineSource: 'ESTIMATION_HEURISTIC_EPC_BAND' | 'FALLBACK_INSULATION' | 'ESTIMATION_HEURISTIC_INSULATION' | 'DEFAULT_FALLBACK';
  propertyMultiplier: number;
  propertyType: string;
  centralDemandKw: number;
  minDemandKw: number;
  maxDemandKw: number;
  displayRange: string; // e.g. "7.0 – 9.5 kW"
  annualHeatingKwh: number | null;
  annualHotWaterKwh: number | null;
  annualHeatingKwhNote?: string;
  manualReviewFlag: boolean;
  notes: string[];
  disclaimer: string;
  ruleEvidenceId: string;
}

/**
 * Normalizes EPC letter into the baseline band keys (A/B, C, D, E, F/G)
 */
function normalizeEpcBand(epc?: string | null): string | null {
  if (!epc) return null;
  const clean = epc.trim().toUpperCase();
  if (clean === 'A' || clean === 'B' || clean === 'A/B') return 'A/B';
  if (clean === 'C') return 'C';
  if (clean === 'D') return 'D';
  if (clean === 'E') return 'E';
  if (clean === 'F' || clean === 'G' || clean === 'F/G') return 'F/G';
  return null;
}

/**
 * Rounds a kW value to the nearest 0.5 kW
 */
export function roundToNearestHalf(val: number): number {
  return Math.round(val * 2) / 2;
}

/**
 * Indicative Heat Demand Estimator for New Leads / Pre-Survey
 * Note: Clearly labelled as an ESTIMATION HEURISTIC per Requirement 7 & 8.
 */
export async function calculateIndicativeHeatDemand(inputs: HeatDemandInputs): Promise<HeatDemandOutputs> {
  const notes: string[] = [];
  const disclaimer = 'PRE-SURVEY ESTIMATE ONLY — not an MCS final design. Subject to full room-by-room BS EN 12831 survey calculation.';

  if (!inputs.floorAreaM2 || inputs.floorAreaM2 <= 0) {
    throw new Error('Valid floor area in m² is required for indicative heat demand estimation');
  }

  // 1. Determine baseline W/m² (Identified as ESTIMATION_HEURISTIC)
  let baselineWPerM2: number = 70.0;
  let baselineSource: HeatDemandOutputs['baselineSource'] = 'DEFAULT_FALLBACK';

  const normalizedEpc = normalizeEpcBand(inputs.epcRating);

  if (normalizedEpc) {
    const epcRow = await db.get('SELECT w_per_m2 FROM epc_baselines WHERE epc_band = ?', [normalizedEpc]) as { w_per_m2: number } | undefined;
    if (epcRow) {
      baselineWPerM2 = epcRow.w_per_m2;
      baselineSource = 'ESTIMATION_HEURISTIC_EPC_BAND';
      notes.push(`[ESTIMATION HEURISTIC] Used EPC rating '${normalizedEpc}' indicative benchmark: ${baselineWPerM2} W/m²`);
    }
  }

  // If no EPC or unrecognized, use fallback insulation table
  if (baselineSource === 'DEFAULT_FALLBACK') {
    const wall = (inputs.wallInsulation || 'Unknown').toLowerCase();
    const roof = (inputs.roofInsulation || 'Unknown').toLowerCase();

    let conditionKey = 'BOTH_UNKNOWN';
    if (wall === 'insulated' && roof === 'insulated') {
      conditionKey = 'WALL_INSULATED_ROOF_INSULATED';
    } else if (wall === 'insulated' && roof !== 'insulated') {
      conditionKey = 'WALL_INSULATED_ROOF_UNINSULATED';
    } else if (wall !== 'insulated' && roof === 'insulated') {
      conditionKey = 'WALL_UNINSULATED_ROOF_INSULATED';
    } else if (wall === 'uninsulated' && roof === 'uninsulated') {
      conditionKey = 'WALL_UNINSULATED_ROOF_UNINSULATED';
    }

    const fallbackRow = await db.get('SELECT w_per_m2, description FROM fallback_insulation_tables WHERE condition_key = ?', [conditionKey]) as { w_per_m2: number; description: string } | undefined;
    if (fallbackRow) {
      baselineWPerM2 = fallbackRow.w_per_m2;
      baselineSource = 'FALLBACK_INSULATION';
      notes.push(`[ESTIMATION HEURISTIC] No verified EPC. Used building fabric insulation fallback (${fallbackRow.description}): ${baselineWPerM2} W/m²`);
    } else {
      baselineWPerM2 = 70.0;
      notes.push(`[ESTIMATION HEURISTIC] Used standard default baseline: ${baselineWPerM2} W/m²`);
    }
  }

  // 2. Determine property multiplier
  let propertyMultiplier = 1.0;
  let manualReviewFlag = false;

  const propType = (inputs.propertyType || 'Semi detached').trim();
  const multRow = await db.get('SELECT multiplier, manual_review_flag FROM property_multipliers WHERE property_type = ?', [propType]) as { multiplier: number; manual_review_flag: number } | undefined;

  if (multRow) {
    propertyMultiplier = multRow.multiplier;
    manualReviewFlag = multRow.manual_review_flag === 1;
    if (propertyMultiplier !== 1.0) {
      notes.push(`[PRIME CONFIG] Applied property multiplier for '${propType}': ${propertyMultiplier}x`);
    }
    if (manualReviewFlag) {
      notes.push(`Mandatory manual review flagged for property type '${propType}'.`);
    }
  }

  // 3. Calculate central demand in kW
  const rawDemandW = inputs.floorAreaM2 * baselineWPerM2 * propertyMultiplier;
  const centralDemandKw = roundToNearestHalf(rawDemandW / 1000.0);

  // 4. Calculate indicative range
  const minDemandKw = roundToNearestHalf(centralDemandKw * 0.85);
  const maxDemandKw = roundToNearestHalf(centralDemandKw * 1.15);
  const displayRange = `${minDemandKw.toFixed(1)} – ${maxDemandKw.toFixed(1)} kW`;

  // 5. Handling Annual Heating Energy kWh/yr
  let annualHeatingKwhNote: string | undefined;
  const annualHeatingKwh = inputs.annualHeatingKwh ? Number(inputs.annualHeatingKwh) : null;
  const annualHotWaterKwh = inputs.annualHotWaterKwh ? Number(inputs.annualHotWaterKwh) : null;

  if (annualHeatingKwh && annualHeatingKwh > 0) {
    annualHeatingKwhNote = `EPC Space Heating: ${annualHeatingKwh.toLocaleString()} kWh/yr (SAP 10.2 seasonal consumption; NOT divided by 1,000 for peak heat loss).`;
    notes.push(annualHeatingKwhNote);
  }

  return {
    baselineWPerM2,
    baselineSource,
    propertyMultiplier,
    propertyType: propType,
    centralDemandKw,
    minDemandKw,
    maxDemandKw,
    displayRange,
    annualHeatingKwh,
    annualHotWaterKwh,
    annualHeatingKwhNote,
    manualReviewFlag,
    notes,
    disclaimer,
    ruleEvidenceId: 'EPC_HEURISTIC_PRE_SURVEY_W_M2'
  };
}
