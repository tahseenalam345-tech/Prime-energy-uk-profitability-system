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
});
