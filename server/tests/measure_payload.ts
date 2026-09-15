import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';

const res = calculateNewLeadEstimate({
  customerName: 'Eleanor Vance',
  email: 'eleanor.vance@example.co.uk',
  phone: '07700 900123',
  addressLine1: '42 Highfield Road',
  postcode: 'LS17 6QA',
  country: 'England',
  epcRating: 'D',
  epcFloorArea: 135,
  propertyType: 'Detached',
  propertyStatus: 'Existing property',
  bedrooms: 4,
  bathrooms: 2,
  wallInsulation: 'Cavity wall',
  roofInsulation: '200mm loft',
  existingHeatingSystem: 'Mains Gas',
  boilerType: 'System',
  onOffGasGrid: 'On gas grid',
  cylinderSpace: 'Yes',
  existingRadiatorCount: 12,
  existingPipework: 'Standard 15mm+',
  previousGovernmentGrant: 'None',
  salesNotes: 'E2E verification customer lead'
});

const payload = {
  leadId: 'lead_1789296272414',
  mode: 'NEW_LEAD',
  createdBy: 'user_sales',
  calculationResult: res,
  snapshotNotes: 'New Lead commercial assessment for Eleanor Vance'
};

const jsonStr = JSON.stringify(payload);
const bytes = Buffer.byteLength(jsonStr, 'utf8');

console.log('=== PAYLOAD MEASUREMENT ===');
console.log(`Payload String Length: ${jsonStr.length} characters`);
console.log(`Payload Size in Bytes: ${bytes} bytes (${(bytes / 1024).toFixed(2)} KB)`);
console.log(`Express Default Limit: 102,400 bytes (100 KB)`);
console.log(`Is Payload Exceeding Express Default Limit? ${bytes > 102400 ? 'YES - HTTP 413 HTTP Payload Too Large Error' : 'NO'}`);

// Inspect breakdown of key properties in calculationResult
console.log('\n=== CALCULATION RESULT KEYS BREAKDOWN ===');
for (const key of Object.keys(res)) {
  const propJson = JSON.stringify((res as any)[key]);
  console.log(`- ${key}: ${Buffer.byteLength(propJson, 'utf8')} bytes`);
}

console.log('\n=== ASHP SUB-KEYS BREAKDOWN ===');
for (const subKey of Object.keys(res.ashp)) {
  const val = (res.ashp as any)[subKey];
  if (val !== undefined) {
    const subJson = JSON.stringify(val);
    console.log(`- ashp.${subKey}: ${Buffer.byteLength(subJson, 'utf8')} bytes`);
  }
}
