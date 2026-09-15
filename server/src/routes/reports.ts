import { Router, Response } from 'express';
import { db } from '../db/connection.js';
import { authenticateToken, optionalAuthenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

export const reportsRouter = Router();


function safeErrorResponse(res: Response, err: any, defaultMsg: string) {
  console.error(`[Reports Router Error]:`, err);
  const msg = process.env.NODE_ENV === 'production' ? defaultMsg : (err.message || defaultMsg);
  res.status(500).json({ error: msg });
}

export const PIPELINE_CATEGORIES = {
  NEW_LEADS: {
    id: 'NEW_LEADS',
    name: 'New Leads',
    statuses: ['New', 'Pending Check', 'Checked']
  },
  QUOTATION: {
    id: 'QUOTATION',
    name: 'Quotation',
    statuses: ['Quotation Draft', 'Quotation Verified', 'Customer Contribution Required', 'Customer Approved', 'Customer Declined']
  },
  AFTER_SURVEY: {
    id: 'AFTER_SURVEY',
    name: 'After Survey',
    statuses: ['Survey Pending', 'Survey Received', 'Design Complete', 'Ready for Installation']
  },
  INSTALLATION: {
    id: 'INSTALLATION',
    name: 'Installation & Completion',
    statuses: ['Installation Scheduled', 'Installation Complete', 'Completed']
  },
  OTHER: {
    id: 'OTHER',
    name: 'Other',
    statuses: ['On Hold', 'Cancelled']
  }
} as const;

export const ALL_17_STATUSES = [
  'New',
  'Pending Check',
  'Checked',
  'Quotation Draft',
  'Quotation Verified',
  'Customer Contribution Required',
  'Customer Approved',
  'Customer Declined',
  'Survey Pending',
  'Survey Received',
  'Design Complete',
  'Ready for Installation',
  'Installation Scheduled',
  'Installation Complete',
  'Completed',
  'On Hold',
  'Cancelled'
] as const;

export function normalizeStatus(rawStatus?: string): string {
  if (!rawStatus) return 'New';
  const clean = rawStatus.trim();
  const upper = clean.toUpperCase();

  if (upper === 'NEW') return 'New';
  if (upper === 'PENDING CHECK' || upper === 'PENDING_CHECK') return 'Pending Check';
  if (upper === 'CHECKED') return 'Checked';
  if (upper === 'ESTIMATED' || upper === 'QUOTATION DRAFT' || upper === 'QUOTATION_DRAFT' || upper === 'DRAFT') return 'Quotation Draft';
  if (upper === 'QUOTED' || upper === 'QUOTATION VERIFIED' || upper === 'QUOTATION_VERIFIED' || upper === 'VERIFIED') return 'Quotation Verified';
  if (upper === 'CUSTOMER CONTRIBUTION REQUIRED' || upper === 'CONTRIBUTION_REQUIRED' || upper === 'CUSTOMER_CONTRIBUTION_REQUIRED' || upper === 'CUSTOMER CONTRIBUTION' || upper === 'CUSTOMER_CONTRIBUTION' || upper === 'CUSTOMER CONTRIBUTION (REQUIRED)') return 'Customer Contribution Required';
  if (upper === 'CUSTOMER APPROVED' || upper === 'CUSTOMER_APPROVED' || upper === 'APPROVED') return 'Customer Approved';
  if (upper === 'CUSTOMER DECLINED' || upper === 'CUSTOMER_DECLINED' || upper === 'DECLINED') return 'Customer Declined';
  if (upper === 'SURVEY PENDING' || upper === 'SURVEY_SCHEDULED' || upper === 'SURVEY_PENDING') return 'Survey Pending';
  if (upper === 'SURVEY RECEIVED' || upper === 'SURVEYED' || upper === 'SURVEY_RECEIVED') return 'Survey Received';
  if (upper === 'DESIGN COMPLETE' || upper === 'DESIGN_COMPLETE') return 'Design Complete';
  if (upper === 'READY FOR INSTALLATION' || upper === 'READY_FOR_INSTALLATION' || upper === 'READY') return 'Ready for Installation';
  if (upper === 'INSTALLATION SCHEDULED' || upper === 'INSTALLATION_SCHEDULED') return 'Installation Scheduled';
  if (upper === 'INSTALLATION COMPLETE' || upper === 'INSTALLATION_COMPLETE') return 'Installation Complete';
  if (upper === 'COMPLETED' || upper === 'WON') return 'Completed';
  if (upper === 'ON HOLD' || upper === 'ON_HOLD' || upper === 'HOLD') return 'On Hold';
  if (upper === 'CANCELLED' || upper === 'LOST' || upper === 'CANCELED') return 'Cancelled';

  const exactMatch = ALL_17_STATUSES.find(s => s.toLowerCase() === clean.toLowerCase());
  return exactMatch || clean;
}

export function getCategoryForStatus(status: string): string {
  const norm = normalizeStatus(status);
  for (const cat of Object.values(PIPELINE_CATEGORIES)) {
    if ((cat.statuses as readonly string[]).includes(norm)) {
      return cat.name;
    }
  }
  return 'Other';
}

async function fetchAllJobsData() {
  const query = `
    SELECT 
      l.id, l.reference_no, l.customer_name, l.email, l.phone, l.lead_source, l.status as raw_status, l.assigned_to, l.created_at, l.updated_at,
      p.address_line1, p.address_line2, p.postcode, p.country, p.epc_rating, p.epc_floor_area, p.property_type, p.property_status,
      p.bedrooms, p.bathrooms, p.ownership, p.wall_insulation, p.roof_insulation, p.existing_heating_system, p.boiler_type,
      p.on_off_gas_grid, p.cylinder_space, p.existing_cylinder_details, p.existing_radiator_count, p.existing_radiator_details,
      p.existing_pipework, p.previous_government_grant, p.fuse_board_condition, p.conservation_area, p.boundary_planning_risk,
      p.listed_building, p.sales_notes,
      q.id as quote_id, q.quote_reference, q.mode as quote_mode, q.total_job_cost, q.bus_grant, q.required_revenue,
      q.customer_contribution, q.actual_revenue, q.gross_profit, q.gross_margin_percent, q.confidence_score,
      q.confidence_level, q.profitability_grade, q.commercial_recommendation, q.status as quote_status, q.created_at as quote_created_at,
      s.outputs_json
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
    LEFT JOIN calculation_snapshots s ON q.id = s.quote_id
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `;

  const rows = await db.all(query);

  return rows.map(r => {
    const status = normalizeStatus(r.raw_status);
    const category = getCategoryForStatus(status);
    let outputs: any = null;
    if (r.outputs_json) {
      try {
        outputs = JSON.parse(r.outputs_json);
      } catch {
        outputs = null;
      }
    }

    let heatRequirementKw: number | null = null;
    let heatRequirementDisplay: string = '—';
    if (outputs?.heatDemand) {
      heatRequirementKw = outputs.heatDemand.centralDemandKw || outputs.heatDemand.designHeatLossKw || null;
      heatRequirementDisplay = outputs.heatDemand.displayRange || (heatRequirementKw ? `${heatRequirementKw} kW` : '—');
    } else if (outputs?.confirmedDesignHeatLossKw) {
      heatRequirementKw = outputs.confirmedDesignHeatLossKw;
      heatRequirementDisplay = `${heatRequirementKw} kW (MCS)`;
    }

    let ashpModel: string = '—';
    if (outputs?.ashp?.recommendedProduct?.model) {
      ashpModel = outputs.ashp.recommendedProduct.model;
    } else if (outputs?.lineItems) {
      const ashpItem = outputs.lineItems.find((i: any) => i.category === 'ASHP');
      if (ashpItem) ashpModel = ashpItem.description;
    }

    let cylinderModel: string = '—';
    if (outputs?.cylinder?.recommendedProduct?.model) {
      cylinderModel = outputs.cylinder.recommendedProduct.model;
    } else if (outputs?.cylinder?.displayCapacity) {
      cylinderModel = outputs.cylinder.displayCapacity;
    } else if (outputs?.lineItems) {
      const cylItem = outputs.lineItems.find((i: any) => i.category === 'CYLINDER');
      if (cylItem) cylinderModel = cylItem.description;
    }

    let radiatorSchedule: string = '—';
    if (outputs?.radiators?.displayQuantity) {
      radiatorSchedule = outputs.radiators.displayQuantity;
    } else if (outputs?.radiators?.estimatedReplacementCount) {
      radiatorSchedule = `${outputs.radiators.estimatedReplacementCount} units allowance`;
    }

    const costBreakdown = outputs?.costBreakdown || null;
    const hasCommercialData = r.quote_id !== null && r.total_job_cost !== null;

    return {
      id: r.id,
      reference_no: r.reference_no,
      customer_name: r.customer_name,
      email: r.email,
      phone: r.phone,
      lead_source: r.lead_source,
      status,
      raw_status: r.raw_status,
      category,
      assigned_to: r.assigned_to,
      created_at: r.created_at,
      updated_at: r.updated_at,
      property: {
        address_line1: r.address_line1,
        address_line2: r.address_line2,
        postcode: r.postcode,
        country: r.country,
        epc_rating: r.epc_rating,
        epc_floor_area: r.epc_floor_area,
        property_type: r.property_type,
        property_status: r.property_status,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        ownership: r.ownership,
        wall_insulation: r.wall_insulation,
        roof_insulation: r.roof_insulation,
        existing_heating_system: r.existing_heating_system,
        boiler_type: r.boiler_type,
        on_off_gas_grid: r.on_off_gas_grid,
        cylinder_space: r.cylinder_space,
        existing_cylinder_details: r.existing_cylinder_details,
        existing_radiator_count: r.existing_radiator_count,
        existing_radiator_details: r.existing_radiator_details,
        existing_pipework: r.existing_pipework,
        previous_government_grant: r.previous_government_grant,
        fuse_board_condition: r.fuse_board_condition,
        conservation_area: r.conservation_area,
        boundary_planning_risk: r.boundary_planning_risk,
        listed_building: r.listed_building,
        sales_notes: r.sales_notes
      },
      commercial: hasCommercialData ? {
        quote_id: r.quote_id,
        quote_reference: r.quote_reference,
        mode: r.quote_mode,
        total_job_cost: r.total_job_cost,
        bus_grant: r.bus_grant,
        required_revenue: r.required_revenue,
        customer_contribution: r.customer_contribution,
        actual_revenue: r.actual_revenue,
        gross_profit: r.gross_profit,
        gross_margin_percent: r.gross_margin_percent,
        confidence_score: r.confidence_score,
        confidence_level: r.confidence_level,
        profitability_grade: r.profitability_grade,
        commercial_recommendation: r.commercial_recommendation,
        status: r.quote_status,
        created_at: r.quote_created_at,
        equipment_cost: costBreakdown?.equipmentMaterials ?? null,
        labour_cost: costBreakdown?.labour ?? null,
        lead_gen_cost: costBreakdown?.leadGeneration ?? null,
        extras_contingency: costBreakdown?.extrasContingency ?? null
      } : null,
      design: {
        heatRequirementKw,
        heatRequirementDisplay,
        ashpModel,
        cylinderModel,
        radiatorSchedule,
        annualSpaceHeatingKwh: outputs?.heatDemand?.annualSpaceHeatingKwh ?? null
      },
      hasCommercialData
    };
  });
}

async function calculateSummaryAndAttention(jobs: any[]) {
  const totalJobs = jobs.length;

  const pendingStatuses = [
    'New', 'Pending Check', 'Quotation Draft', 'Customer Contribution Required',
    'Survey Pending', 'Survey Received', 'Design Complete', 'Ready for Installation', 'Installation Scheduled'
  ];
  const completedStatuses = ['Installation Complete', 'Completed'];
  const verifiedStatuses = ['Quotation Verified', 'Checked', 'Customer Approved'];
  const cancelledStatuses = ['Cancelled', 'Customer Declined'];

  const pending = jobs.filter(j => pendingStatuses.includes(j.status)).length;
  const completed = jobs.filter(j => completedStatuses.includes(j.status)).length;
  const quotationsVerified = jobs.filter(j => verifiedStatuses.includes(j.status)).length;
  const cancelled = jobs.filter(j => cancelledStatuses.includes(j.status)).length;

  const categoryCounts: Record<string, number> = {
    'New Leads': 0,
    'Quotation': 0,
    'After Survey': 0,
    'Installation & Completion': 0,
    'Other': 0
  };

  const statusCounts: Record<string, number> = {};
  for (const s of ALL_17_STATUSES) {
    statusCounts[s] = 0;
  }

  for (const j of jobs) {
    if (categoryCounts[j.category] !== undefined) {
      categoryCounts[j.category]++;
    } else {
      categoryCounts['Other']++;
    }
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  }

  const quotedJobs = jobs.filter(j => j.hasCommercialData && j.commercial);
  const jobsWithCommercialCount = quotedJobs.length;

  let totalJobValue = 0;
  let totalCustomerContribution = 0;
  let totalGrantValue = 0;
  let totalGrossProfit = 0;
  let totalJobCost = 0;
  let marginSum = 0;

  for (const j of quotedJobs) {
    const c = j.commercial;
    totalJobValue += c.actual_revenue || 0;
    totalCustomerContribution += c.customer_contribution || 0;
    totalGrantValue += c.bus_grant || 0;
    totalGrossProfit += c.gross_profit || 0;
    totalJobCost += c.total_job_cost || 0;
    marginSum += c.gross_margin_percent || 0;
  }

  const avgGrossMargin = jobsWithCommercialCount > 0
    ? Math.round((marginSum / jobsWithCommercialCount) * 10) / 10
    : 0;

  const needsAttention: Array<{
    id: string;
    type: 'warning' | 'alert' | 'info';
    title: string;
    description: string;
    jobId: string;
    referenceNo: string;
    customerName: string;
    status: string;
    badge: string;
  }> = [];

  for (const j of jobs) {
    if (j.status === 'Pending Check') {
      needsAttention.push({
        id: `att_check_${j.id}`,
        type: 'warning',
        title: 'Pending Pre-Survey Check',
        description: `${j.customer_name} (${j.reference_no}) awaits pre-survey viability assessment.`,
        jobId: j.id,
        referenceNo: j.reference_no,
        customerName: j.customer_name,
        status: j.status,
        badge: 'Pre-Survey Review'
      });
    }

    if (j.property.existing_pipework?.includes('Microbore') && j.status !== 'Cancelled' && j.status !== 'Completed') {
      needsAttention.push({
        id: `att_pipe_${j.id}`,
        type: 'warning',
        title: 'Microbore Pipework Risk',
        description: `${j.customer_name} has 10mm or microbore pipework. Re-pipe commercial allowance required.`,
        jobId: j.id,
        referenceNo: j.reference_no,
        customerName: j.customer_name,
        status: j.status,
        badge: 'Pipework Review'
      });
    }

    if (j.status === 'Survey Pending') {
      needsAttention.push({
        id: `att_survey_${j.id}`,
        type: 'info',
        title: 'Survey Pending',
        description: `MCS room-by-room survey pending for ${j.customer_name} (${j.property.address_line1 || j.property.postcode}).`,
        jobId: j.id,
        referenceNo: j.reference_no,
        customerName: j.customer_name,
        status: j.status,
        badge: 'Survey Required'
      });
    }

    if (j.commercial && (j.commercial.status === 'DRAFT' || j.status === 'Quotation Draft')) {
      needsAttention.push({
        id: `att_draft_${j.id}`,
        type: 'info',
        title: 'Unverified Quotation Draft',
        description: `Quote ${j.commercial.quote_reference} for ${j.customer_name} is currently in Draft status.`,
        jobId: j.id,
        referenceNo: j.reference_no,
        customerName: j.customer_name,
        status: j.status,
        badge: 'Quotation Draft'
      });
    }

    if (j.commercial && j.commercial.customer_contribution > 0 && j.status === 'Customer Contribution Required') {
      needsAttention.push({
        id: `att_contrib_${j.id}`,
        type: 'alert',
        title: 'Customer Contribution Required',
        description: `£${j.commercial.customer_contribution.toLocaleString()} required from ${j.customer_name} before proceeding.`,
        jobId: j.id,
        referenceNo: j.reference_no,
        customerName: j.customer_name,
        status: j.status,
        badge: 'Payment Required'
      });
    }

    if (j.commercial && j.commercial.gross_margin_percent < 25.0 && j.status !== 'Cancelled') {
      needsAttention.push({
        id: `att_margin_${j.id}`,
        type: 'alert',
        title: 'Low Margin Quotation (< 25%)',
        description: `${j.customer_name} margin is ${j.commercial.gross_margin_percent}%, below target 25.0%. Commercial review required.`,
        jobId: j.id,
        referenceNo: j.reference_no,
        customerName: j.customer_name,
        status: j.status,
        badge: 'Low Margin'
      });
    }

    if (j.status === 'Cancelled') {
      needsAttention.push({
        id: `att_canc_${j.id}`,
        type: 'info',
        title: 'Cancelled Job',
        description: `${j.customer_name} (${j.reference_no}) was marked as cancelled.`,
        jobId: j.id,
        referenceNo: j.reference_no,
        customerName: j.customer_name,
        status: j.status,
        badge: 'Cancelled'
      });
    }
  }

  const recentAudit = await db.all(`
    SELECT id, user_name, entity_type, entity_id, action, old_values, new_values, reason, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 8
  `);

  const formattedActivity = recentAudit.map(a => {
    let oldVal = '';
    let newVal = '';
    try {
      if (a.old_values) oldVal = JSON.parse(a.old_values)?.status || '';
      if (a.new_values) newVal = JSON.parse(a.new_values)?.status || '';
    } catch {
      // ignore
    }

    return {
      id: a.id,
      userName: a.user_name || 'System User',
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      oldVal,
      newVal,
      reason: a.reason,
      createdAt: a.created_at
    };
  });

  return {
    kpis: {
      totalJobs,
      pending,
      completed,
      quotationsVerified,
      cancelled
    },
    commercial: {
      totalJobValue: Math.round(totalJobValue * 100) / 100,
      totalCustomerContribution: Math.round(totalCustomerContribution * 100) / 100,
      totalGrantValue: Math.round(totalGrantValue * 100) / 100,
      totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
      totalJobCost: Math.round(totalJobCost * 100) / 100,
      avgGrossMargin,
      jobsWithCommercialCount,
      totalJobsCount: totalJobs
    },
    categoryCounts,
    statusCounts,
    needsAttention: needsAttention.slice(0, 10),
    recentActivity: formattedActivity
  };
}

// GET all enriched jobs (Public Read-Only)
reportsRouter.get('/jobs', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const jobs = await fetchAllJobsData();
    const summary = await calculateSummaryAndAttention(jobs);

    res.json({
      jobs,
      ...summary,
      statuses: ALL_17_STATUSES,
      categories: Object.values(PIPELINE_CATEGORIES)
    });
  } catch (error: any) {
    safeErrorResponse(res, error, 'Failed to fetch jobs report');
  }
});

// GET dashboard summary (Public Read-Only)
reportsRouter.get('/dashboard-summary', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {

  try {
    const jobs = await fetchAllJobsData();
    const summary = await calculateSummaryAndAttention(jobs);

    const gradeDistribution = await db.all(`
      SELECT profitability_grade as grade, COUNT(*) as count
      FROM quotes
      GROUP BY profitability_grade
      ORDER BY count DESC
    `);

    res.json({
      metrics: {
        totalLeads: summary.kpis.totalJobs,
        totalQuotes: summary.commercial.jobsWithCommercialCount,
        avgGrossMarginPercent: summary.commercial.avgGrossMargin || 25.0,
        totalPipelineRevenue: summary.commercial.totalJobValue,
        totalGrossProfit: summary.commercial.totalGrossProfit,
        totalBUSGrantsClaimed: summary.commercial.totalGrantValue
      },
      ...summary,
      gradeDistribution,
      jobs,
      statuses: ALL_17_STATUSES,
      categories: Object.values(PIPELINE_CATEGORIES)
    });
  } catch (error: any) {
    safeErrorResponse(res, error, 'Failed to fetch dashboard summary');
  }
});
