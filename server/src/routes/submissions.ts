import { Router } from 'express';
import { db } from '../db/connection.js';
import { initSubmissionsTables, seedSubmissionForJob, MASTER_REQUIREMENTS_TEMPLATE } from '../db/submissionsSeed.js';

export const submissionsRouter = Router();

// Ensure DB tables are initialized
let tablesInitialized = false;
async function ensureTables() {
  if (!tablesInitialized) {
    await initSubmissionsTables();
    tablesInitialized = true;
  }
}

// 1. GET /api/submissions/summary - Summary Counters for Dashboard
submissionsRouter.get('/summary', async (req, res) => {
  try {
    await ensureTables();
    const allSubmissions = await db.all(`SELECT id, overall_status, completion_percentage, current_stage, updated_at FROM submissions`);
    
    const summary = {
      totalActive: allSubmissions.filter(s => s.overall_status !== 'Completed' && s.overall_status !== 'Rejected').length,
      totalCount: allSubmissions.length,
      pending: allSubmissions.filter(s => s.overall_status === 'Pending').length,
      inProgress: allSubmissions.filter(s => s.overall_status === 'In Progress').length,
      awaitingCustomer: allSubmissions.filter(s => s.overall_status === 'Awaiting Customer').length,
      awaitingOfgem: allSubmissions.filter(s => s.overall_status === 'Awaiting Ofgem').length,
      awaitingMcs: allSubmissions.filter(s => s.overall_status === 'Awaiting MCS').length,
      completed: allSubmissions.filter(s => s.overall_status === 'Completed').length,
      overdue: 0 // Computed dynamically if item due dates passed
    };

    // Calculate overdue items count across active submissions
    const items = await db.all(`
      SELECT item.due_date, item.status, item.submission_id 
      FROM submission_items item
      JOIN submissions s ON item.submission_id = s.id
      WHERE item.due_date IS NOT NULL 
        AND item.due_date < DATE('now')
        AND item.status NOT IN ('Completed', 'Not Required', 'Superseded', 'Rejected')
        AND s.overall_status NOT IN ('Completed', 'Rejected')
    `);
    summary.overdue = new Set(items.map(i => i.submission_id)).size;

    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch submissions summary' });
  }
});

// 2. GET /api/submissions - Search & List Submissions
submissionsRouter.get('/', async (req, res) => {
  try {
    await ensureTables();
    const { search, stage, status, technology } = req.query;

    let sql = `SELECT * FROM submissions WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      const q = `%${search}%`;
      sql += ` AND (job_reference LIKE ? OR customer_name LIKE ? OR property_address LIKE ? OR postcode LIKE ?)`;
      params.push(q, q, q, q);
    }

    if (stage) {
      sql += ` AND current_stage = ?`;
      params.push(stage);
    }

    if (status) {
      sql += ` AND overall_status = ?`;
      params.push(status);
    }

    if (technology) {
      sql += ` AND technology = ?`;
      params.push(technology);
    }

    sql += ` ORDER BY updated_at DESC`;

    const submissions = await db.all(sql, params);
    
    // Auto-recalculate completion percentage & next action for each list item if needed
    for (const sub of submissions) {
      const items = await db.all(
        `SELECT status, title, due_date FROM submission_items WHERE submission_id = ?`,
        [sub.id]
      );
      if (items.length > 0) {
        const applicable = items.filter(i => i.status !== 'Not Required' && i.status !== 'Superseded');
        const completed = applicable.filter(i => i.status === 'Completed').length;
        const pct = applicable.length > 0 ? Math.round((completed / applicable.length) * 100) : 0;
        sub.completion_percentage = pct;

        // Find next action alert item
        const nextItem = applicable.find(i => i.status === 'Pending' || i.status === 'In Progress' || i.status === 'Awaiting Customer' || i.status === 'Awaiting Ofgem');
        if (nextItem) {
          sub.next_action = `${nextItem.status.toUpperCase()}: ${nextItem.title}`;
        }
      }
    }

    res.json(submissions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list submissions' });
  }
});

// 3. POST /api/submissions - Create New Submission
submissionsRouter.post('/', async (req, res) => {
  try {
    await ensureTables();
    const {
      job_reference,
      lead_id,
      customer_name,
      customer_email,
      customer_phone,
      property_address,
      postcode,
      country,
      technology,
      property_status,
      on_off_gas_grid,
      existing_fuel,
      cylinder_applicable,
      grant_category,
      assigned_to,
      notes
    } = req.body;

    if (!customer_name || !property_address) {
      return res.status(400).json({ error: 'Customer name and property address are required' });
    }

    const id = `sub_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const ref = job_reference || `SUB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    // Set statutory 6-year retention date
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 6);
    const retentionStr = retentionDate.toISOString().split('T')[0];

    await db.execute(
      `INSERT INTO submissions (
        id, job_reference, lead_id, customer_name, customer_email, customer_phone,
        property_address, postcode, country, technology, property_status, on_off_gas_grid,
        existing_fuel, cylinder_applicable, grant_category, current_stage, overall_status,
        completion_percentage, next_action, assigned_to, notes, six_year_retention_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, ref, lead_id || null, customer_name, customer_email || null, customer_phone || null,
        property_address, postcode || null, country || 'England', technology || 'Air-to-water heat pump',
        property_status || 'Existing property', on_off_gas_grid || 'On gas grid',
        existing_fuel || 'Mains Gas', cylinder_applicable !== undefined ? Number(cylinder_applicable) : 1,
        grant_category || '£7,500 Standard AWHP/GSHP', '01 Eligibility', 'Pending',
        0.0, 'Complete pre-check eligibility', assigned_to || 'Sales Team', notes || null,
        retentionStr, now, now
      ]
    );

    // Populate master 42 requirements for this submission
    await seedSubmissionForJob(id, {
      technology: technology || 'Air-to-water heat pump',
      property_status: property_status || 'Existing property',
      on_off_gas_grid: on_off_gas_grid || 'On gas grid',
      existing_fuel: existing_fuel || 'Mains Gas',
      cylinder_applicable: cylinder_applicable !== undefined ? Number(cylinder_applicable) : 1,
      grant_category: grant_category || '£7,500 Standard AWHP/GSHP'
    });

    const newSub = await db.get(`SELECT * FROM submissions WHERE id = ?`, [id]);
    res.status(201).json(newSub);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create submission workspace' });
  }
});

