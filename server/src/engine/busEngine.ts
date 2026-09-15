import { db } from '../db/connection.js';

export interface BUSEligibilityInputs {
  country?: string | null;            // England, Wales, Scotland, Northern Ireland
  propertyStatus?: string | null;     // Existing property, Developer new-build, Self-build
  onOffGasGrid?: string | null;       // On gas grid, Off gas grid
  existingHeatingSystem?: string | null; // Gas Central Heating, Oil Boiler, LPG, Electric, etc.
  existingFuelType?: string | null;   // Mains Gas, Heating Oil, Bottled/Bulk LPG, Electricity, Solid Fuel
  technologyType?: string | null;     // Air-to-water, Ground-source, Air-to-air
  previousGovernmentGrant?: string | null; // None, BUS, RHI, Unknown
  isOffGasUpliftConfirmedBySurvey?: boolean; // True only if surveyor verified decommissioning & fuel evidence
}

export interface BUSEligibilityOutputs {
  status: 'PASS' | 'FAIL' | 'UNCERTAIN';
  busEligible: boolean;
  grantCategory: string;
  grantAmount: number;
  grantType: 'STANDARD_ASHP' | 'OFF_GAS_UPLIFT' | 'NONE';
  gridStatus: 'ON_GAS' | 'OFF_GAS';
  existingHeatingType: string;
  existingFuelType: string;
  existingOilOrLpg: boolean;
  busUpliftEligibility: boolean;
  conditionalUpliftAvailable: boolean;
  conditionalUpliftAmount: number;
  rulesetVersion: string;
  reasons: string[];
  notes: string[];
  disclaimer: string;
  sourceUrl: string;
  ruleEvidenceId: string;
  evidenceSource: string;
}

/**
 * Authoritative Boiler Upgrade Scheme (BUS) Eligibility Evaluator
 * Pursuant to Ofgem BUS Installer Guidance V5.1, Property Owner Guidance V5.1,
 * and DESNZ Approved Grant Categories & Values Notice (21 July 2026).
 */
