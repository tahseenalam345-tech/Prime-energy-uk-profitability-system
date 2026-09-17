import { Router, Response } from 'express';
import { db } from '../db/connection.js';
import { authenticateToken, optionalAuthenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

export const leadsRouter = Router();

function safeErrorResponse(res: Response, err: any, defaultMsg: string) {
  console.error(`[Leads Router Error]:`, err);
  const msg = process.env.NODE_ENV === 'production' ? defaultMsg : (err.message || defaultMsg);
  res.status(500).json({ error: msg });
}

// GET all leads (Authenticated Users Only)
leadsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = `
      SELECT 
        l.id, l.reference_no, l.customer_name, l.email, l.phone, l.lead_source, l.status, l.assigned_to, l.created_at,
        p.address_line1, p.postcode, p.country, p.epc_rating, p.epc_floor_area, p.property_type, p.property_status,
        p.bedrooms, p.bathrooms, p.boiler_type, p.cylinder_space, p.existing_pipework, p.on_off_gas_grid, p.sales_notes
      FROM leads l
      LEFT JOIN properties p ON l.id = p.lead_id
      ORDER BY l.created_at DESC
    `;
    const leads = await db.all(query);
    res.json({ leads });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to fetch leads');
  }
});

// GET single lead by ID (Authenticated Users Only)
leadsRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {

  try {
    const lead = await db.get(`
      SELECT 
        l.id, l.reference_no, l.customer_name, l.email, l.phone, l.lead_source, l.status, l.assigned_to, l.created_at,
        p.id as property_id, p.address_line1, p.address_line2, p.postcode, p.country, p.epc_rating, p.epc_floor_area,
        p.property_type, p.property_status, p.bedrooms, p.bathrooms, p.ownership, p.wall_insulation, p.roof_insulation,
        p.existing_heating_system, p.boiler_type, p.on_off_gas_grid, p.cylinder_space, p.existing_radiator_count,
        p.existing_radiator_details, p.existing_pipework, p.previous_government_grant, p.fuse_board_condition,
        p.conservation_area, p.boundary_planning_risk, p.listed_building, p.sales_notes
      FROM leads l
      LEFT JOIN properties p ON l.id = p.lead_id
      WHERE l.id = ?
    `, [req.params.id]);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const quotes = await db.all(`
      SELECT id, quote_reference, mode, total_job_cost, bus_grant, customer_contribution,
             gross_profit, gross_margin_percent, profitability_grade, confidence_level,
             commercial_recommendation, status, created_at
      FROM quotes
      WHERE lead_id = ?
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({ lead, quotes });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to fetch lead');
  }
});

// CREATE a new lead and property
leadsRouter.post('/', authenticateToken, requireRole('ADMIN', 'SALES', 'SURVEYOR', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const leadId = `lead_${Date.now()}`;
    const refNo = `PEL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const userId = req.user?.id || data.assignedTo || 'user_sales';

    await db.batch([
      {
        sql: `
          INSERT INTO leads (id, reference_no, customer_name, email, phone, lead_source, status, assigned_to, epc_source, epc_reference, epc_imported_at, epc_certificate_date, epc_selected_address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          leadId,
          refNo,
          data.customerName || 'Anonymous Customer',
          data.email || null,
          data.phone || null,
          data.leadSource || 'Manual Entry',
          'NEW',
          userId,
          data.epcSource || null,
          data.epcReference || null,
          data.epcImportedAt || null,
          data.epcCertificateDate || null,
          data.epcSelectedAddress || null
        ]
      },
      {
        sql: `
          INSERT INTO properties (
            id, lead_id, address_line1, address_line2, postcode, country,
            epc_rating, epc_floor_area, property_type, property_status,
            bedrooms, bathrooms, ownership, wall_insulation, roof_insulation,
            existing_heating_system, boiler_type, on_off_gas_grid,
            cylinder_space, existing_radiator_count, existing_radiator_details,
            existing_pipework, previous_government_grant, fuse_board_condition,
            conservation_area, boundary_planning_risk, listed_building, sales_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `prop_${Date.now()}`,
          leadId,
          data.addressLine1 || '',
          data.addressLine2 || null,
          data.postcode || '',
          data.country || 'England',
          data.epcRating || null,
          data.epcFloorArea || 100,
          data.propertyType || 'Semi detached',
          data.propertyStatus || 'Existing property',
          data.bedrooms || null,
          data.bathrooms || null,
          data.ownership || 'Owner-occupier',
          data.wallInsulation || 'Unknown',
          data.roofInsulation || 'Unknown',
          data.existingHeatingSystem || 'Gas Boiler',
          data.boilerType || 'Combi',
          data.onOffGasGrid || 'On gas grid',
          data.cylinderSpace || 'Unknown',
          data.existingRadiatorCount || null,
          data.existingRadiatorDetails || null,
          data.existingPipework || 'Standard 15mm+',
          data.previousGovernmentGrant || 'None',
          data.fuseBoardCondition || 'Modern',
          data.conservationArea || 'No',
          data.boundaryPlanningRisk || 'No',
          data.listedBuilding || 'No',
          data.salesNotes || null
        ]
      }
    ], 'write');

    res.status(201).json({ id: leadId, referenceNo: refNo });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to create lead');
  }
});

