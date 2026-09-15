import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { saveCalculationSnapshot, getCalculationSnapshot, verifyHistoricalSnapshotReproduction } from '../engine/snapshotEngine.js';

export const quotesRouter = Router();

// GET all quotes
quotesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        q.id, q.quote_reference, q.lead_id, q.mode, q.total_job_cost, q.bus_grant,
        q.required_revenue, q.customer_contribution, q.actual_revenue, q.gross_profit,
        q.gross_margin_percent, q.confidence_score, q.confidence_level, q.profitability_grade,
        q.commercial_recommendation, q.status, q.manual_override, q.created_by, q.created_at,
        l.customer_name, p.address_line1, p.postcode
      FROM quotes q
      JOIN leads l ON q.lead_id = l.id
      LEFT JOIN properties p ON l.id = p.lead_id
      ORDER BY q.created_at DESC
    `;
    const quotes = await db.all(query);
    res.json({ quotes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch quotes' });
  }
});

// GET single quote with line items
quotesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const quote = await db.get(`
      SELECT 
        q.*, l.customer_name, l.email as customer_email, l.phone as customer_phone,
        p.address_line1, p.address_line2, p.postcode, p.country, p.property_type, p.epc_floor_area
      FROM quotes q
      JOIN leads l ON q.lead_id = l.id
      LEFT JOIN properties p ON l.id = p.lead_id
      WHERE q.id = ?
    `, [req.params.id]);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const lineItems = await db.all('SELECT * FROM quote_line_items WHERE quote_id = ?', [req.params.id]);
    const snapshot = await getCalculationSnapshot(req.params.id);

    res.json({ quote, lineItems, hasSnapshot: !!snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch quote' });
  }
});

// SAVE a calculated quote and lock snapshot
quotesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const contentLength = req.headers['content-length'];
    console.log(`[Server POST /api/quotes] Received Request - Content-Length: ${contentLength} bytes (${contentLength ? (Number(contentLength) / 1024).toFixed(2) : 0} KB)`);
    const { leadId, calculationResult, userId = 'user_sales' } = req.body;

    if (!leadId || !calculationResult) {
      return res.status(400).json({ error: 'leadId and calculationResult are required.' });
    }

    const quoteId = `quote_${Date.now()}`;
    const quoteRef = `PEQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const batchStatements: Array<{ sql: string; args?: any[] }> = [
      {
        sql: `
          INSERT INTO quotes (
            id, quote_reference, lead_id, mode, total_job_cost, bus_grant,
            required_revenue, customer_contribution, actual_revenue, gross_profit,
            gross_margin_percent, confidence_score, confidence_level, profitability_grade,
            commercial_recommendation, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          quoteId,
          quoteRef,
          leadId,
          calculationResult.mode,
          calculationResult.costBreakdown.totalJobCost,
          calculationResult.bus.grantAmount,
          calculationResult.commercials.requiredRevenue,
          calculationResult.commercials.customerContribution,
          calculationResult.commercials.actualRevenue,
          calculationResult.commercials.grossProfit,
          calculationResult.commercials.grossMarginPercent,
          calculationResult.confidence?.score ?? null,
          calculationResult.confidence?.level || calculationResult.confidenceDisplay || 'SURVEY-CONFIRMED',
          calculationResult.rating.finalGrade,
          calculationResult.recommendation.status,
          'DRAFT',
          userId
        ]
      }
    ];

    for (const item of calculationResult.lineItems || []) {
      batchStatements.push({
        sql: `
          INSERT INTO quote_line_items (
            id, quote_id, category, description, quantity,
            unit_cost_ex_vat, total_cost_ex_vat, vat_rate, total_cost_inc_vat
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          quoteId,
          item.category,
          item.description,
          item.quantity || 1,
          item.unitPriceExVat || 0,
          item.totalPriceExVat || 0,
          0.00,
          item.totalPriceExVat || 0
        ]
      });
    }

    batchStatements.push({
      sql: 'UPDATE leads SET status = ? WHERE id = ?',
      args: [
        calculationResult.mode === 'AFTER_SURVEY' ? 'QUOTED' : 'ESTIMATED',
        leadId
      ]
    });

    batchStatements.push({
      sql: `
        INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, new_values, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        `audit_${Date.now()}`,
        userId,
        'QUOTE',
        quoteId,
        'CREATE',
        JSON.stringify({ quoteRef, totalCost: calculationResult.costBreakdown.totalJobCost, margin: calculationResult.commercials.grossMarginPercent }),
        `Generated and locked immutable quote snapshot ${quoteRef}`
      ]
    });

    // Execute atomic quote creation
    await db.batch(batchStatements, 'write');

    // Save calculation snapshot
    const snapshotId = await saveCalculationSnapshot({
      quoteId,
      quoteReference: quoteRef,
      userId,
      mode: calculationResult.mode,
      inputs: {
        leadId,
        heatDemand: calculationResult.heatDemand,
        designConditions: calculationResult.designConditions,
        confirmedDesignHeatLossKw: calculationResult.confirmedDesignHeatLossKw
      },
      products: calculationResult.lineItems,
      prices: (calculationResult.lineItems || []).map((l: any) => ({ description: l.description, price: l.unitPriceExVat })),
      rulesetVersions: {
        bus: calculationResult.bus.rulesetVersion,
        commercialSettings: calculationResult.commercialSettingsUsed.version
      },
      commercialSettings: calculationResult.commercialSettingsUsed,
      outputs: calculationResult
    });

    res.status(201).json({ quoteId, quoteReference: quoteRef, snapshotId });
  } catch (err: any) {
    console.error('[Server POST /api/quotes Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to save quote' });
  }
});

// GET historical snapshot
quotesRouter.get('/:id/snapshot', async (req: Request, res: Response) => {
  try {
    const snapshot = await getCalculationSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found for this quote' });
    }
    res.json({ snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch snapshot' });
  }
});

// VERIFY & REPRODUCE snapshot
quotesRouter.post('/:id/verify-snapshot', async (req: Request, res: Response) => {
  try {
    const result = await verifyHistoricalSnapshotReproduction(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// COMMERCIAL OVERRIDE (Estimator / Manager only)
quotesRouter.post('/:id/override', async (req: Request, res: Response) => {
  try {
    const { userId, reason, customerContributionOverride, targetMarginOverride } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'A valid commercial justification reason is required for manual overrides.' });
    }

    const quote = await db.get('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const oldValues = {
      customerContribution: quote.customer_contribution,
      grossMarginPercent: quote.gross_margin_percent,
      actualRevenue: quote.actual_revenue,
      grossProfit: quote.gross_profit
    };

    const cost = quote.total_job_cost;
    const grant = quote.bus_grant;

    let newContribution = quote.customer_contribution;
    if (customerContributionOverride !== undefined) {
      newContribution = Number(customerContributionOverride);
    } else if (targetMarginOverride !== undefined) {
      const targetMargin = Number(targetMarginOverride);
      const reqRev = Math.round((cost / (1 - targetMargin)) * 100) / 100;
      newContribution = Math.max(0, Math.round((reqRev - grant) * 100) / 100);
    }

    const newRevenue = Math.round((grant + newContribution) * 100) / 100;
    const newProfit = Math.round((newRevenue - cost) * 100) / 100;
    const newMarginPercent = newRevenue > 0 ? Math.round(((newProfit / newRevenue) * 100) * 100) / 100 : 0;

    await db.batch([
      {
        sql: `
          UPDATE quotes
          SET customer_contribution = ?,
              actual_revenue = ?,
              gross_profit = ?,
              gross_margin_percent = ?,
              manual_override = 1,
              override_reason = ?
          WHERE id = ?
        `,
        args: [newContribution, newRevenue, newProfit, newMarginPercent, reason, req.params.id]
      },
      {
        sql: `
          INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_values, new_values, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `audit_${Date.now()}`,
          userId || 'user_estimator',
          'QUOTE',
          req.params.id,
          'OVERRIDE',
          JSON.stringify(oldValues),
          JSON.stringify({ newContribution, newRevenue, newProfit, newMarginPercent }),
          reason
        ]
      }
    ], 'write');

    res.json({
      success: true,
      overriddenQuote: {
        id: req.params.id,
        customerContribution: newContribution,
        actualRevenue: newRevenue,
        grossProfit: newProfit,
        grossMarginPercent: newMarginPercent,
        manualOverride: 1,
        overrideReason: reason
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute override' });
  }
});