export async function evaluateBUSEligibility(inputs: BUSEligibilityInputs): Promise<BUSEligibilityOutputs> {
  const reasons: string[] = [];
  const notes: string[] = [];
  const disclaimer = 'Statutory BUS grant eligibility subject to Ofgem voucher approval, MCS certification, and installer compliance.';

  // Retrieve active BUS ruleset from DB if present
  let busRule: any = null;
  try {
    busRule = await db.get('SELECT * FROM bus_rules WHERE active = 1 ORDER BY effective_date DESC LIMIT 1');
  } catch (e) {
    // Fallback if db table unavailable
  }

  const version = busRule?.version || 'V5.1-2026';
  const sourceUrl = busRule?.source_url || 'https://www.ofgem.gov.uk/publications/boiler-upgrade-scheme-guidance-installers';
  const evidenceSource = 'Ofgem BUS Installer Guidance V5.1 & DESNZ Notice (21 July 2026)';
  const standardGrant = 7500.00;
  const maxUpliftGrant = 9000.00;

  const country = (inputs.country || 'England').trim();
  const propertyStatus = (inputs.propertyStatus || 'Existing property').trim();
  const priorGrant = (inputs.previousGovernmentGrant || 'None').trim();
  const onOffGas = (inputs.onOffGasGrid || 'On gas grid').trim();
  const gridStatus: 'ON_GAS' | 'OFF_GAS' = onOffGas.toLowerCase().includes('off') ? 'OFF_GAS' : 'ON_GAS';
  const techType = (inputs.technologyType || 'Air-to-water').trim().toLowerCase();

  const existingHeatingType = (inputs.existingHeatingSystem || 'Gas Central Heating').trim();
  const heatingLower = existingHeatingType.toLowerCase();
  const fuelLower = (inputs.existingFuelType || '').toLowerCase();

  // Fuel classification pursuant to 21 July 2026 Notice
  const isHybrid = heatingLower.includes('hybrid') || fuelLower.includes('hybrid');
  const isOil = (/\boil\b/i.test(heatingLower) || /\boil\b/i.test(fuelLower) || heatingLower.includes('kerosene') || fuelLower.includes('kerosene')) && !isHybrid;
  const isLpg = (/\blpg\b/i.test(heatingLower) || /\blpg\b/i.test(fuelLower) || heatingLower.includes('liquid petroleum') || fuelLower.includes('liquefied petroleum')) && !isHybrid;
  const isCoal = (/\bcoal\b/i.test(heatingLower) || /\bcoal\b/i.test(fuelLower) || heatingLower.includes('solid fuel') || fuelLower.includes('anthracite')) && !isHybrid;
  const isElectric = (/\belectric\b/i.test(heatingLower) || /\belectric\b/i.test(fuelLower) || heatingLower.includes('storage heater')) && !isHybrid;

  const isOffGas = gridStatus === 'OFF_GAS';
  const qualifiesFor9000OffGasUplift = isOffGas && (isOil || isLpg);

  const existingFuelType = inputs.existingFuelType || (
    isOil ? 'Heating Oil' :
    isLpg ? 'Bulk LPG' :
    isCoal ? 'Solid Fuel / Coal' :
    isHybrid ? 'Fossil Hybrid' :
    isElectric ? 'Electricity' :
    (isOffGas ? 'Off-Gas Fossil / Electric' : 'Mains Gas')
  );

  // RULE 0: Technology Eligibility Check (Air-to-Air heat pumps INELIGIBLE under BUS Regulation 17)
  if (techType.includes('air-to-air') || techType.includes('air to air')) {
    reasons.push('Air-to-air heat pumps are strictly ineligible for BUS grant under Regulation 17 (only Air-to-Water, Ground-Source, and Shared Loop systems qualify).');
    return {
      status: 'FAIL',
      busEligible: false,
      grantCategory: 'INELIGIBLE_AIR_TO_AIR',
      grantAmount: 0,
      grantType: 'NONE',
      gridStatus,
      existingHeatingType,
      existingFuelType,
      existingOilOrLpg: isOil || isLpg,
      busUpliftEligibility: false,
      conditionalUpliftAvailable: false,
      conditionalUpliftAmount: 0,
      rulesetVersion: version,
      reasons,
      notes,
      disclaimer,
      sourceUrl,
      ruleEvidenceId: 'BUS_INELIGIBLE_TECHNOLOGY',
      evidenceSource
    };
  }

  // RULE 1: Geographical Jurisdiction (England & Wales only)
  const scopeCountries = ['england', 'wales'];
  if (!scopeCountries.includes(country.toLowerCase())) {
    reasons.push(`Property located in '${country}'. Statutory BUS grant is restricted to England and Wales.`);
    return {
      status: 'FAIL',
      busEligible: false,
      grantCategory: 'INELIGIBLE_GEOGRAPHY',
      grantAmount: 0,
      grantType: 'NONE',
      gridStatus,
      existingHeatingType,
      existingFuelType,
      existingOilOrLpg: isOil || isLpg,
      busUpliftEligibility: false,
      conditionalUpliftAvailable: false,
      conditionalUpliftAmount: 0,
      rulesetVersion: version,
      reasons,
      notes,
      disclaimer,
      sourceUrl,
      ruleEvidenceId: 'BUS_ELIGIBILITY_GRANT_LEGISLATION',
      evidenceSource
    };
  }

  // RULE 2: Property Status (Developer New-Build Disqualified, Custom Self-Build Exempt)
  const statusLower = propertyStatus.toLowerCase();
  if (statusLower.includes('developer') || statusLower.includes('new build') || statusLower.includes('new-build')) {
    if (!statusLower.includes('self-build') && !statusLower.includes('self build')) {
      reasons.push(`Developer new-build properties are strictly ineligible for BUS grant under Regulation 18.`);
      return {
        status: 'FAIL',
        busEligible: false,
        grantCategory: 'INELIGIBLE_DEVELOPER_NEW_BUILD',
        grantAmount: 0,
        grantType: 'NONE',
        gridStatus,
        existingHeatingType,
        existingFuelType,
        existingOilOrLpg: isOil || isLpg,
        busUpliftEligibility: false,
        conditionalUpliftAvailable: false,
        conditionalUpliftAmount: 0,
        rulesetVersion: version,
        reasons,
        notes,
        disclaimer,
        sourceUrl,
        ruleEvidenceId: 'BUS_NEW_BUILD_RESTRICTION',
        evidenceSource
      };
    }
  }

  if (statusLower.includes('self-build') || statusLower.includes('self build')) {
    notes.push('Self-build eligible property - statutory evidence required.');
  }

  // RULE 3: Prior Government Funding Disqualification
  const grantLower = priorGrant.toLowerCase();
  let overallStatus: BUSEligibilityOutputs['status'] = 'PASS';

  if (grantLower.includes('bus') || grantLower.includes('rhi') || grantLower.includes('boiler upgrade')) {
    reasons.push(`Property has previously claimed government funding ('${priorGrant}'). Disqualified under double-funding rules.`);
    return {
      status: 'FAIL',
      busEligible: false,
      grantCategory: 'INELIGIBLE_PRIOR_FUNDING',
      grantAmount: 0,
      grantType: 'NONE',
      gridStatus,
      existingHeatingType,
      existingFuelType,
      existingOilOrLpg: isOil || isLpg,
      busUpliftEligibility: false,
      conditionalUpliftAvailable: false,
      conditionalUpliftAmount: 0,
      rulesetVersion: version,
      reasons,
      notes,
      disclaimer,
      sourceUrl,
      ruleEvidenceId: 'BUS_ELIGIBILITY_GRANT_LEGISLATION',
      evidenceSource
    };
  } else if (grantLower.includes('unknown') || grantLower.includes('unconfirmed')) {
    overallStatus = 'UNCERTAIN';
    reasons.push('UNCONFIRMED prior government grant status. Requires verification before redemption.');
  }

  // RULE 4: Determination of Grant Tier (£7,500 vs £9,000 Off-Gas Uplift)
  let grantAmount = standardGrant;
  let grantType: BUSEligibilityOutputs['grantType'] = 'STANDARD_ASHP';
  let grantCategory = 'STANDARD_AWHP_GSHP_£7500';
  let busUpliftEligibility = false;
  let conditionalUpliftAvailable = false;
  let conditionalUpliftAmount = 0;
  let ruleEvidenceId = 'BUS_ELIGIBILITY_GRANT_LEGISLATION';

  if (qualifiesFor9000OffGasUplift) {
    ruleEvidenceId = 'BUS_OFF_GAS_OIL_LPG_9000';
    if (inputs.isOffGasUpliftConfirmedBySurvey !== false) {
      grantAmount = maxUpliftGrant;
      grantType = 'OFF_GAS_UPLIFT';
      grantCategory = 'OFF_GAS_OIL_LPG_UPLIFT_£9000';
      busUpliftEligibility = true;
      conditionalUpliftAvailable = true;
      conditionalUpliftAmount = maxUpliftGrant;
      notes.push(`[BUS £9,000 UPLIFT] Property is off-gas grid replacing ${existingFuelType}. £9,000 off-gas uplift grant applies under 21 July 2026 Notice.`);
    } else {
      grantAmount = standardGrant;
      grantType = 'STANDARD_ASHP';
      grantCategory = 'STANDARD_AWHP_GSHP_£7500';
      conditionalUpliftAvailable = true;
      conditionalUpliftAmount = maxUpliftGrant - standardGrant;
      busUpliftEligibility = false;
      notes.push(`[BUS £9,000 UPLIFT CONDITIONAL] Property is off-gas grid replacing ${existingFuelType}. Eligible for +£${conditionalUpliftAmount.toLocaleString()} uplift (£9,000 total) pending surveyor verification of tank decommissioning and fuel evidence.`);
    }
  } else {
    grantAmount = standardGrant;
    grantType = 'STANDARD_ASHP';
    grantCategory = 'STANDARD_AWHP_GSHP_£7500';
    if (isOffGas) {
      notes.push(`[BUS £7,500 STANDARD] Property is off-gas grid replacing ${existingFuelType} (Coal/Electric/Hybrid). Standard £7,500 BUS grant applies.`);
    } else {
      notes.push(`[BUS £7,500 STANDARD] Property is on mains gas grid. Standard £7,500 BUS grant applies.`);
    }
  }

  return {
    status: overallStatus,
    busEligible: overallStatus === 'PASS' || overallStatus === 'UNCERTAIN',
    grantCategory,
    grantAmount,
    grantType,
    gridStatus,
    existingHeatingType,
    existingFuelType,
    existingOilOrLpg: isOil || isLpg,
    busUpliftEligibility,
    conditionalUpliftAvailable,
    conditionalUpliftAmount,
    rulesetVersion: version,
    reasons,
    notes,
    disclaimer,
    sourceUrl,
    ruleEvidenceId,
    evidenceSource
  };
}
