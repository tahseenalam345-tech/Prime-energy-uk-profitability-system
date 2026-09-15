import { db } from '../db/connection.js';

export interface ConfidenceInputs {
  epcRating?: string | null;
  floorAreaM2?: number | null;
  propertyType?: string | null;
  wallInsulation?: string | null;
  roofInsulation?: string | null;
  existingHeatingSystem?: string | null;
  radiatorCount?: number | null;
  radiatorDetails?: string | null;
  bathrooms?: number | null;
}

export interface ConfidenceOutputs {
  score: number; // 0 to 100
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  breakdown: Array<{
    field: string;
    label: string;
    maxWeight: number;
    awardedWeight: number;
    status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  }>;
}

export async function evaluateConfidence(inputs: ConfidenceInputs): Promise<ConfidenceOutputs> {
  const weights = await db.all('SELECT field_key, label, max_weight FROM confidence_weight_configs') as Array<{
    field_key: string;
    label: string;
    max_weight: number;
  }>;

  const weightMap = new Map<string, { label: string; maxWeight: number }>();
  for (const w of weights) {
    weightMap.set(w.field_key, { label: w.label, maxWeight: w.max_weight });
  }

  const breakdown: ConfidenceOutputs['breakdown'] = [];
  let totalScore = 0;

  // 1. EPC Rating (20 pts)
  const epcWeight = weightMap.get('epc_rating') || { label: 'EPC Rating', maxWeight: 20 };
  if (inputs.epcRating && inputs.epcRating !== 'Unknown') {
    totalScore += epcWeight.maxWeight;
    breakdown.push({ field: 'epc_rating', label: epcWeight.label, maxWeight: epcWeight.maxWeight, awardedWeight: epcWeight.maxWeight, status: 'COMPLETE' });
  } else {
    breakdown.push({ field: 'epc_rating', label: epcWeight.label, maxWeight: epcWeight.maxWeight, awardedWeight: 0, status: 'MISSING' });
  }

  // 2. Floor Area (20 pts)
  const areaWeight = weightMap.get('floor_area') || { label: 'EPC Floor Area m²', maxWeight: 20 };
  if (inputs.floorAreaM2 && inputs.floorAreaM2 > 0) {
    totalScore += areaWeight.maxWeight;
    breakdown.push({ field: 'floor_area', label: areaWeight.label, maxWeight: areaWeight.maxWeight, awardedWeight: areaWeight.maxWeight, status: 'COMPLETE' });
  } else {
    breakdown.push({ field: 'floor_area', label: areaWeight.label, maxWeight: areaWeight.maxWeight, awardedWeight: 0, status: 'MISSING' });
  }

  // 3. Property Type (15 pts)
  const typeWeight = weightMap.get('property_type') || { label: 'Property Type', maxWeight: 15 };
  if (inputs.propertyType && inputs.propertyType !== 'Unknown') {
    totalScore += typeWeight.maxWeight;
    breakdown.push({ field: 'property_type', label: typeWeight.label, maxWeight: typeWeight.maxWeight, awardedWeight: typeWeight.maxWeight, status: 'COMPLETE' });
  } else {
    breakdown.push({ field: 'property_type', label: typeWeight.label, maxWeight: typeWeight.maxWeight, awardedWeight: 0, status: 'MISSING' });
  }

  // 4. Wall Insulation (15 pts)
  const wallWeight = weightMap.get('wall_insulation') || { label: 'Wall Insulation', maxWeight: 15 };
  if (inputs.wallInsulation && inputs.wallInsulation !== 'Unknown') {
    totalScore += wallWeight.maxWeight;
    breakdown.push({ field: 'wall_insulation', label: wallWeight.label, maxWeight: wallWeight.maxWeight, awardedWeight: wallWeight.maxWeight, status: 'COMPLETE' });
  } else {
    breakdown.push({ field: 'wall_insulation', label: wallWeight.label, maxWeight: wallWeight.maxWeight, awardedWeight: 0, status: 'MISSING' });
  }

  // 5. Roof Insulation (10 pts)
  const roofWeight = weightMap.get('roof_insulation') || { label: 'Roof Insulation', maxWeight: 10 };
  if (inputs.roofInsulation && inputs.roofInsulation !== 'Unknown') {
    totalScore += roofWeight.maxWeight;
    breakdown.push({ field: 'roof_insulation', label: roofWeight.label, maxWeight: roofWeight.maxWeight, awardedWeight: roofWeight.maxWeight, status: 'COMPLETE' });
  } else {
    breakdown.push({ field: 'roof_insulation', label: roofWeight.label, maxWeight: roofWeight.maxWeight, awardedWeight: 0, status: 'MISSING' });
  }

  // 6. Existing Heating System (10 pts)
  const heatWeight = weightMap.get('existing_heating_system') || { label: 'Existing Heating System', maxWeight: 10 };
  if (inputs.existingHeatingSystem && inputs.existingHeatingSystem !== 'Unknown') {
    totalScore += heatWeight.maxWeight;
    breakdown.push({ field: 'existing_heating_system', label: heatWeight.label, maxWeight: heatWeight.maxWeight, awardedWeight: heatWeight.maxWeight, status: 'COMPLETE' });
  } else {
    breakdown.push({ field: 'existing_heating_system', label: heatWeight.label, maxWeight: heatWeight.maxWeight, awardedWeight: 0, status: 'MISSING' });
  }

  // 7. Radiator Information (5 pts)
  const radWeight = weightMap.get('radiator_information') || { label: 'Radiator Information', maxWeight: 5 };
  if (inputs.radiatorDetails) {
    totalScore += radWeight.maxWeight;
    breakdown.push({ field: 'radiator_information', label: radWeight.label, maxWeight: radWeight.maxWeight, awardedWeight: radWeight.maxWeight, status: 'COMPLETE' });
  } else if (inputs.radiatorCount && inputs.radiatorCount > 0) {
    totalScore += Math.round(radWeight.maxWeight / 2);
    breakdown.push({ field: 'radiator_information', label: radWeight.label, maxWeight: radWeight.maxWeight, awardedWeight: Math.round(radWeight.maxWeight / 2), status: 'PARTIAL' });
  } else {
    breakdown.push({ field: 'radiator_information', label: radWeight.label, maxWeight: radWeight.maxWeight, awardedWeight: 0, status: 'MISSING' });
  }

  // 8. Bathroom / Hot Water Needs (5 pts)
  const bathWeight = weightMap.get('hot_water_bathrooms') || { label: 'Hot Water & Bathrooms', maxWeight: 5 };
  if (inputs.bathrooms && inputs.bathrooms > 0) {
    totalScore += bathWeight.maxWeight;
    breakdown.push({ field: 'hot_water_bathrooms', label: bathWeight.label, maxWeight: bathWeight.maxWeight, awardedWeight: bathWeight.maxWeight, status: 'COMPLETE' });
  } else {
    breakdown.push({ field: 'hot_water_bathrooms', label: bathWeight.label, maxWeight: bathWeight.maxWeight, awardedWeight: 0, status: 'MISSING' });
  }

  let level: ConfidenceOutputs['level'] = 'LOW';
  if (totalScore >= 80) {
    level = 'HIGH';
  } else if (totalScore >= 50) {
    level = 'MEDIUM';
  }

  return {
    score: totalScore,
    level,
    breakdown
  };
}
