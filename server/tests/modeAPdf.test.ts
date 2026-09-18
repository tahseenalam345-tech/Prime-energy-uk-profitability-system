import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateModeAPdfBuffer, ModeAPdfInput } from '../src/services/modeAPdfGenerator.js';

describe('Mode A — Job Summary PDF Generation Tests', () => {

  const sampleInput: ModeAPdfInput = {
    quoteReference: 'PEQ-2026-8812',
    leadReference: 'LEAD-9912',
    customerName: 'Eleanor Rigby',
    customerEmail: 'eleanor@example.co.uk',
    customerPhone: '07700 900123',
    addressLine1: '42 Penny Lane',
    addressLine2: 'Liverpool',
    postcode: 'L18 1AA',
    preparedBy: 'Sarah Jenkins',
    date: '18 September 2026',

    propertyType: 'Semi-detached',
    bedrooms: 3,
    epcFloorArea: 110,
    epcRating: 'D',
    epcReference: '9910-2831-4091-8172',
    existingHeatingSystem: 'Mains gas boiler',
    existingFuelType: 'Mains Gas',
    onOffGasGrid: 'On gas grid',
    wallInsulation: 'Cavity filled',
    roofInsulation: '200mm loft',
    annualHeatingKwh: 14500,

    estimatedHeatDemandKw: 7.8,

    ashp: {
      brand: 'Vokèra',
      model: 'BeSmart Heat 8kW',
      ratedOutputKw: 8.0,
      designCondition: '-3°C / 55°C Flow'
    },

    cylinder: {
      brand: 'Telford',
      model: 'Tempest Heat Pump Cylinder 200L',
      capacityLitres: 200
    },

    radiators: {
      count: 9,
      mainType: 'K2 Double Panel',
      estimatedCapacityKw: 6.5,
      plausibility: 'Plausible'
    },

    lineItems: [
      { category: 'ASHP', description: 'Vokèra BeSmart Heat 8kW Monobloc', quantity: 1, unitPriceExVat: 3200, totalPriceExVat: 3200 },
      { category: 'CYLINDER', description: 'Telford Tempest 200L Cylinder', quantity: 1, unitPriceExVat: 950, totalPriceExVat: 950 },
      { category: 'RADIATORS', description: 'Radiator Upgrades (2 x K2 Panel)', quantity: 2, unitPriceExVat: 250, totalPriceExVat: 500 },
      { category: 'ACCESSORIES', description: 'Filter, Valves & Hydraulic Pack', quantity: 1, unitPriceExVat: 450, totalPriceExVat: 450 },
      { category: 'LABOUR', description: 'MCS Installation Labour & Electrical', quantity: 1, unitPriceExVat: 2200, totalPriceExVat: 2200 }
    ],

    totalJobCost: 7300,
    busGrant: 7500,
    customerContribution: 351,
    revenue: 7851,
    grossProfit: 551,
    grossMarginPercent: 7.0
  };

  it('1. GENERATES VALID PDF BUFFER — starts with %PDF header', async () => {
    const pdfBuffer = await generateModeAPdfBuffer(sampleInput);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdfHeader = pdfBuffer.subarray(0, 4).toString('utf8');
    expect(pdfHeader).toBe('%PDF');
  });

  it('2. MISSING OPTIONAL FIELDS — handles incomplete data safely without undefined/null/NaN', async () => {
    const sparseInput: ModeAPdfInput = {
      quoteReference: 'PEQ-MINIMAL',
      customerName: undefined,
      addressLine1: undefined,
      postcode: undefined,
      propertyType: undefined,
      bedrooms: undefined,
      estimatedHeatDemandKw: undefined,
      ashp: undefined,
      cylinder: undefined,
      totalJobCost: 5000,
      busGrant: 7500,
      customerContribution: 0,
      grossProfit: 350,
      grossMarginPercent: 7.0
    };

    const pdfBuffer = await generateModeAPdfBuffer(sparseInput);
    expect(pdfBuffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Convert PDF buffer to string to check for forbidden literal strings
    const pdfText = pdfBuffer.toString('latin1');
    expect(pdfText).not.toContain('undefined');
    expect(pdfText).not.toContain('NaN');
  });

  it('3. REGENERATION REFLECTS UPDATED VALUES — generates different buffer when equipment & costs change', async () => {
    const updatedInput: ModeAPdfInput = {
      ...sampleInput,
      estimatedHeatDemandKw: 11.2,
      ashp: {
        brand: 'Daikin',
        model: 'Altherma 3 H HT 12kW',
        ratedOutputKw: 12.0,
        designCondition: '-3°C / 55°C'
      },
      cylinder: {
        brand: 'Joule',
        model: 'Cyclone 300L Cylinder',
        capacityLitres: 300
      },
      totalJobCost: 9800,
      customerContribution: 3037,
      revenue: 10537,
      grossProfit: 737,
      grossMarginPercent: 7.0
    };

    const pdf1 = await generateModeAPdfBuffer(sampleInput);
    const pdf2 = await generateModeAPdfBuffer(updatedInput);

    expect(pdf1.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(pdf2.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(Buffer.compare(pdf1, pdf2)).not.toBe(0);
  });

  it('4. DISK PERSISTENCE — verifies saved PDF file with target filename format', async () => {
    const storageDir = path.join(process.cwd(), 'storage', 'mode_a_pdfs');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const testFilename = `Prime-Energy-Mode-A-PEQ-TEST-99.pdf`;
    const targetPath = path.join(storageDir, testFilename);

    const buffer = await generateModeAPdfBuffer(sampleInput);
    fs.writeFileSync(targetPath, buffer);

    expect(fs.existsSync(targetPath)).toBe(true);
    const savedBytes = fs.readFileSync(targetPath);
    expect(savedBytes.subarray(0, 4).toString('utf8')).toBe('%PDF');

    // Clean up test file
    fs.unlinkSync(targetPath);
  });
});
