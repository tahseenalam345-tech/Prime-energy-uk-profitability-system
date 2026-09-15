import { db } from '../db/connection.js';

export interface CylinderInputs {
  bedrooms?: number | null;
  bathrooms?: number | null;
  cylinderSpace?: string | null; // Yes, No, Unknown
  boilerType?: string | null;    // Combi, System, Regular, Unknown
  overrideCylinderId?: string | null; // User manual override product ID
}

export interface CylinderProductItem {
  id: string;
  brand: string;
  manufacturer: string;
  model: string;
  volumeLitres: number;
  priceExVat: number;
  priceIncVat: number;
  vatStatus: 'EX_VAT' | 'INC_VAT';
  supplier: string;
  supplierUrl: string;
  manufacturerUrl: string;
  dimensions: string;
}

export interface CylinderOutputs {
  recommendedVolumeLitres: number | null;
  displayCapacity: string;
  recommendedProduct: CylinderProductItem | null;
  selectedProduct: CylinderProductItem | null;
  isManualOverride: boolean;
  overrideNote?: string;
  allCylinders?: CylinderProductItem[];
  viabilityBlocker: boolean;
  notes: string[];
  assumptions: string[];
  disclaimer: string;
  ruleEvidenceId: string;
  error?: string;
}

/**
 * Authoritative Hot Water Storage Sizing Engine
 * Incorporates CIBSE / BS 6700 heuristics with full manual override support.
 */