// UPDATE lead status and record audit log
leadsRouter.patch('/:id/status', authenticateToken, requireRole('ADMIN', 'SALES', 'SURVEYOR', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, reason } = req.body;
    const userId = req.user?.id || 'user_sales';
    const userName = req.user?.name || 'System User';

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const lead = await db.get('SELECT id, status, customer_name FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const oldStatus = lead.status;
    const newStatus = status;
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.batch([
      {
        sql: 'UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [newStatus, req.params.id]
      },
      {
        sql: `
          INSERT INTO audit_logs (id, user_id, user_name, entity_type, entity_id, action, old_values, new_values, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          auditId,
          userId,
          userName,
          'LEAD_STATUS',
          req.params.id,
          'UPDATE_STATUS',
          JSON.stringify({ status: oldStatus }),
          JSON.stringify({ status: newStatus }),
          reason || `Status changed from "${oldStatus}" to "${newStatus}"`
        ]
      }
    ], 'write');

    res.json({
      success: true,
      leadId: req.params.id,
      oldStatus,
      newStatus
    });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to update lead status');
  }
});

// UPDATE lead details
leadsRouter.put('/:id', authenticateToken, requireRole('ADMIN', 'SALES', 'SURVEYOR', 'ESTIMATOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leadId = req.params.id;
    const data = req.body;
    const userId = req.user?.id || 'user_sales';
    const userName = req.user?.name || 'System User';

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const prop = await db.get('SELECT * FROM properties WHERE lead_id = ?', [leadId]);
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const batchStmts: Array<{ sql: string; args?: any[] }> = [
      {
        sql: `
          UPDATE leads 
          SET customer_name = COALESCE(?, customer_name),
              email = COALESCE(?, email),
              phone = COALESCE(?, phone),
              status = COALESCE(?, status),
              assigned_to = COALESCE(?, assigned_to),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          data.customerName !== undefined ? data.customerName : null,
          data.email !== undefined ? data.email : null,
          data.phone !== undefined ? data.phone : null,
          data.status !== undefined ? data.status : null,
          data.assignedTo !== undefined ? data.assignedTo : null,
          leadId
        ]
      }
    ];

    if (prop) {
      batchStmts.push({
        sql: `
          UPDATE properties
          SET address_line1 = COALESCE(?, address_line1),
              postcode = COALESCE(?, postcode),
              property_type = COALESCE(?, property_type),
              epc_rating = COALESCE(?, epc_rating),
              sales_notes = COALESCE(?, sales_notes)
          WHERE lead_id = ?
        `,
        args: [
          data.addressLine1 !== undefined ? data.addressLine1 : null,
          data.postcode !== undefined ? data.postcode : null,
          data.propertyType !== undefined ? data.propertyType : null,
          data.epcRating !== undefined ? data.epcRating : null,
          data.salesNotes !== undefined ? data.salesNotes : null,
          leadId
        ]
      });
    }

    batchStmts.push({
      sql: `
        INSERT INTO audit_logs (id, user_id, user_name, entity_type, entity_id, action, old_values, new_values, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        auditId,
        userId,
        userName,
        'LEAD',
        leadId,
        'UPDATE',
        JSON.stringify({ customer_name: lead.customer_name, status: lead.status }),
        JSON.stringify({ customer_name: data.customerName, status: data.status }),
        data.reason || 'Lead updated'
      ]
    });

    await db.batch(batchStmts, 'write');

    res.json({ success: true, leadId });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to update lead');
  }
});

// DELETE a lead (Admin or Sales only)
leadsRouter.delete('/:id', authenticateToken, requireRole('ADMIN', 'SALES'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leadId = req.params.id;
    const userId = req.user?.id || 'user_sales';
    const userName = req.user?.name || 'System User';

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.batch([
      { sql: `DELETE FROM calculation_snapshots WHERE quote_id IN (SELECT id FROM quotes WHERE lead_id = ?)`, args: [leadId] },
      { sql: `DELETE FROM quote_line_items WHERE quote_id IN (SELECT id FROM quotes WHERE lead_id = ?)`, args: [leadId] },
      { sql: `DELETE FROM quotes WHERE lead_id = ?`, args: [leadId] },
      { sql: `DELETE FROM survey_design_inputs WHERE lead_id = ?`, args: [leadId] },
      { sql: `DELETE FROM properties WHERE lead_id = ?`, args: [leadId] },
      { sql: `DELETE FROM leads WHERE id = ?`, args: [leadId] },
      {
        sql: `
          INSERT INTO audit_logs (id, user_id, user_name, entity_type, entity_id, action, old_values, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          auditId,
          userId,
          userName,
          'LEAD',
          leadId,
          'DELETE',
          JSON.stringify(lead),
          `Deleted lead ${lead.reference_no} (${lead.customer_name})`
        ]
      }
    ], 'write');

    res.json({ success: true, leadId, referenceNo: lead.reference_no, customerName: lead.customer_name });
  } catch (err: any) {
    safeErrorResponse(res, err, 'Failed to delete lead');
  }
});
