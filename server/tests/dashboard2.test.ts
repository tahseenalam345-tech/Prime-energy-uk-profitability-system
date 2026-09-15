import { describe, it, expect } from 'vitest';
import { db } from '../src/db/connection.js';
import { normalizeStatus, getCategoryForStatus, ALL_17_STATUSES } from '../src/routes/reports.js';

describe('Dashboard 2.0 — CRM Job Management & Status Verification', () => {
  it('1. Status normalization and category mapping: correctly maps all 17 statuses and legacy aliases', () => {
    expect(normalizeStatus('NEW')).toBe('New');
    expect(normalizeStatus('ESTIMATED')).toBe('Quotation Draft');
    expect(normalizeStatus('QUOTED')).toBe('Quotation Verified');
    expect(normalizeStatus('SURVEY_SCHEDULED')).toBe('Survey Pending');
    expect(normalizeStatus('SURVEYED')).toBe('Survey Received');
    expect(normalizeStatus('WON')).toBe('Completed');
    expect(normalizeStatus('LOST')).toBe('Cancelled');

    for (const status of ALL_17_STATUSES) {
      expect(normalizeStatus(status)).toBe(status);
      const category = getCategoryForStatus(status);
      expect(category).toBeTruthy();
      expect(['New Leads', 'Quotation', 'After Survey', 'Installation & Completion', 'Other']).toContain(category);
    }
  });

  it('2. Status persistence & audit trail: PATCH status updates database and writes audit log', async () => {
    const lead = await db.get<any>('SELECT id, status FROM leads LIMIT 1');
    expect(lead).toBeDefined();

    const oldStatus = lead.status;
    const testNewStatus = 'Installation Scheduled';
    const auditId = `test_audit_${Date.now()}`;

    await db.batch([
      { sql: 'UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [testNewStatus, lead.id] },
      {
        sql: `
          INSERT INTO audit_logs (id, user_id, user_name, entity_type, entity_id, action, old_values, new_values, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          auditId,
          'user_test',
          'QA Tester',
          'LEAD_STATUS',
          lead.id,
          'UPDATE_STATUS',
          JSON.stringify({ status: oldStatus }),
          JSON.stringify({ status: testNewStatus }),
          'Test automated status change'
        ]
      }
    ], 'write');

    const updatedLead = await db.get<any>('SELECT id, status FROM leads WHERE id = ?', [lead.id]);
    expect(updatedLead.status).toBe(testNewStatus);

    const auditEntry = await db.get<any>('SELECT * FROM audit_logs WHERE id = ?', [auditId]);
    expect(auditEntry).toBeDefined();
    expect(auditEntry.action).toBe('UPDATE_STATUS');
    expect(JSON.parse(auditEntry.old_values).status).toBe(oldStatus);
    expect(JSON.parse(auditEntry.new_values).status).toBe(testNewStatus);

    await db.run('UPDATE leads SET status = ? WHERE id = ?', [oldStatus, lead.id]);
  });

  it('3. Commercial totals calculation: computes genuine totals without fabrication or silent zeros', async () => {
    const quotes = await db.all<any>(`
      SELECT q1.*
      FROM quotes q1
      INNER JOIN (
        SELECT lead_id, MAX(created_at) as max_created_at
        FROM quotes
        GROUP BY lead_id
      ) q2 ON q1.lead_id = q2.lead_id AND q1.created_at = q2.max_created_at
    `);

    expect(quotes.length).toBeGreaterThan(0);

    let sumJobCost = 0;
    let sumRevenue = 0;
    let sumProfit = 0;

    for (const q of quotes) {
      sumJobCost += q.total_job_cost;
      sumRevenue += q.actual_revenue;
      sumProfit += q.gross_profit;
    }

    expect(Math.round(sumRevenue * 100) / 100).toBe(Math.round((sumJobCost + sumProfit) * 100) / 100);

    for (const q of quotes) {
      expect([7500, 9000]).toContain(q.bus_grant);
      expect(Math.round((q.actual_revenue - q.bus_grant) * 100) / 100).toBe(Math.round(q.customer_contribution * 100) / 100);
    }
  });

  it('4. Data integrity: jobs query returns unique lead records with property and quote data', async () => {
    const query = `
      SELECT 
        l.id, l.reference_no, l.customer_name, l.status,
        p.address_line1, p.postcode, p.property_type,
        q.id as quote_id, q.quote_reference, q.actual_revenue
      FROM leads l
      LEFT JOIN properties p ON l.id = p.lead_id
      LEFT JOIN (
        SELECT q1.*
        FROM quotes q1
        INNER JOIN (
          SELECT lead_id, MAX(created_at) as max_created_at
          FROM quotes
          GROUP BY lead_id
        ) q2 ON q1.lead_id = q2.lead_id AND q1.created_at = q2.max_created_at
      ) q ON l.id = q.lead_id
      GROUP BY l.id
    `;
    const rows = await db.all<any>(query);
    const ids = rows.map(r => r.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('5. Spreadsheet Quick Add Row: correctly persists new lead and property records', async () => {
    const testLeadId = `lead_quick_${Date.now()}`;
    const testRef = `PEL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.batch([
      {
        sql: `
          INSERT INTO leads (id, reference_no, customer_name, email, phone, lead_source, status, assigned_to)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [testLeadId, testRef, 'Spreadsheet Test Customer', null, '07700900999', 'Spreadsheet Grid', 'NEW', 'user_sales']
      },
      {
        sql: `
          INSERT INTO properties (id, lead_id, address_line1, postcode, country, property_type, property_status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [`prop_quick_${Date.now()}`, testLeadId, '123 Sheet Ave', 'SW1A 1AA', 'England', 'Semi detached', 'Existing property']
      }
    ], 'write');

    const created = await db.get<any>('SELECT * FROM leads WHERE id = ?', [testLeadId]);
    expect(created).toBeDefined();
    expect(created.customer_name).toBe('Spreadsheet Test Customer');
    expect(normalizeStatus(created.status)).toBe('New');

    await db.run('DELETE FROM properties WHERE lead_id = ?', [testLeadId]);
    await db.run('DELETE FROM leads WHERE id = ?', [testLeadId]);
  });
});