export async function selectRecommendedCylinder(inputs: CylinderInputs): Promise<CylinderOutputs> {
  const notes: string[] = [];
  const assumptions: string[] = [];
  const disclaimer = 'ESTIMATED — domestic hot water capacity subject to occupant bathing habits, peak shower flow rates, and cupboard dimensions.';

  // 1. Fetch all active cylinders with current prices from DB
  const rawCylinders = await db.all(`
    SELECT 
      p.id, COALESCE(p.brand, p.manufacturer) as brand, p.manufacturer, p.model,
      COALESCE(p.nominal_capacity, 200) as nominal_litres, p.specifications,
      p.capacity_source_url as manufacturer_url,
      pr.price_ex_vat, pr.price_inc_vat, pr.price_basis, pr.supplier, pr.source_url
    FROM products p
    LEFT JOIN product_prices pr ON p.id = pr.product_id AND pr.is_current = 1
    WHERE p.family = 'CYLINDER' AND p.active = 1
    ORDER BY COALESCE(p.nominal_capacity, 200) ASC, pr.price_ex_vat ASC
  `) as Array<{
    id: string;
    brand: string;
    manufacturer: string;
    model: string;
    nominal_litres: number;
    specifications: string;
    manufacturer_url: string | null;
    price_ex_vat: number | null;
    price_inc_vat: number | null;
    price_basis: string | null;
    supplier: string | null;
    source_url: string | null;
  }>;

  const allCylinders: CylinderProductItem[] = rawCylinders.map(c => {
    let vol = c.nominal_litres;
    let dims = 'Standard unvented';
    try {
      const parsed = JSON.parse(c.specifications || '{}');
      if (parsed.volumeLitres) vol = parsed.volumeLitres;
      if (parsed.dimensions) dims = parsed.dimensions;
    } catch {
      // ignore
    }

    const priceEx = c.price_ex_vat ?? 950.00;
    const priceInc = c.price_inc_vat ?? Math.round(priceEx * 1.20 * 100) / 100;

    return {
      id: c.id,
      brand: c.brand || c.manufacturer,
      manufacturer: c.manufacturer,
      model: c.model,
      volumeLitres: vol,
      priceExVat: priceEx,
      priceIncVat: priceInc,
      vatStatus: (c.price_basis === 'INC_VAT' ? 'INC_VAT' : 'EX_VAT') as 'EX_VAT' | 'INC_VAT',
      supplier: c.supplier || 'City Plumbing',
      supplierUrl: c.source_url || 'https://www.cityplumbing.co.uk',
      manufacturerUrl: c.manufacturer_url || 'https://www.gledhill.net',
      dimensions: dims
    };
  });

  if (inputs.bedrooms === undefined || inputs.bedrooms === null) {
    return {
      recommendedVolumeLitres: null,
      displayCapacity: 'UNSPECIFIED',
      recommendedProduct: null,
      selectedProduct: null,
      isManualOverride: false,
      allCylinders,
      viabilityBlocker: false,
      notes: ['Cylinder sizing requires bedroom information.'],
      assumptions: [],
      disclaimer,
      ruleEvidenceId: 'CYLINDER_SIZING_HEURISTIC',
      error: 'Cylinder sizing requires bedroom information.'
    };
  }

  // 2. Viability Check for Cylinder Space
  const space = (inputs.cylinderSpace || 'Yes').trim().toLowerCase();
  let viabilityBlocker = false;

  if (space === 'no' || space === 'none' || space === 'false') {
    viabilityBlocker = true;
    notes.push('Potentially non-viable: Customer indicated NO space for hot water cylinder.');
  } else if (space === 'unknown') {
    assumptions.push('Cylinder cupboard space assumed available (subject to surveyor confirmation).');
  }

  // 3. Calculate Recommended Volume (CIBSE / BS 6700 Heuristic)
  const beds = inputs.bedrooms;
  const baths = inputs.bathrooms && inputs.bathrooms > 0 ? inputs.bathrooms : 1;

  let targetLitres = 200;

  if (beds <= 2 && baths <= 1) {
    targetLitres = 180;
  } else if (beds <= 3 && baths <= 2) {
    targetLitres = 200;
  } else if (beds <= 4 && baths <= 2) {
    targetLitres = 250;
  } else {
    targetLitres = 300;
  }

  notes.push(`[CIBSE BS 6700 SIZING] Recommended ${targetLitres}L unvented heat pump cylinder for ${beds} bed, ${baths} bath property.`);

  // Find best matching product with volume >= targetLitres
  let recommendedProduct: CylinderProductItem | null = null;
  const matchingCylinders = allCylinders.filter(c => c.volumeLitres >= targetLitres);

  if (matchingCylinders.length > 0) {
    // Pick smallest suitable volume, then lowest price
    matchingCylinders.sort((a, b) => {
      if (a.volumeLitres !== b.volumeLitres) {
        return a.volumeLitres - b.volumeLitres;
      }
      return a.priceExVat - b.priceExVat;
    });
    recommendedProduct = matchingCylinders[0];
  } else if (allCylinders.length > 0) {
    // Pick largest available
    recommendedProduct = allCylinders[allCylinders.length - 1];
  }

  // 4. Handle Manual Override Selection
  let selectedProduct = recommendedProduct;
  let isManualOverride = false;
  let overrideNote: string | undefined;

  if (inputs.overrideCylinderId) {
    const overrideMatch = allCylinders.find(c => c.id === inputs.overrideCylinderId);
    if (overrideMatch) {
      selectedProduct = overrideMatch;
      isManualOverride = true;
      overrideNote = `Manual override applied: Selected ${overrideMatch.brand} ${overrideMatch.model} (${overrideMatch.volumeLitres}L).`;
      notes.push(overrideNote);
    }
  }

  const displayCapacity = selectedProduct ? `${selectedProduct.volumeLitres} Litres` : `${targetLitres} Litres`;

  return {
    recommendedVolumeLitres: targetLitres,
    displayCapacity,
    recommendedProduct,
    selectedProduct,
    isManualOverride,
    overrideNote,
    allCylinders,
    viabilityBlocker,
    notes,
    assumptions,
    disclaimer,
    ruleEvidenceId: 'CIBSE_BS6700_CYLINDER_SIZING_TABLE'
  };
}
