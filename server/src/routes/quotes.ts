import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db/connection.js';
import { saveCalculationSnapshot, getCalculationSnapshot, verifyHistoricalSnapshotReproduction } from '../engine/snapshotEngine.js';
import { authenticateToken, optionalAuthenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { generateQuotationDocument } from '../services/quotationGenerator.js';

export const quotesRouter = Router();

function safeErrorResponse(res: Response, err: any, defaultMsg: string) {
  console.error(`[Quotes Router Error]:`, err);
  const msg = process.env.NODE_ENV === 'production' ? defaultMsg : (err.message || defaultMsg);
  res.status(500).json({ error: msg });
}

// GET all quotes (Authenticated Users Only)
quotesRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
    safeErrorResponse(res, err, 'Failed to fetch quotes');
  }
});

// GET single quote with line items (Authenticated Users Only)
quotesRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {

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
    safeErrorResponse(res, err, 'Failed to fetch quote');
  }
});

// SAVE a calculated quote and lock snapshot
quotesRouter.post('/', authenticateToken, requireRole('ADMIN', 'SALES', 'SURVEYOR', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { leadId, calculationResult } = req.body;
    const userId = req.user?.id || req.body.userId || 'user_sales';

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

    await db.batch(batchStatements, 'write');

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
    safeErrorResponse(res, err, 'Failed to save quote');
  }
});

// GET historical snapshot (Public Read-Only)
quotesRouter.get('/:id/snapshot', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {

  try {
    const snapshot = await getCalculationSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found for this quote' });
    }
    res.json({ snapshot });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to fetch snapshot');
  }
});

// VERIFY & REPRODUCE snapshot
quotesRouter.post('/:id/verify-snapshot', authenticateToken, requireRole('ADMIN', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await verifyHistoricalSnapshotReproduction(req.params.id);
    res.json(result);
  } catch (error: any) {
    safeErrorResponse(res, error, 'Snapshot verification failed');
  }
});

// COMMERCIAL OVERRIDE (ADMIN & ESTIMATOR ONLY)
quotesRouter.post('/:id/override', authenticateToken, requireRole('ADMIN', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reason, customerContributionOverride, targetMarginOverride } = req.body;
    const userId = req.user?.id || 'user_estimator';

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
          userId,
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
    safeErrorResponse(res, err, 'Failed to execute override');
  }
});

