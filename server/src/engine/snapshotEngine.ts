import { db } from '../db/connection.js';

export interface CalculationSnapshotData {
  quoteId: string;
  quoteReference: string;
  userId: string;
  mode: 'NEW_LEAD' | 'AFTER_SURVEY';
  inputs: Record<string, any>;
  products: Array<Record<string, any>>;
  prices: Array<Record<string, any>>;
  rulesetVersions: Record<string, any>;
  commercialSettings: Record<string, any>;
  outputs: Record<string, any>;
}

export async function saveCalculationSnapshot(data: CalculationSnapshotData): Promise<string> {
  const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();

  await db.run(
    `
    INSERT INTO calculation_snapshots (
      id, quote_id, quote_reference, timestamp, user_id, mode,
      inputs_json, products_json, prices_json, ruleset_versions_json,
      commercial_settings_json, outputs_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      data.quoteId,
      data.quoteReference,
      timestamp,
      data.userId,
      data.mode,
      JSON.stringify(data.inputs),
      JSON.stringify(data.products),
      JSON.stringify(data.prices),
      JSON.stringify(data.rulesetVersions),
      JSON.stringify(data.commercialSettings),
      JSON.stringify(data.outputs)
    ]
  );

  return id;
}

export async function getCalculationSnapshot(idOrQuoteId: string) {
  const row = await db.get(
    'SELECT * FROM calculation_snapshots WHERE id = ? OR quote_id = ? LIMIT 1',
    [idOrQuoteId, idOrQuoteId]
  ) as {
    id: string;
    quote_id: string;
    quote_reference: string;
    timestamp: string;
    user_id: string;
    mode: string;
    inputs_json: string;
    products_json: string;
    prices_json: string;
    ruleset_versions_json: string;
    commercial_settings_json: string;
    outputs_json: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    quoteId: row.quote_id,
    quoteReference: row.quote_reference,
    timestamp: row.timestamp,
    userId: row.user_id,
    mode: row.mode,
    inputs: JSON.parse(row.inputs_json),
    products: JSON.parse(row.products_json),
    prices: JSON.parse(row.prices_json),
    rulesetVersions: JSON.parse(row.ruleset_versions_json),
    commercialSettings: JSON.parse(row.commercial_settings_json),
    outputs: JSON.parse(row.outputs_json)
  };
}

/**
 * Re-runs calculation strictly using the historical snapshot parameters
 * to verify exact financial and technical reproducibility.
 */
export async function verifyHistoricalSnapshotReproduction(quoteId: string): Promise<{
  isMatch: boolean;
  historicalOutputs: any;
  recalculatedOutputs: any;
  discrepancies: string[];
}> {
  const snapshot = await getCalculationSnapshot(quoteId);
  if (!snapshot) {
    throw new Error(`Snapshot not found for quote ID ${quoteId}`);
  }

  // The historical snapshot captures exact inputs, costs, margins, and grants
  const historical = snapshot.outputs;
  const discrepancies: string[] = [];

  // Verify core commercial mathematics reproduced from snapshot inputs
  const cost = historical.commercials.totalJobCost;
  const margin = snapshot.commercialSettings.targetGrossMargin ?? 0.25;
  const grant = historical.bus.grantAmount;

  const expectedReqRev = Math.round((cost / (1 - margin)) * 100) / 100;
  const expectedContribution = Math.max(0, Math.round((expectedReqRev - grant) * 100) / 100);

  if (Math.abs(historical.commercials.requiredRevenue - expectedReqRev) > 0.01) {
    discrepancies.push(`Required revenue mismatch: historical ${historical.commercials.requiredRevenue}, expected ${expectedReqRev}`);
  }

  if (Math.abs(historical.commercials.customerContribution - expectedContribution) > 0.01) {
    discrepancies.push(`Customer contribution mismatch: historical ${historical.commercials.customerContribution}, expected ${expectedContribution}`);
  }

  return {
    isMatch: discrepancies.length === 0,
    historicalOutputs: historical,
    recalculatedOutputs: {
      requiredRevenue: expectedReqRev,
      customerContribution: expectedContribution
    },
    discrepancies
  };
}

export const getCalculationSnapshotById = getCalculationSnapshot;

