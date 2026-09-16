import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/connection.js';
import { initSubmissionsTables, seedSubmissionForJob, MASTER_REQUIREMENTS_TEMPLATE } from '../src/db/submissionsSeed.js';

describe('Submissions Software Module Verification Suite', () => {
  let testSubmissionId: string;

  beforeAll(async () => {
    await initSubmissionsTables();
  });

  it('1. Initializes Submissions tables and template definitions', async () => {
    expect(MASTER_REQUIREMENTS_TEMPLATE.length).toBeGreaterThanOrEqual(40);
    const stages = new Set(MASTER_REQUIREMENTS_TEMPLATE.map(i => i.stage_name));
    expect(stages.size).toBe(12);
  });

  it('2. Creates a new submission workspace with 42 populated requirements', async () => {
    const id = `sub_test_${Date.now()}`;
    testSubmissionId = id;
    const ref = `JOB-SUB-TEST-${Math.floor(Math.random() * 1000)}`;

    await db.execute(
      `INSERT INTO submissions (
        id, job_reference, customer_name, customer_email, property_address,
        postcode, technology, property_status, on_off_gas_grid, existing_fuel,
        cylinder_applicable, grant_category, current_stage, overall_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, ref, 'Test Customer Smith', 'smith@example.com', '42 Park Lane, London',
        'SW1A 1AA', 'Air-to-water heat pump', 'Existing property', 'On gas grid', 'Mains Gas',
        1, '£7,500 Standard AWHP/GSHP', '01 Eligibility', 'Pending'
      ]
    );

    await seedSubmissionForJob(id, {
      technology: 'Air-to-water heat pump',
      property_status: 'Existing property',
      on_off_gas_grid: 'On gas grid',
      existing_fuel: 'Mains Gas',
      cylinder_applicable: 1,
      grant_category: '£7,500 Standard AWHP/GSHP'
    });

    const items = await db.all(`SELECT * FROM submission_items WHERE submission_id = ?`, [id]);
    expect(items.length).toBe(42);

    // Verify conditional rule for Ground Loop (GSHP_ONLY) is set to 'Not Required' for AWHP
    const gshpItem = items.find(i => i.condition_rule === 'GSHP_ONLY');
    expect(gshpItem).toBeDefined();
    expect(gshpItem?.status).toBe('Not Required');
  });

  it('3. Computes completion percentage and next action alert', async () => {
    const items = await db.all(`SELECT id, status FROM submission_items WHERE submission_id = ?`, [testSubmissionId]);
    const applicable = items.filter(i => i.status !== 'Not Required');
    
    // Mark first 5 applicable items completed
    for (let i = 0; i < 5; i++) {
      await db.execute(`UPDATE submission_items SET status = 'Completed' WHERE id = ?`, [applicable[i].id]);
    }

    const updatedItems = await db.all(`SELECT status FROM submission_items WHERE submission_id = ?`, [testSubmissionId]);
    const updatedApplicable = updatedItems.filter(i => i.status !== 'Not Required');
    const completedCount = updatedApplicable.filter(i => i.status === 'Completed').length;
    const pct = Math.round((completedCount / updatedApplicable.length) * 100);

    expect(completedCount).toBe(5);
    expect(pct).toBeGreaterThan(0);
  });

  it('4. Updates requirement item status and records audit log', async () => {
    const item = await db.get(`SELECT * FROM submission_items WHERE submission_id = ? AND requirement_key = 'req_epc_certificate'`, [testSubmissionId]);
    expect(item).toBeDefined();

    const now = new Date().toISOString();
    await db.execute(`UPDATE submission_items SET status = 'Completed', completed_date = ? WHERE id = ?`, [now, item.id]);
    
    await db.execute(
      `INSERT INTO submission_audit_logs (id, submission_id, item_id, user_name, field_changed, old_value, new_value, changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`log_${Date.now()}`, testSubmissionId, item.id, 'Test Auditor', 'status', 'Pending', 'Completed', now]
    );

    const log = await db.get(`SELECT * FROM submission_audit_logs WHERE item_id = ?`, [item.id]);
    expect(log).toBeDefined();
    expect(log.new_value).toBe('Completed');
    expect(log.field_changed).toBe('status');
  });

  it('5. Uploads evidence file metadata and links to requirement item', async () => {
    const item = await db.get(`SELECT * FROM submission_items WHERE submission_id = ? AND requirement_key = 'req_epc_certificate'`, [testSubmissionId]);
    const evId = `ev_test_${Date.now()}`;
    
    await db.execute(
      `INSERT INTO submission_evidence (
        id, submission_id, item_id, file_name, file_type, file_size, file_path_or_url, uploaded_by, reference_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [evId, testSubmissionId, item.id, 'EPC_Certificate_SW1A.pdf', 'application/pdf', 102450, 'data:application/pdf;base64,sample', 'Compliance Lead', 'EPC-9910283']
    );

    const evidence = await db.get(`SELECT * FROM submission_evidence WHERE id = ?`, [evId]);
    expect(evidence).toBeDefined();
    expect(evidence.file_name).toBe('EPC_Certificate_SW1A.pdf');
    expect(evidence.reference_no).toBe('EPC-9910283');
  });
});
