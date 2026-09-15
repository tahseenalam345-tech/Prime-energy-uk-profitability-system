import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/db/seed.js';
import { evaluateBUSEligibility } from '../src/engine/busEngine.js';

describe('BUS Rules Engine', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('approves standard £7,500 grant for eligible England on-gas property', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Gas Boiler',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('PASS');
    expect(result.grantAmount).toBe(7500);
    expect(result.grantType).toBe('STANDARD_ASHP');
  });

  it('routes to £9,000 uplift grant for off-gas oil replacement', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Oil Boiler',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('PASS');
    expect(result.grantAmount).toBe(9000);
    expect(result.grantType).toBe('OFF_GAS_UPLIFT');
  });

  it('rejects properties outside England and Wales (Scotland)', async () => {
    const result = await evaluateBUSEligibility({
      country: 'Scotland',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Gas Boiler',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('FAIL');
    expect(result.grantAmount).toBe(0);
    expect(result.reasons.some(r => r.includes('restricted to England and Wales'))).toBe(true);
  });

  it('rejects developer new-build properties', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Developer new-build',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'None',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('FAIL');
    expect(result.grantAmount).toBe(0);
    expect(result.reasons.some(r => r.includes('Developer new-build properties are strictly ineligible'))).toBe(true);
  });

  it('approves self-build properties with audit notes', async () => {
    const result = await evaluateBUSEligibility({
      country: 'Wales',
      propertyStatus: 'Self-build',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'None',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('PASS');
    expect(result.grantAmount).toBe(7500);
    expect(result.notes.some(n => n.includes('Self-build eligible'))).toBe(true);
  });

  it('flags UNCERTAIN when previous grant status is unknown', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Gas Boiler',
      previousGovernmentGrant: 'Unknown'
    });

    expect(result.status).toBe('UNCERTAIN');
    expect(result.grantAmount).toBe(7500);
    expect(result.reasons.some(r => r.includes('UNCONFIRMED'))).toBe(true);
  });

  it('fails if property already received BUS grant', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Gas Boiler',
      previousGovernmentGrant: 'BUS'
    });

    expect(result.status).toBe('FAIL');
    expect(result.grantAmount).toBe(0);
  });

  it('assigns £2,500 grant category for residential air-to-air heat pump', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Gas Boiler',
      technologyType: 'Air-to-air',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('PASS');
    expect(result.busEligible).toBe(true);
    expect(result.grantCategory).toBe('AIR_TO_AIR_RESIDENTIAL_£2500');
    expect(result.grantAmount).toBe(2500);
  });

  it('assigns £7,500 standard grant for self-build off-gas property (does not qualify for £9,000 uplift)', async () => {
    const result = await evaluateBUSEligibility({
      country: 'Wales',
      propertyStatus: 'Self-build',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Oil Boiler',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('PASS');
    expect(result.busEligible).toBe(true);
    expect(result.grantCategory).toBe('STANDARD_AWHP_GSHP_£7500');
    expect(result.grantAmount).toBe(7500);
    expect(result.notes.some(n => n.includes('Self-build eligible'))).toBe(true);
  });

  it('assigns £7,500 standard grant for off-gas property replacing coal/electric', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Solid Fuel / Coal',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('PASS');
    expect(result.busEligible).toBe(true);
    expect(result.grantCategory).toBe('STANDARD_AWHP_GSHP_£7500');
    expect(result.grantAmount).toBe(7500);
  });

  it('routes to £9,000 uplift grant for off-gas LPG replacement', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'Bulk LPG Boiler',
      existingFuelType: 'Bulk LPG',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('PASS');
    expect(result.busEligible).toBe(true);
    expect(result.grantAmount).toBe(9000);
    expect(result.grantType).toBe('OFF_GAS_UPLIFT');
  });

  it('rejects properties located in Northern Ireland', async () => {
    const result = await evaluateBUSEligibility({
      country: 'Northern Ireland',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Oil Boiler',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('FAIL');
    expect(result.grantAmount).toBe(0);
    expect(result.reasons.some(r => r.includes('restricted to England and Wales'))).toBe(true);
  });

  it('rejects gas boiler + ASHP fossil hybrid system (£0 / INELIGIBLE)', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'gas boiler + ASHP hybrid',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('FAIL');
    expect(result.busEligible).toBe(false);
    expect(result.grantCategory).toBe('INELIGIBLE_FOSSIL_HYBRID');
    expect(result.grantAmount).toBe(0);
  });

  it('rejects oil boiler + ASHP fossil hybrid system (£0 / INELIGIBLE)', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'oil boiler + ASHP fossil hybrid',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('FAIL');
    expect(result.busEligible).toBe(false);
    expect(result.grantCategory).toBe('INELIGIBLE_FOSSIL_HYBRID');
    expect(result.grantAmount).toBe(0);
  });

  it('rejects LPG boiler + ASHP fossil hybrid system (£0 / INELIGIBLE)', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'Off gas grid',
      existingHeatingSystem: 'LPG boiler + ASHP fossil hybrid',
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('FAIL');
    expect(result.busEligible).toBe(false);
    expect(result.grantCategory).toBe('INELIGIBLE_FOSSIL_HYBRID');
    expect(result.grantAmount).toBe(0);
  });

  it('evaluates hybrid-capable ASHP installed standalone normally (£7,500 grant)', async () => {
    const result = await evaluateBUSEligibility({
      country: 'England',
      propertyStatus: 'Existing property',
      onOffGasGrid: 'On gas grid',
      existingHeatingSystem: 'Gas Boiler',
      technologyType: 'Air-to-water',
      isHybridSystem: false,
      previousGovernmentGrant: 'None'
    });

    expect(result.status).toBe('PASS');
    expect(result.busEligible).toBe(true);
    expect(result.grantAmount).toBe(7500);
  });
});