// 4. GET /api/submissions/guide-book - Submission Guide / Master Book Data
submissionsRouter.get('/guide-book', async (req, res) => {
  try {
    res.json({
      stages: [
        '01 Eligibility', '02 Pre-Installation', '03 Survey', '04 Design',
        '05 Customer Documents', '06 BUS', '07 MCS', '08 Installation',
        '09 Commissioning', '10 Handover', '11 Redemption', '12 Audit File'
      ],
      items: MASTER_REQUIREMENTS_TEMPLATE
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load submission book data' });
  }
});

// 5. GET /api/submissions/:id - Workspace Details with 12 Stages & Items
submissionsRouter.get('/:id', async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    const submission = await db.get(`SELECT * FROM submissions WHERE id = ?`, [id]);

    if (!submission) {
      return res.status(404).json({ error: 'Submission workspace not found' });
    }

    // Fetch all items for this submission
    const items = await db.all(
      `SELECT * FROM submission_items WHERE submission_id = ? ORDER BY sort_order ASC, created_at ASC`,
      [id]
    );

    // Fetch all evidence files for this submission
    const evidenceFiles = await db.all(
      `SELECT * FROM submission_evidence WHERE submission_id = ? ORDER BY uploaded_at DESC`,
      [id]
    );

    // Group items by 12 stages & compute stage statistics
    const stagesList = [
      { code: '01_eligibility', name: '01 Eligibility' },
      { code: '02_pre_installation', name: '02 Pre-Installation' },
      { code: '03_survey', name: '03 Survey' },
      { code: '04_design', name: '04 Design' },
      { code: '05_customer_documents', name: '05 Customer Documents' },
      { code: '06_bus', name: '06 BUS' },
      { code: '07_mcs', name: '07 MCS' },
      { code: '08_installation', name: '08 Installation' },
      { code: '09_commissioning', name: '09 Commissioning' },
      { code: '10_handover', name: '10 Handover' },
      { code: '11_redemption', name: '11 Redemption' },
      { code: '12_audit_file', name: '12 Audit File' }
    ];

    const stages = stagesList.map(stg => {
      const stageItems = items.filter(i => i.stage_code === stg.code);
      const applicable = stageItems.filter(i => i.status !== 'Not Required' && i.status !== 'Superseded');
      const completed = applicable.filter(i => i.status === 'Completed').length;
      const pct = applicable.length > 0 ? Math.round((completed / applicable.length) * 100) : 0;
      
      let stageStatus = 'Pending';
      if (applicable.length === 0) {
        stageStatus = 'Not Required';
      } else if (completed === applicable.length) {
        stageStatus = 'Completed';
      } else if (stageItems.some(i => i.status === 'Rejected')) {
        stageStatus = 'Blocked';
      } else if (stageItems.some(i => i.status === 'In Progress' || i.status === 'Awaiting Customer' || i.status === 'Awaiting Ofgem' || i.status === 'Awaiting MCS')) {
        stageStatus = 'In Progress';
      }

      return {
        code: stg.code,
        name: stg.name,
        itemsCount: stageItems.length,
        applicableCount: applicable.length,
        completedCount: completed,
        completionPercentage: pct,
        status: stageStatus,
        items: stageItems.map(item => ({
          ...item,
          evidenceCount: evidenceFiles.filter(e => e.item_id === item.id).length
        }))
      };
    });

    // Compute overall workspace stats
    const allApplicable = items.filter(i => i.status !== 'Not Required' && i.status !== 'Superseded');
    const totalCompleted = allApplicable.filter(i => i.status === 'Completed').length;
    const overallPct = allApplicable.length > 0 ? Math.round((totalCompleted / allApplicable.length) * 100) : 0;
    
    const awaitingCustomerCount = items.filter(i => i.status === 'Awaiting Customer').length;
    const awaitingOfgemCount = items.filter(i => i.status === 'Awaiting Ofgem').length;
    const awaitingMcsCount = items.filter(i => i.status === 'Awaiting MCS').length;
    const overdueCount = items.filter(i => i.due_date && i.due_date < new Date().toISOString().split('T')[0] && i.status !== 'Completed' && i.status !== 'Not Required').length;

    // Next Action Alert Determination
    const pendingItem = allApplicable.find(i => i.status === 'Awaiting Ofgem' || i.status === 'Awaiting Customer' || i.status === 'In Progress' || i.status === 'Pending');
    let nextActionMsg = 'All submission items completed!';
    if (pendingItem) {
      nextActionMsg = `${pendingItem.status === 'Awaiting Customer' ? 'WAITING ON CUSTOMER' : pendingItem.status === 'Awaiting Ofgem' ? 'WAITING ON OFGEM' : 'NEXT ACTION'}: ${pendingItem.title}`;
    }

    // Update submission cached pct if changed
    if (submission.completion_percentage !== overallPct || submission.next_action !== nextActionMsg) {
      await db.execute(
        `UPDATE submissions SET completion_percentage = ?, next_action = ?, updated_at = ? WHERE id = ?`,
        [overallPct, nextActionMsg, new Date().toISOString(), id]
      );
      submission.completion_percentage = overallPct;
      submission.next_action = nextActionMsg;
    }

    res.json({
      ...submission,
      overallCompletionPercentage: overallPct,
      stats: {
        totalItems: items.length,
        applicableItems: allApplicable.length,
        completedItems: totalCompleted,
        awaitingCustomer: awaitingCustomerCount,
        awaitingOfgem: awaitingOfgemCount,
        awaitingMcs: awaitingMcsCount,
        overdueItems: overdueCount
      },
      stages,
      evidenceFiles
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch submission workspace details' });
  }
});

// 6. PATCH /api/submissions/:id - Update Submission Metadata
submissionsRouter.patch('/:id', async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    const {
      technology,
      property_status,
      on_off_gas_grid,
      existing_fuel,
      cylinder_applicable,
      grant_category,
      installation_date,
      commissioning_date,
      bus_voucher_reference,
      bus_voucher_expiry,
      mcs_certificate_number,
      current_stage,
      overall_status,
      assigned_to,
      notes
    } = req.body;

    const sub = await db.get(`SELECT * FROM submissions WHERE id = ?`, [id]);
    if (!sub) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const now = new Date().toISOString();
    await db.execute(
      `UPDATE submissions SET
        technology = COALESCE(?, technology),
        property_status = COALESCE(?, property_status),
        on_off_gas_grid = COALESCE(?, on_off_gas_grid),
        existing_fuel = COALESCE(?, existing_fuel),
        cylinder_applicable = COALESCE(?, cylinder_applicable),
        grant_category = COALESCE(?, grant_category),
        installation_date = COALESCE(?, installation_date),
        commissioning_date = COALESCE(?, commissioning_date),
        bus_voucher_reference = COALESCE(?, bus_voucher_reference),
        bus_voucher_expiry = COALESCE(?, bus_voucher_expiry),
        mcs_certificate_number = COALESCE(?, mcs_certificate_number),
        current_stage = COALESCE(?, current_stage),
        overall_status = COALESCE(?, overall_status),
        assigned_to = COALESCE(?, assigned_to),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?`,
      [
        technology ?? null, property_status ?? null, on_off_gas_grid ?? null, existing_fuel ?? null,
        cylinder_applicable !== undefined ? Number(cylinder_applicable) : null, grant_category ?? null,
        installation_date ?? null, commissioning_date ?? null, bus_voucher_reference ?? null,
        bus_voucher_expiry ?? null, mcs_certificate_number ?? null, current_stage ?? null,
        overall_status ?? null, assigned_to ?? null, notes ?? null, now, id
      ]
    );

    // Update conditional rules on items if tech / cylinder / uplift changed
    const isGshp = (technology || sub.technology || '').toLowerCase().includes('ground');
    const isSelfBuild = (property_status || sub.property_status || '').toLowerCase().includes('self-build');
    const gasGrid = on_off_gas_grid || sub.on_off_gas_grid || '';
    const fuel = existing_fuel || sub.existing_fuel || '';
    const grant = grant_category || sub.grant_category || '';
    const isOffGasUplift = grant.includes('£9,000') || (gasGrid.toLowerCase().includes('off') && ['Heating Oil', 'Bulk LPG'].includes(fuel));
    const cylApplicable = cylinder_applicable !== undefined ? Number(cylinder_applicable) === 1 : sub.cylinder_applicable === 1;

    // Update items with conditional status rules
    const items = await db.all(`SELECT id, condition_rule, status FROM submission_items WHERE submission_id = ? AND is_conditional = 1`, [id]);
    for (const item of items) {
      let targetStatus = item.status;
      if (item.condition_rule === 'GSHP_ONLY') {
        targetStatus = isGshp ? (item.status === 'Not Required' ? 'Pending' : item.status) : 'Not Required';
      } else if (item.condition_rule === 'SELF_BUILD_ONLY') {
        targetStatus = isSelfBuild ? (item.status === 'Not Required' ? 'Pending' : item.status) : 'Not Required';
      } else if (item.condition_rule === 'OFF_GAS_UPLIFT_ONLY') {
        targetStatus = isOffGasUplift ? (item.status === 'Not Required' ? 'Pending' : item.status) : 'Not Required';
      } else if (item.condition_rule === 'CYLINDER_ONLY') {
        targetStatus = cylApplicable ? (item.status === 'Not Required' ? 'Pending' : item.status) : 'Not Required';
      }

      if (targetStatus !== item.status) {
        await db.execute(`UPDATE submission_items SET status = ?, updated_at = ? WHERE id = ?`, [targetStatus, now, item.id]);
      }
    }

    const updated = await db.get(`SELECT * FROM submissions WHERE id = ?`, [id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update submission' });
  }
});

// 7. GET /api/submissions/:id/items/:itemId - Detailed Requirement View
submissionsRouter.get('/:id/items/:itemId', async (req, res) => {
  try {
    await ensureTables();
    const { id, itemId } = req.params;
    const item = await db.get(`SELECT * FROM submission_items WHERE id = ? AND submission_id = ?`, [itemId, id]);

    if (!item) {
      return res.status(404).json({ error: 'Requirement item not found' });
    }

    const evidenceFiles = await db.all(`SELECT * FROM submission_evidence WHERE item_id = ? ORDER BY uploaded_at DESC`, [itemId]);
    const auditLogs = await db.all(`SELECT * FROM submission_audit_logs WHERE item_id = ? ORDER BY changed_at DESC`, [itemId]);

    res.json({
      ...item,
      evidenceFiles,
      auditLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch item detail' });
  }
});

// 8. PATCH /api/submissions/:id/items/:itemId - Update Item Status & Fields
submissionsRouter.patch('/:id/items/:itemId', async (req, res) => {
  try {
    await ensureTables();
    const { id, itemId } = req.params;
    const {
      status,
      due_date,
      completed_date,
      responsible_person,
      reviewer_person,
      reference_number,
      customer_signature_type,
      notes,
      user_id,
      user_name
    } = req.body;

    const oldItem = await db.get(`SELECT * FROM submission_items WHERE id = ? AND submission_id = ?`, [itemId, id]);
    if (!oldItem) {
      return res.status(404).json({ error: 'Requirement item not found' });
    }

    const now = new Date().toISOString();
    const newCompletedDate = status === 'Completed' ? (completed_date || now.split('T')[0]) : (status !== oldItem.status ? null : oldItem.completed_date);

    await db.execute(
      `UPDATE submission_items SET
        status = COALESCE(?, status),
        due_date = COALESCE(?, due_date),
        completed_date = ?,
        responsible_person = COALESCE(?, responsible_person),
        reviewer_person = COALESCE(?, reviewer_person),
        reference_number = COALESCE(?, reference_number),
        customer_signature_type = COALESCE(?, customer_signature_type),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ? AND submission_id = ?`,
      [
        status ?? null, due_date ?? null, newCompletedDate,
        responsible_person ?? null, reviewer_person ?? null, reference_number ?? null,
        customer_signature_type ?? null, notes ?? null, now, itemId, id
      ]
    );

    // Record Audit Log Entry for changes
    if (status && status !== oldItem.status) {
      const logId = `sub_log_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      await db.execute(
        `INSERT INTO submission_audit_logs (id, submission_id, item_id, user_id, user_name, field_changed, old_value, new_value, notes, changed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId, id, itemId, user_id || 'system', user_name || 'System User',
          'status', oldItem.status, status, notes || `Status updated to ${status}`, now
        ]
      );
    }

    const updatedItem = await db.get(`SELECT * FROM submission_items WHERE id = ?`, [itemId]);
    const evidenceFiles = await db.all(`SELECT * FROM submission_evidence WHERE item_id = ? ORDER BY uploaded_at DESC`, [itemId]);
    const auditLogs = await db.all(`SELECT * FROM submission_audit_logs WHERE item_id = ? ORDER BY changed_at DESC`, [itemId]);

    res.json({
      ...updatedItem,
      evidenceFiles,
      auditLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update item' });
  }
});

// 9. POST /api/submissions/:id/items/:itemId/evidence - Upload Evidence File
submissionsRouter.post('/:id/items/:itemId/evidence', async (req, res) => {
  try {
    await ensureTables();
    const { id, itemId } = req.params;
    const { file_name, file_type, file_size, file_data_url, reference_no, uploaded_by, notes } = req.body;

    if (!file_name || !file_data_url) {
      return res.status(400).json({ error: 'File name and file content URL are required' });
    }

    const evidenceId = `ev_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO submission_evidence (
        id, submission_id, item_id, file_name, file_type, file_size,
        file_path_or_url, reference_no, uploaded_by, notes, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        evidenceId, id, itemId, file_name, file_type || 'application/pdf', file_size || 0,
        file_data_url, reference_no || null, uploaded_by || 'Staff User', notes || null, now
      ]
    );

    // If item was pending, set to In Progress or Completed evidence status
    const item = await db.get(`SELECT status FROM submission_items WHERE id = ?`, [itemId]);
    if (item && item.status === 'Pending') {
      await db.execute(`UPDATE submission_items SET status = 'In Progress', updated_at = ? WHERE id = ?`, [now, itemId]);
    }

    // Log audit trail
    const logId = `sub_log_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    await db.execute(
      `INSERT INTO submission_audit_logs (id, submission_id, item_id, user_id, user_name, field_changed, old_value, new_value, notes, changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId, id, itemId, uploaded_by || 'system', uploaded_by || 'Staff User',
        'evidence_upload', null, file_name, `Uploaded evidence file: ${file_name}`, now
      ]
    );

    const uploadedEvidence = await db.get(`SELECT * FROM submission_evidence WHERE id = ?`, [evidenceId]);
    res.status(201).json(uploadedEvidence);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to upload evidence' });
  }
});

// 10. DELETE /api/submissions/:id/items/:itemId/evidence/:evidenceId - Delete Evidence File
submissionsRouter.delete('/:id/items/:itemId/evidence/:evidenceId', async (req, res) => {
  try {
    await ensureTables();
    const { id, itemId, evidenceId } = req.params;
    const file = await db.get(`SELECT * FROM submission_evidence WHERE id = ? AND item_id = ?`, [evidenceId, itemId]);

    if (!file) {
      return res.status(404).json({ error: 'Evidence file not found' });
    }

    await db.execute(`DELETE FROM submission_evidence WHERE id = ?`, [evidenceId]);

    const now = new Date().toISOString();
    const logId = `sub_log_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    await db.execute(
      `INSERT INTO submission_audit_logs (id, submission_id, item_id, user_id, user_name, field_changed, old_value, new_value, notes, changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId, id, itemId, 'system', 'Staff User',
        'evidence_delete', file.file_name, null, `Deleted evidence file: ${file.file_name}`, now
      ]
    );

    res.json({ success: true, deletedId: evidenceId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete evidence' });
  }
});
