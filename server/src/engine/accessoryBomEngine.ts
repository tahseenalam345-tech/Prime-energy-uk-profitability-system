import { db } from '../db/connection.js';

export interface BomRuleInputs {
  boilerType?: string | null;           // Combi, System, Regular, Unknown
  cylinderSpace?: string | null;        // Yes, No, Unknown
  existingPipework?: string | null;     // Standard 15mm+, Microbore 10mm or less, Unknown
  ashpPhase?: number;                   // 1 or 3
  hasCylinder?: boolean;
}

export interface BomLineItem {
  productId?: string;
  category: 'ACCESSORIES' | 'PIPEWORK' | 'COMBI_CONVERSION' | 'ELECTRICAL';
  description: string;
  quantity: number;
  unitCostExVat: number;
  totalCostExVat: number;
  vatRate: number;
  notes?: string;
}

export interface BomEvaluationOutputs {
  lineItems: BomLineItem[];
  totalAccessoriesCostExVat: number;
  totalPipeworkCostExVat: number;
  combiConversionCostExVat: number;
  warnings: string[];
  risks: string[];
}

export async function evaluateAccessoriesAndBom(inputs: BomRuleInputs): Promise<BomEvaluationOutputs> {
  const lineItems: BomLineItem[] = [];
  const warnings: string[] = [];
  const risks: string[] = [];

  // Query commercial settings
  const settings = await db.get('SELECT * FROM commercial_settings WHERE active = 1 ORDER BY version DESC LIMIT 1') as {
    combi_conversion_allowance: number;
    microbore_repipe_allowance: number;
  } | undefined;

  const combiAllowance = settings?.combi_conversion_allowance || 500.00;
  const microboreAllowance = settings?.microbore_repipe_allowance || 1800.00;

  // 1. Mandatory Core Accessories (Filter, Hoses, AV Feet, Diverter Valve, Controller, Isolator)
  const coreAccessoryIds = [
    'acc_magnetic_filter',
    'acc_av_feet',
    'acc_flex_hoses',
    'acc_diverter_valve',
    'acc_controller',
    'acc_elec_pack'
  ];

  for (const id of coreAccessoryIds) {
    const item = await db.get(`
      SELECT p.id, p.model, pr.price_ex_vat 
      FROM products p 
      LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
      WHERE p.id = ?
    `, [id]) as { id: string; model: string; price_ex_vat: number | null } | undefined;

    if (item) {
      const price = item.price_ex_vat || 100.00;
      lineItems.push({
        productId: item.id,
        category: 'ACCESSORIES',
        description: item.model,
        quantity: 1,
        unitCostExVat: price,
        totalCostExVat: price,
        vatRate: 0.0
      });
    }
  }

  // 2. Unvented Cylinder Safety Kit
  if (inputs.hasCylinder !== false) {
    const safetyKit = await db.get(`
      SELECT p.id, p.model, pr.price_ex_vat 
      FROM products p 
      LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
      WHERE p.id = 'acc_safety_pack'
    `) as { id: string; model: string; price_ex_vat: number | null } | undefined;

    if (safetyKit) {
      const price = safetyKit.price_ex_vat || 180.00;
      lineItems.push({
        productId: safetyKit.id,
        category: 'ACCESSORIES',
        description: safetyKit.model,
        quantity: 1,
        unitCostExVat: price,
        totalCostExVat: price,
        vatRate: 0.0,
        notes: 'Required for unvented cylinder installation (expansion vessel & safety group)'
      });
    }
  }

  // 3. Combi Boiler Conversion Allowance (Completely removed per Requirement 4)
  const combiConversionCostExVat = 0;

  // 4. Pipework & Microbore Re-pipe Allowance
  let totalPipeworkCostExVat = 0;
  const rawPipework = (inputs.existingPipework || 'Standard 15mm+').trim();
  const pipework = rawPipework.toLowerCase();

  const standardPipe = await db.get(`
    SELECT p.id, p.model, pr.price_ex_vat 
    FROM products p 
    LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
    WHERE p.id = 'pipe_22mm_pack'
  `) as { id: string; model: string; price_ex_vat: number | null } | undefined;

  const basePipePrice = standardPipe?.price_ex_vat || 250.00;
  totalPipeworkCostExVat += basePipePrice;

  lineItems.push({
    productId: standardPipe?.id || 'pipe_22mm_pack',
    category: 'PIPEWORK',
    description: standardPipe?.model || 'Primary Heat Pump Pipework & Insulation Pack (28mm / 22mm Pre-insulated)',
    quantity: 1,
    unitCostExVat: basePipePrice,
    totalCostExVat: basePipePrice,
    vatRate: 0.0
  });

  if (pipework.includes('microbore') || pipework.includes('10mm') || pipework.includes('8mm')) {
    totalPipeworkCostExVat += microboreAllowance;
    lineItems.push({
      productId: 'pipe_microbore_repipe_allowance',
      category: 'PIPEWORK',
      description: 'Microbore Pipework Re-pipe Commercial Allowance (10mm/8mm restrictor replacement)',
      quantity: 1,
      unitCostExVat: microboreAllowance,
      totalCostExVat: microboreAllowance,
      vatRate: 0.0,
      notes: 'Microbore pipework restricts heat pump flow rate; re-piping allowance added.'
    });
    risks.push('CRITICAL RISK: Microbore pipework detected. Added £' + microboreAllowance + ' re-pipe commercial allowance.');
  } else if (pipework.includes('unknown')) {
    warnings.push('Existing pipework diameter is UNKNOWN; standard 22mm primary pack allowance applied.');
  }

  // 5. 3-Phase Electrical Supply
  if (inputs.ashpPhase === 3) {
    const phase3Pack = await db.get(`
      SELECT p.id, p.model, pr.price_ex_vat 
      FROM products p 
      LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
      WHERE p.id = 'acc_3phase_switch'
    `) as { id: string; model: string; price_ex_vat: number | null } | undefined;

    const p3Price = phase3Pack?.price_ex_vat || 350.00;
    lineItems.push({
      productId: phase3Pack?.id || 'acc_3phase_switch',
      category: 'ELECTRICAL',
      description: phase3Pack?.model || '415V 3-Phase Rotary Isolator & Electrical Switchgear Pack',
      quantity: 1,
      unitCostExVat: p3Price,
      totalCostExVat: p3Price,
      vatRate: 0.0
    });
    warnings.push('3-Phase ASHP selected: Requires 400V 3-phase electricity supply at consumer unit.');
  }

  const totalAccessoriesCostExVat = lineItems
    .filter(i => i.category === 'ACCESSORIES' || i.category === 'ELECTRICAL')
    .reduce((sum, item) => sum + item.totalCostExVat, 0);

  return {
    lineItems,
    totalAccessoriesCostExVat,
    totalPipeworkCostExVat,
    combiConversionCostExVat,
    warnings,
    risks
  };
}