// GENERATE QUOTATION (Mode A)
quotesRouter.post('/generate-quotation', authenticateToken, requireRole('ADMIN', 'SALES', 'SURVEYOR', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { leadId, calculationResult, existingQuoteId } = req.body;
    const userId = req.user?.id || req.body.userId || 'user_sales';

    if (!leadId || !calculationResult) {
      return res.status(400).json({ error: 'leadId and calculationResult are required.' });
    }

    // 1. Validate customer & job information
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead record not found.' });
    }
    if (!lead.customer_name || lead.customer_name.trim().length === 0) {
      return res.status(400).json({ error: 'Customer Name is required to generate a formal quotation.' });
    }

    const prop = await db.get('SELECT * FROM properties WHERE lead_id = ?', [leadId]);
    if (!prop || !prop.address_line1 || !prop.postcode) {
      return res.status(400).json({ error: 'Installation Address (Address Line 1 and Postcode) is required to generate a formal quotation.' });
    }

    // 2. Save quote record or update existing
    let quoteId = existingQuoteId;
    let quoteRef = '';

    if (quoteId) {
      const existingQuote = await db.get('SELECT * FROM quotes WHERE id = ?', [quoteId]);
      if (existingQuote) {
        quoteRef = existingQuote.quote_reference;
      }
    }

    if (!quoteId || !quoteRef) {
      quoteId = `quote_${Date.now()}`;
      quoteRef = `PEQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

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
            calculationResult.mode || 'NEW_LEAD',
            calculationResult.costBreakdown?.totalJobCost || 0,
            calculationResult.bus?.grantAmount || 0,
            calculationResult.commercials?.requiredRevenue || 0,
            calculationResult.commercials?.customerContribution || 0,
            calculationResult.commercials?.actualRevenue || 0,
            calculationResult.commercials?.grossProfit || 0,
            calculationResult.commercials?.grossMarginPercent || 0,
            calculationResult.confidence?.score ?? null,
            calculationResult.confidence?.level || 'PRE-SURVEY',
            calculationResult.rating?.finalGrade || 'B',
            calculationResult.recommendation?.status || 'PROCEED',
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
            item.category || 'General',
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
        args: [calculationResult.mode === 'AFTER_SURVEY' ? 'QUOTED' : 'ESTIMATED', leadId]
      });

      await db.batch(batchStatements, 'write');

      await saveCalculationSnapshot({
        quoteId,
        quoteReference: quoteRef,
        userId,
        mode: calculationResult.mode || 'NEW_LEAD',
        inputs: { leadId, heatDemand: calculationResult.heatDemand },
        products: calculationResult.lineItems,
        prices: (calculationResult.lineItems || []).map((l: any) => ({ description: l.description, price: l.unitPriceExVat })),
        rulesetVersions: {
          bus: calculationResult.bus?.rulesetVersion || 1,
          commercialSettings: calculationResult.commercialSettingsUsed?.version || 1
        },
        commercialSettings: calculationResult.commercialSettingsUsed || {},
        outputs: calculationResult
      });
    }

    // 3. Generate Word DOCX & PDF
    const result = await generateQuotationDocument({
      quoteId,
      quoteReference: quoteRef,
      leadId,
      calculationResult,
      userId
    });

    res.json({
      success: true,
      quoteId: result.quoteId,
      quoteReference: result.quoteReference,
      pdfUrl: `/api/quotes/${result.quoteId}/pdf`,
      docxUrl: `/api/quotes/${result.quoteId}/docx`,
      validUntil: result.validUntil,
      generatedAt: result.generatedAt
    });

  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to generate quotation document');
  }
});

// GET PDF FOR PREVIEW / DOWNLOAD (Authenticated & Public Signed URLs)
quotesRouter.get('/:id/pdf', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quote = await db.get('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!quote || !quote.pdf_path) {
      return res.status(404).json({
        error: 'Quotation PDF not generated yet. Completed Word DOCX quotation is available.',
        isDocxAvailable: !!(quote && quote.docx_path && fs.existsSync(quote.docx_path)),
        docxUrl: quote ? `/api/quotes/${quote.id}/docx` : null
      });
    }

    if (!fs.existsSync(quote.pdf_path)) {
      return res.status(404).json({
        error: 'PDF file missing on server.',
        isDocxAvailable: !!(quote.docx_path && fs.existsSync(quote.docx_path)),
        docxUrl: `/api/quotes/${quote.id}/docx`
      });
    }

    // Verify binary header starts with %PDF
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(quote.pdf_path, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const isRealPdf = buffer.toString('utf8').startsWith('%PDF');

    if (!isRealPdf) {
      return res.status(422).json({
        error: 'PDF preview unavailable in current environment. Download the completed Word DOCX quotation below.',
        isDocxAvailable: true,
        docxUrl: `/api/quotes/${quote.id}/docx`
      });
    }

    const filename = `${quote.quote_reference || 'Quotation'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fs.createReadStream(quote.pdf_path).pipe(res);
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to serve PDF file');
  }
});

// GET DOCX FOR DOWNLOAD
quotesRouter.get('/:id/docx', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quote = await db.get('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!quote || !quote.docx_path) {
      return res.status(404).json({ error: 'Quotation DOCX not generated yet.' });
    }

    if (!fs.existsSync(quote.docx_path)) {
      return res.status(404).json({ error: 'DOCX file missing on server.' });
    }

    const filename = `${quote.quote_reference || 'Quotation'}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(quote.docx_path).pipe(res);
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to serve DOCX file');
  }
});

// REGENERATE QUOTATION
quotesRouter.post('/:id/regenerate', authenticateToken, requireRole('ADMIN', 'SALES', 'SURVEYOR', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { calculationResult } = req.body;
    const quoteId = req.params.id;
    const userId = req.user?.id || 'user_sales';

    const existingQuote = await db.get('SELECT * FROM quotes WHERE id = ?', [quoteId]);
    if (!existingQuote) {
      return res.status(404).json({ error: 'Quote not found for regeneration.' });
    }

    if (!calculationResult) {
      return res.status(400).json({ error: 'Latest calculationResult is required to regenerate quotation.' });
    }

    // Generate new quotation document
    const result = await generateQuotationDocument({
      quoteId,
      quoteReference: existingQuote.quote_reference,
      leadId: existingQuote.lead_id,
      calculationResult,
      userId
    });

    res.json({
      success: true,
      quoteId: result.quoteId,
      quoteReference: result.quoteReference,
      pdfUrl: `/api/quotes/${result.quoteId}/pdf`,
      docxUrl: `/api/quotes/${result.quoteId}/docx`,
      validUntil: result.validUntil,
      generatedAt: result.generatedAt
    });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to regenerate quotation');
  }
});

