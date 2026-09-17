import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  TrendingUp, PoundSterling, CheckCircle, FileText, PlusCircle, ArrowRight,
  Zap, Calculator, Search, X, AlertTriangle, ChevronDown, ChevronUp,
  Filter, RotateCcw, Building, Home, CheckCircle2, Clock, Ban,
  Eye, HelpCircle, Activity, Layers, SlidersHorizontal, BarChart3,
  ChevronLeft, ChevronRight, Plus, Columns, Trash2,
  Undo2, Redo2, Edit3, Copy, Check
} from 'lucide-react';
import { api } from '../services/api.js';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect.js';
import { Badge } from '../components/Badge.js';
import { GoldenFormulaExplainer } from '../components/GoldenFormulaExplainer.js';
import { SnapshotModal } from '../components/SnapshotModal.js';

interface DashboardViewProps {
  onNavigate: (tab: string, lead?: any) => void;
}

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

export const PIPELINE_STAGES = [
  { id: 'ALL', name: 'All Jobs' },
  { id: 'NEW_LEADS', name: 'New Leads', statuses: ['New', 'Pending Check', 'Checked'] },
  { id: 'QUOTATION', name: 'Quotation', statuses: ['Quotation Draft', 'Quotation Verified', 'Customer Contribution Required', 'Customer Approved', 'Customer Declined'] },
  { id: 'AFTER_SURVEY', name: 'After Survey', statuses: ['Survey Pending', 'Survey Received', 'Design Complete', 'Ready for Installation'] },
  { id: 'INSTALLATION', name: 'Installation & Completion', statuses: ['Installation Scheduled', 'Installation Complete', 'Completed'] },
  { id: 'OTHER', name: 'Other', statuses: ['On Hold', 'Cancelled'] }
];

function normalizeStatusKey(status?: string | null): string {
  if (!status) return '';
  return String(status).trim().toUpperCase();
}

function getStatusBadgeClass(status: string): string {
  const upper = normalizeStatusKey(status);
  switch (upper) {
    case 'NEW':
    case 'SURVEY RECEIVED':
    case 'INSTALLATION SCHEDULED':
      return 'badge-new'; // Blue (New)
    case 'PENDING CHECK':
    case 'PENDING':
    case 'SURVEY PENDING':
      return 'badge-warning'; // Amber (Pending Check / awaiting action)
    case 'QUOTATION DRAFT':
    case 'DRAFT':
    case 'ESTIMATED':
      return 'badge-quote'; // Purple (Quotation Draft / in progress)
    case 'CUSTOMER CONTRIBUTION REQUIRED':
    case 'CUSTOMER CONTRIBUTION':
    case 'CUSTOMER CONTRIBUTION (REQUIRED)':
    case 'CONTRIBUTION REQUIRED':
      return 'badge-financial'; // Teal-green (Customer Contribution Required - distinct from Amber & Purple)
    case 'CHECKED':
    case 'QUOTATION VERIFIED':
    case 'CUSTOMER APPROVED':
    case 'READY FOR INSTALLATION':
    case 'INSTALLATION COMPLETE':
    case 'COMPLETED':
    case 'DESIGN COMPLETE':
      return 'badge-completed'; // Emerald Green (Completed / Approved)
    case 'CUSTOMER DECLINED':
    case 'CANCELLED':
    case 'CANCELED':
      return 'badge-cancelled'; // Red (Declined / Cancelled)
    case 'ON HOLD':
    default:
      return 'badge-neutral'; // Slate Gray (On Hold)
  }
}

export function getStatusPillClass(status: string): string {
  const upper = normalizeStatusKey(status);
  switch (upper) {
    case 'NEW':
    case 'SURVEY RECEIVED':
    case 'INSTALLATION SCHEDULED':
      return 'status-pill-new';
    case 'PENDING CHECK':
    case 'PENDING':
    case 'SURVEY PENDING':
      return 'status-pill-pending';
    case 'QUOTATION DRAFT':
    case 'DRAFT':
    case 'ESTIMATED':
      return 'status-pill-draft';
    case 'CUSTOMER CONTRIBUTION REQUIRED':
    case 'CUSTOMER CONTRIBUTION':
    case 'CUSTOMER CONTRIBUTION (REQUIRED)':
    case 'CONTRIBUTION REQUIRED':
      return 'status-pill-financial';
    case 'CHECKED':
    case 'QUOTATION VERIFIED':
    case 'CUSTOMER APPROVED':
    case 'READY FOR INSTALLATION':
    case 'INSTALLATION COMPLETE':
    case 'COMPLETED':
    case 'DESIGN COMPLETE':
      return 'status-pill-completed';
    case 'CUSTOMER DECLINED':
    case 'CANCELLED':
    case 'CANCELED':
      return 'status-pill-cancelled';
    case 'ON HOLD':
    default:
      return 'status-pill-onhold';
  }
}

// ============================================================================
// JOB DOSSIER SLIDER COMPONENT (Left-to-Right / Right-to-Left Slide Navigation)
// ============================================================================
interface JobDossierSliderProps {
  job: any;
  jobIndex: number;
  totalJobs: number;
  containerWidth?: number;
  onPrevJob?: () => void;
  onNextJob?: () => void;
  onSelectSnapshot?: (quoteId: string) => void;
  onNavigate: (tab: string, lead?: any) => void;
}

const JobDossierSlider: React.FC<JobDossierSliderProps> = ({
  job,
  jobIndex,
  totalJobs,
  containerWidth,
  onPrevJob,
  onNextJob,
  onSelectSnapshot,
  onNavigate
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const hasComm = job.hasCommercialData && job.commercial;

  const cards = [
    { id: 'property', label: '1. Property', icon: <Building size={13} /> },
    { id: 'heating', label: '2. Heating', icon: <Home size={13} /> },
    { id: 'design', label: '3. Heat Pump & Design', icon: <Zap size={13} /> },
    { id: 'commercial', label: '4. Commercial', icon: <PoundSterling size={13} /> },
    { id: 'actions', label: '5. Actions & Overview', icon: <CheckCircle2 size={13} /> },
    { id: 'notes', label: '6. Additional Notes', icon: <FileText size={13} /> }
  ];

  const handleScroll = () => {
    // No-op for now, native scrolling handles it
  };

  return (
    <div
      className="crm-expand-drawer"
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Top Header & Job-to-Job Slider Controls */}
      <div className="crm-slider-header-bar" style={{ paddingRight: '48px' }}>
        <div>
          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
            {job.customer_name} ({job.reference_no}) — Interactive Job Dossier
          </strong>
          <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Status: <strong>{job.status}</strong> • Category: <strong>{job.category}</strong>
          </span>
        </div>

        {/* Job Slider Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>
              Job {jobIndex + 1} of {totalJobs}
            </span>
            <button
              onClick={onPrevJob}
              disabled={!onPrevJob}
              className="crm-slider-btn"
              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
              title="Slide to Previous Job"
            >
              <ChevronLeft size={13} /> Prev Job
            </button>
            <button
              onClick={onNextJob}
              disabled={!onNextJob}
              className="crm-slider-btn"
              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
              title="Slide to Next Job"
            >
              Next Job <ChevronRight size={13} />
            </button>
          </div>

          {hasComm && job.commercial?.quote_id && onSelectSnapshot && (
            <button
              onClick={() => onSelectSnapshot(job.commercial.quote_id)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.725rem' }}
            >
              <Eye size={13} /> Snapshot
            </button>
          )}

          <button
            onClick={() => onNavigate(hasComm && job.commercial?.mode === 'AFTER_SURVEY' ? 'after-survey' : 'new-lead', job)}
            className="btn btn-primary btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.725rem' }}
          >
            Workspace
          </button>
        </div>
      </div>

      {/* Section Quick-Jump Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
          Sections:
        </span>
        {cards.map((c, idx) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              const track = sliderRef.current;
              const cardEl = track?.children[idx] as HTMLElement | undefined;
              if (track && cardEl) {
                track.scrollTo({ left: cardEl.offsetLeft, behavior: 'smooth' });
              }
            }}
            className="crm-section-jump-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Relative container for Track */}
      <div className="crm-track-container-rel">
        {/* FIX: added overscrollBehaviorX to completely isolate this scrollbar from the parent table's scrollbar */}
        <div
          ref={sliderRef}
          className="crm-slider-track"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            overflowY: 'hidden',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            scrollBehavior: 'smooth',
            paddingBottom: '8px',
            overscrollBehaviorX: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Card 1: Property Specification */}
          <div
            className={`crm-slider-card`}
            style={{ flexShrink: 0, minWidth: 320, width: 320, maxWidth: 320, boxSizing: 'border-box' }}
          >
            <span className="crm-drawer-sec-title">
              <span>PROPERTY SPECIFICATION</span>
              <Building size={14} />
            </span>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Address:</span>
              <span className="crm-drawer-val">{job.property?.address_line1 || '—'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Postcode:</span>
              <span className="crm-drawer-val font-mono">{job.property?.postcode}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Country:</span>
              <span className="crm-drawer-val">{job.property?.country || 'England'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Property Type:</span>
              <span className="crm-drawer-val">{job.property?.property_type || '—'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Floor Area / EPC:</span>
              <span className="crm-drawer-val font-mono">{job.property?.epc_floor_area ? `${job.property.epc_floor_area} m²` : '—'} (Band {job.property?.epc_rating || 'D'})</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Bedrooms / Baths:</span>
              <span className="crm-drawer-val">{job.property?.bedrooms || '—'} bed / {job.property?.bathrooms || '—'} bath</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Wall Insulation:</span>
              <span className="crm-drawer-val">{job.property?.wall_insulation || 'Unknown'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Roof Insulation:</span>
              <span className="crm-drawer-val">{job.property?.roof_insulation || 'Unknown'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Tenure:</span>
              <span className="crm-drawer-val">{job.property?.ownership || 'Owner-occupier'}</span>
            </div>
          </div>

          {/* Card 2: Existing Heating System */}
          <div
            className={`crm-slider-card`}
            style={{ flexShrink: 0, minWidth: 320, width: 320, maxWidth: 320, boxSizing: 'border-box' }}
          >
            <span className="crm-drawer-sec-title">
              <span>EXISTING HEATING SYSTEM</span>
              <Home size={14} />
            </span>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Existing System:</span>
              <span className="crm-drawer-val">{job.property?.existing_heating_system || 'Gas Central Heating'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Boiler Type:</span>
              <span className="crm-drawer-val">{job.property?.boiler_type || 'Combi'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Fuel / Gas Grid:</span>
              <span className="crm-drawer-val" style={{ color: job.property?.on_off_gas_grid?.includes('Off') ? '#8b5cf6' : 'inherit' }}>
                {job.property?.on_off_gas_grid || 'On gas grid'}
              </span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Existing Radiators:</span>
              <span className="crm-drawer-val">{job.property?.existing_radiator_count ? `${job.property.existing_radiator_count} emitters` : '—'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Cylinder Space:</span>
              <span className="crm-drawer-val">{job.property?.cylinder_space || 'Unknown'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Pipework:</span>
              <span className="crm-drawer-val" style={{ color: job.property?.existing_pipework?.includes('Microbore') ? 'var(--danger)' : 'inherit' }}>
                {job.property?.existing_pipework || 'Standard 15mm+'}
              </span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Fuse Board:</span>
              <span className="crm-drawer-val">{job.property?.fuse_board_condition || 'Modern'}</span>
            </div>
            {job.property?.sales_notes && (
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                "{job.property.sales_notes}"
              </div>
            )}
          </div>

          {/* Card 3: Heat Pump & System Design */}
          <div
            className={`crm-slider-card`}
            style={{ flexShrink: 0, minWidth: 320, width: 320, maxWidth: 320, boxSizing: 'border-box' }}
          >
            <span className="crm-drawer-sec-title">
              <span>HEAT PUMP & SYSTEM DESIGN</span>
              <Zap size={14} />
            </span>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Design Heat Demand:</span>
              <span className="crm-drawer-val font-mono">{job.design?.heatRequirementDisplay}</span>
            </div>
            {job.design?.annualSpaceHeatingKwh && (
              <div className="crm-drawer-kv">
                <span className="crm-drawer-key">Annual Energy Demand:</span>
                <span className="crm-drawer-val font-mono">{job.design.annualSpaceHeatingKwh.toLocaleString()} kWh/yr</span>
              </div>
            )}
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Selected ASHP Model:</span>
              <span className="crm-drawer-val" style={{ color: 'var(--primary)' }}>{job.design?.ashpModel}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Domestic Hot Water Cylinder:</span>
              <span className="crm-drawer-val">{job.design?.cylinderModel}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Radiator Schedule:</span>
              <span className="crm-drawer-val">{job.design?.radiatorSchedule}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Confidence Grade:</span>
              <span className="crm-drawer-val">
                {hasComm ? (
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                    {job.commercial?.confidence_level || 'SURVEY-CONFIRMED'}
                  </span>
                ) : 'Pending Assessment'}
              </span>
            </div>
          </div>

          {/* Card 4: Commercial Breakdown */}
          <div
            className={`crm-slider-card`}
            style={{ flexShrink: 0, minWidth: 320, width: 320, maxWidth: 320, boxSizing: 'border-box' }}
          >
            <span className="crm-drawer-sec-title">
              <span>COMMERCIAL BREAKDOWN</span>
              <PoundSterling size={14} />
            </span>
            {hasComm ? (
              <>
                {job.commercial.equipment_cost && (
                  <div className="crm-drawer-kv">
                    <span className="crm-drawer-key">Equipment & Materials:</span>
                    <span className="crm-drawer-val font-mono">£{job.commercial.equipment_cost.toLocaleString()}</span>
                  </div>
                )}
                {job.commercial.labour_cost && (
                  <div className="crm-drawer-kv">
                    <span className="crm-drawer-key">Installation Labour:</span>
                    <span className="crm-drawer-val font-mono">£{job.commercial.labour_cost.toLocaleString()}</span>
                  </div>
                )}
                {job.commercial.lead_gen_cost && (
                  <div className="crm-drawer-kv">
                    <span className="crm-drawer-key">Lead Gen Allowance:</span>
                    <span className="crm-drawer-val font-mono">£{job.commercial.lead_gen_cost.toLocaleString()}</span>
                  </div>
                )}
                <div className="crm-drawer-kv" style={{ borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                  <span className="crm-drawer-key"><strong>Total Job Cost (C):</strong></span>
                  <span className="crm-drawer-val font-mono">£{job.commercial.total_job_cost.toLocaleString()}</span>
                </div>
                <div className="crm-drawer-kv">
                  <span className="crm-drawer-key">BUS Grant:</span>
                  <span className="crm-drawer-val font-mono" style={{ color: 'var(--primary)' }}>£{job.commercial.bus_grant.toLocaleString()}</span>
                </div>
                <div className="crm-drawer-kv">
                  <span className="crm-drawer-key">Customer Contribution:</span>
                  <span className="crm-drawer-val font-mono" style={{ color: 'var(--primary)' }}>£{job.commercial.customer_contribution.toLocaleString()}</span>
                </div>
                <div className="crm-drawer-kv" style={{ borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                  <span className="crm-drawer-key"><strong>Total Revenue (R):</strong></span>
                  <span className="crm-drawer-val font-mono">£{job.commercial.actual_revenue.toLocaleString()}</span>
                </div>
                <div className="crm-drawer-kv">
                  <span className="crm-drawer-key"><strong>Gross Profit (P):</strong></span>
                  <span className="crm-drawer-val font-mono" style={{ color: '#059669' }}>£{job.commercial.gross_profit.toLocaleString()}</span>
                </div>
                <div className="crm-drawer-kv">
                  <span className="crm-drawer-key"><strong>Gross Margin (M):</strong></span>
                  <span className="crm-drawer-val font-mono" style={{ color: job.commercial.gross_margin_percent >= 25.0 ? '#059669' : 'var(--warning)' }}>
                    {job.commercial.gross_margin_percent}% (Grade {job.commercial.profitability_grade})
                  </span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '12px 0', textAlign: 'center' }}>
                No quotation generated yet. Run pre-survey calculation to unlock full commercial viability analysis.
              </div>
            )}
          </div>

          {/* Card 5: Actions & Overview */}
          <div
            className={`crm-slider-card`}
            style={{ flexShrink: 0, minWidth: 320, width: 320, maxWidth: 320, boxSizing: 'border-box' }}
          >
            <span className="crm-drawer-sec-title">
              <span>ACTIONS & OVERVIEW</span>
              <CheckCircle2 size={14} />
            </span>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Customer:</span>
              <span className="crm-drawer-val"><strong>{job.customer_name}</strong></span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Reference:</span>
              <span className="crm-drawer-val font-mono">{job.reference_no}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Created Date:</span>
              <span className="crm-drawer-val">
                {job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Stage / Category:</span>
              <span className="crm-drawer-val">{job.category || 'Quotation'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Confidence Grade:</span>
              <span className="crm-drawer-val font-mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                {job.commercial?.profitability_grade ? `Grade ${job.commercial.profitability_grade}` : 'Verified'}
              </span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Current Status:</span>
              <span className="crm-drawer-val" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                {job.status}
              </span>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Quick Navigation
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => onNavigate(hasComm && job.commercial?.mode === 'AFTER_SURVEY' ? 'after-survey' : 'new-lead', job)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  Open Workspace
                </button>
                {hasComm && job.commercial?.quote_id && onSelectSnapshot && (
                  <button
                    type="button"
                    onClick={() => onSelectSnapshot(job.commercial.quote_id)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', justifyContent: 'center' }}
                  >
                    <Eye size={13} /> Snapshot
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 6: Additional Notes */}
          <div
            className={`crm-slider-card`}
            style={{ flexShrink: 0, minWidth: 320, width: 320, maxWidth: 320, boxSizing: 'border-box' }}
          >
            <span className="crm-drawer-sec-title">
              <span>ADDITIONAL NOTES</span>
              <FileText size={14} />
            </span>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Survey Notes:</span>
              <span className="crm-drawer-val">{job.notes?.survey || 'No survey notes available.'}</span>
            </div>
            <div className="crm-drawer-kv">
              <span className="crm-drawer-key">Customer Pref:</span>
              <span className="crm-drawer-val">{job.notes?.customer_pref || 'None specified.'}</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '12px 0', textAlign: 'center', marginTop: 'auto' }}>
              Further job details or admin notes will appear here.
            </div>
          </div>

          {/* Card 7: Blank / Ghost Card */}
          <div
            className={`crm-slider-card`}
            style={{ flexShrink: 0, minWidth: 320, width: 320, maxWidth: 320, boxSizing: 'border-box', opacity: 0, pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <span className="crm-drawer-sec-title">
              <span>BLANK SPACER</span>
            </span>
          </div>

          {/* Card 8: Second Blank / Ghost Card */}
          <div
            className={`crm-slider-card`}
            style={{ flexShrink: 0, minWidth: 320, width: 320, maxWidth: 320, boxSizing: 'border-box', opacity: 0, pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <span className="crm-drawer-sec-title">
              <span>BLANK SPACER 2</span>
            </span>
          </div>

        </div>
      </div>

    </div>
  );
};

export const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  // Emerald Green Field (Completed / Approved / Verified) - Contrast ≥ 8.1:1
  'Completed': { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },
  'Installation Complete': { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },
  'Customer Approved': { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },
  'Checked': { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },
  'Design Complete': { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },
  'Ready for Installation': { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },
  'Quotation Verified': { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },

  // Amber Field (Pending Check / Awaiting Action) - Contrast ≥ 7.2:1
  'Pending Check': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'Pending': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'Survey Pending': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },

  // Teal-Green Field (Customer Contribution Required) - Contrast ≥ 6.2:1 (Distinct from Amber & Purple)
  'Customer Contribution Required': { bg: '#ccfbf1', text: '#115e59', border: '#5eead4' },
  'Customer Contribution': { bg: '#ccfbf1', text: '#115e59', border: '#5eead4' },
  'Customer Contribution (Required)': { bg: '#ccfbf1', text: '#115e59', border: '#5eead4' },

  // Blue Field (New / Scheduled) - Contrast ≥ 8.2:1
  'New': { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' },
  'Survey Received': { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' },
  'Installation Scheduled': { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' },

  // Purple Field (Quotation Draft / In Progress) - Contrast ≥ 8.1:1 (Distinct from Amber)
  'Quotation Draft': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  'Draft': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  'DRAFT': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  'Estimated': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  'ESTIMATED': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },

  // Red Field (Customer Declined / Cancelled) - Contrast ≥ 7.0:1
  'Customer Declined': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  'Cancelled': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },

  // Slate Gray Field (On Hold) - Contrast ≥ 12.5:1
  'On Hold': { bg: '#f1f5f9', text: '#1e293b', border: '#cbd5e1' }
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getJobs();
      if (res && res.jobs) {
        setJobs(res.jobs);
        setSummaryData(res);
      } else {
        // Fallback
        const fallback = await api.getDashboardSummary();
        setJobs(fallback.jobs || []);
        setSummaryData(fallback);
      }
    } catch (err: any) {
      console.error('Failed to load Dashboard 2.0 data:', err);
      setError(err.message || 'Failed to load jobs data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [ashpFilter, setAshpFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  // UI State
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [selectedSnapshotQuoteId, setSelectedSnapshotQuoteId] = useState<string | null>(null);
  const [updatingStatusJobId, setUpdatingStatusJobId] = useState<string | null>(null);
  const [showAnalyticsSection, setShowAnalyticsSection] = useState(false);
  const [showAttentionSection, setShowAttentionSection] = useState(false);

  // Auto-close status dropdown when clicking anywhere on screen outside the active status menu
  useEffect(() => {
    if (!openStatusDropdownId) return;

    const handleScreenClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If clicking inside the status dropdown menu, allow item click handler to execute
      if (target.closest('.gs-status-menu')) {
        return;
      }

      // If clicking on the chip button that belongs to the currently open dropdown, let button onClick toggle it
      const chipBtn = target.closest('.gs-status-chip');
      if (chipBtn && chipBtn.getAttribute('data-status-job-id') === openStatusDropdownId) {
        return;
      }

      // Any other click on the screen auto-closes the dropdown
      setOpenStatusDropdownId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenStatusDropdownId(null);
      }
    };

    // Use capture phase so stopPropagation inside table cells or other elements doesn't prevent closing
    window.addEventListener('mousedown', handleScreenClick, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleScreenClick, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openStatusDropdownId]);

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Spreadsheet Customization: Column Widths
  const DEFAULT_COLUMN_WIDTHS: Record<string, number> = useMemo(() => ({
    customer: 240,
    address: 260,
    date: 120,
    type: 110,
    status: 200,
    heat: 120,
    ashp: 240,
    grant: 130,
    contribution: 140,
    profit: 140,
    margin: 160
  }), []);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('crm_col_widths_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {
      customer: 240,
      address: 260,
      date: 120,
      type: 110,
      status: 200,
      heat: 120,
      ashp: 240,
      grant: 130,
      contribution: 140,
      profit: 140,
      margin: 160
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_col_widths_v2', JSON.stringify(columnWidths));
    } catch (e) { }
  }, [columnWidths]);

  // Spreadsheet Customization: Row Height
  const [rowHeight, setRowHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('crm_row_height_v2');
      if (saved) return Number(saved) || 38;
    } catch (e) { }
    return 38;
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_row_height_v2', String(rowHeight));
    } catch (e) { }
  }, [rowHeight]);

  // Spreadsheet Customization: Custom User Columns
  interface CustomColumnItem {
    id: string;
    title: string;
    width: number;
  }

  const [customColumns, setCustomColumns] = useState<CustomColumnItem[]>(() => {
    try {
      const saved = localStorage.getItem('crm_custom_cols_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return [];
  });

  const [customCellValues, setCustomCellValues] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem('crm_custom_cells_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_custom_cols_v2', JSON.stringify(customColumns));
    } catch (e) { }
  }, [customColumns]);

  useEffect(() => {
    try {
      localStorage.setItem('crm_custom_cells_v2', JSON.stringify(customCellValues));
    } catch (e) { }
  }, [customCellValues]);

  // Modals for Customization
  const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [newRowData, setNewRowData] = useState({
    customerName: '',
    addressLine1: '',
    postcode: '',
    phone: '',
    propertyType: 'Semi detached'
  });
  const [isSubmittingRow, setIsSubmittingRow] = useState(false);

  // Column Resizer Mouse Drag Handler
  const handleColResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || 150;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(70, startWidth + delta);
      setColumnWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleAddCustomColumn = (title: string) => {
    if (!title.trim()) return;
    const colId = `col_${Date.now()}`;
    const newCol: CustomColumnItem = {
      id: colId,
      title: title.trim(),
      width: 150
    };
    setCustomColumns(prev => [...prev, newCol]);
    setColumnWidths(prev => ({ ...prev, [colId]: 150 }));
  };

  const handleDeleteCustomColumn = (colId: string) => {
    setCustomColumns(prev => prev.filter(c => c.id !== colId));
  };

  const handleCustomCellChange = (jobId: string, colId: string, val: string) => {
    setCustomCellValues(prev => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] || {}),
        [colId]: val
      }
    }));
  };

  const handleResetColumnWidths = () => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    setRowHeight(38);
  };

  const handleCreateNewRow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSubmittingRow(true);
      await api.createLead({
        customerName: newRowData.customerName.trim() || `Customer #${jobs.length + 1}`,
        addressLine1: newRowData.addressLine1.trim() || 'Address Pending',
        postcode: newRowData.postcode.trim() || 'SW1A 1AA',
        phone: newRowData.phone.trim() || undefined,
        propertyType: newRowData.propertyType || 'Semi detached',
        leadSource: 'Spreadsheet Grid'
      });
      setIsAddRowModalOpen(false);
      setNewRowData({
        customerName: '',
        addressLine1: '',
        postcode: '',
        phone: '',
        propertyType: 'Semi detached'
      });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to add row', err);
      alert('Could not add row: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingRow(false);
    }
  };

  // =========================================================================
  // UNDO & REDO SYSTEM (Spreadsheet Grid History)
  // =========================================================================
  interface HistoryAction {
    id: string;
    type: string;
    description: string;
    undo: () => Promise<void> | void;
    redo: () => Promise<void> | void;
  }

  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const pushUndoAction = useCallback((action: HistoryAction) => {
    setUndoStack(prev => [...prev.slice(-30), action]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, action]);
    try {
      await action.undo();
    } catch (err) {
      console.error('Undo failed:', err);
    }
  }, [undoStack]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, action]);
    try {
      await action.redo();
    } catch (err) {
      console.error('Redo failed:', err);
    }
  }, [redoStack]);

  // Keyboard shortcut for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // =========================================================================
  // 5-SECOND DELETE WITH UNDO TOAST
  // =========================================================================
  interface DeleteToastState {
    job: any;
    countdown: number;
    timeoutId: any;
    intervalId: any;
  }
  const [deleteToast, setDeleteToast] = useState<DeleteToastState | null>(null);
  const deleteToastRef = useRef<DeleteToastState | null>(null);
  deleteToastRef.current = deleteToast;

  const commitPendingDelete = useCallback(async () => {
    if (!deleteToastRef.current) return;
    const { job, timeoutId, intervalId } = deleteToastRef.current;
    clearTimeout(timeoutId);
    clearInterval(intervalId);
    setDeleteToast(null);
    try {
      await api.deleteLead(job.id);
    } catch (err) {
      console.error('Failed to commit delete', err);
    }
  }, []);

  const handleDeleteJob = useCallback((job: any) => {
    // If another deletion is pending, finalize it immediately
    if (deleteToastRef.current) {
      commitPendingDelete();
    }

    // Optimistically remove from state
    setJobs(prev => prev.filter(j => j.id !== job.id));

    let count = 5;
    const intervalId = setInterval(() => {
      count -= 1;
      setDeleteToast(prev => prev ? { ...prev, countdown: count } : null);
      if (count <= 0) clearInterval(intervalId);
    }, 1000);

    const timeoutId = setTimeout(async () => {
      clearInterval(intervalId);
      setDeleteToast(null);
      try {
        await api.deleteLead(job.id);
      } catch (err) {
        console.error('Server deletion error:', err);
      }
    }, 5000);

    const toastState: DeleteToastState = { job, countdown: 5, timeoutId, intervalId };
    setDeleteToast(toastState);

    // Push into Undo stack
    pushUndoAction({
      id: `del_${job.id}_${Date.now()}`,
      type: 'DELETE_JOB',
      description: `Delete ${job.reference_no}`,
      undo: async () => {
        // Restore in state
        setJobs(prev => [job, ...prev]);
        if (deleteToastRef.current?.job.id === job.id) {
          clearTimeout(deleteToastRef.current.timeoutId);
          clearInterval(deleteToastRef.current.intervalId);
          setDeleteToast(null);
        } else {
          // If already deleted on server, recreate lead
          try {
            await api.createLead({
              customerName: job.customer_name,
              addressLine1: job.property?.address_line1,
              postcode: job.property?.postcode,
              phone: job.phone,
              propertyType: job.property?.property_type,
              leadSource: job.lead_source
            });
            await fetchData();
          } catch (e) { }
        }
      },
      redo: async () => {
        setJobs(prev => prev.filter(j => j.id !== job.id));
        try {
          await api.deleteLead(job.id);
        } catch (e) { }
      }
    });
  }, [commitPendingDelete, pushUndoAction, fetchData]);

  const handleUndoDelete = useCallback((customToast?: DeleteToastState) => {
    const target = customToast || deleteToastRef.current;
    if (!target) return;
    clearTimeout(target.timeoutId);
    clearInterval(target.intervalId);
    setJobs(prev => [target.job, ...prev]);
    setDeleteToast(null);
  }, []);

  // =========================================================================
  // RIGHT-CLICK CONTEXT MENU & EDIT JOB MODAL
  // =========================================================================
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    job: any;
  } | null>(null);

  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    const handleCloseContextMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseContextMenu);
    window.addEventListener('scroll', handleCloseContextMenu, true);
    return () => {
      window.removeEventListener('click', handleCloseContextMenu);
      window.removeEventListener('scroll', handleCloseContextMenu, true);
    };
  }, []);

  const handleRowContextMenu = (e: React.MouseEvent, job: any) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 230;
    const menuHeight = 240;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);
    setContextMenu({ x, y, job });
  };

  // Edit Job Modal State
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    addressLine1: '',
    postcode: '',
    phone: '',
    status: '',
    propertyType: 'Semi detached',
    salesNotes: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleStartEditJob = (job: any) => {
    setEditingJob(job);
    setEditFormData({
      customerName: job.customer_name || '',
      addressLine1: job.property?.address_line1 || '',
      postcode: job.property?.postcode || '',
      phone: job.phone || '',
      status: job.status || 'New',
      propertyType: job.property?.property_type || 'Semi detached',
      salesNotes: job.property?.sales_notes || ''
    });
    setContextMenu(null);
  };

  const handleSaveEditJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    const oldJob = { ...editingJob };
    const updatedJob = {
      ...editingJob,
      customer_name: editFormData.customerName.trim(),
      status: editFormData.status,
      phone: editFormData.phone.trim(),
      property: {
        ...(editingJob.property || {}),
        address_line1: editFormData.addressLine1.trim(),
        postcode: editFormData.postcode.trim(),
        property_type: editFormData.propertyType,
        sales_notes: editFormData.salesNotes.trim()
      }
    };

    try {
      setIsSavingEdit(true);
      // Optimistic update
      setJobs(prev => prev.map(j => j.id === editingJob.id ? updatedJob : j));
      setEditingJob(null);

      // Record in Undo stack
      pushUndoAction({
        id: `edit_${editingJob.id}_${Date.now()}`,
        type: 'EDIT_JOB',
        description: `Edit ${editingJob.reference_no}`,
        undo: async () => {
          setJobs(prev => prev.map(j => j.id === oldJob.id ? oldJob : j));
          await api.updateLead(oldJob.id, {
            customerName: oldJob.customer_name,
            addressLine1: oldJob.property?.address_line1,
            postcode: oldJob.property?.postcode,
            phone: oldJob.phone,
            status: oldJob.status,
            propertyType: oldJob.property?.property_type,
            salesNotes: oldJob.property?.sales_notes
          });
        },
        redo: async () => {
          setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
          await api.updateLead(updatedJob.id, {
            customerName: updatedJob.customer_name,
            addressLine1: updatedJob.property?.address_line1,
            postcode: updatedJob.property?.postcode,
            phone: updatedJob.phone,
            status: updatedJob.status,
            propertyType: updatedJob.property?.property_type,
            salesNotes: updatedJob.property?.sales_notes
          });
        }
      });

      await api.updateLead(editingJob.id, {
        customerName: editFormData.customerName.trim(),
        addressLine1: editFormData.addressLine1.trim(),
        postcode: editFormData.postcode.trim(),
        phone: editFormData.phone.trim(),
        status: editFormData.status,
        propertyType: editFormData.propertyType,
        salesNotes: editFormData.salesNotes.trim()
      });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save edited lead:', err);
      alert('Failed to save changes: ' + (err.message || 'Unknown error'));
      setJobs(prev => prev.map(j => j.id === oldJob.id ? oldJob : j));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Container width tracking for responsive sticky drawer slider
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.max(800, window.innerWidth - 64);
    }
    return 1000;
  });

  useEffect(() => {
    const updateWidth = () => {
      if (tableContainerRef.current) {
        const cw = tableContainerRef.current.clientWidth;
        if (cw > 0) setContainerWidth(cw);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && tableContainerRef.current) {
      ro = new ResizeObserver(() => updateWidth());
      ro.observe(tableContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      if (ro) ro.disconnect();
    };
  }, []);

  // Handle Status Change
  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      setUpdatingStatusJobId(jobId);
      // Optimistic update
      setJobs(prev => prev.map(j => {
        if (j.id === jobId) {
          return { ...j, status: newStatus };
        }
        return j;
      }));

      await api.updateJobStatus(jobId, newStatus);
      // Silently refresh summary to keep KPI counters and audit log accurate
      const refreshed = await api.getJobs();
      if (refreshed && refreshed.jobs) {
        setJobs(refreshed.jobs);
        setSummaryData(refreshed);
      }
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Could not update job status. Please try again.');
      fetchData(); // Rollback
    } finally {
      setUpdatingStatusJobId(null);
    }
  };

  // Distinct ASHP models for filtering
  const distinctAshpModels = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => {
      if (j.design?.ashpModel && j.design.ashpModel !== '—') {
        set.add(j.design.ashpModel);
      }
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Distinct Property Types
  const distinctPropertyTypes = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => {
      if (j.property?.property_type) {
        set.add(j.property.property_type);
      }
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // 1. Stage Ribbon Filter
    if (selectedStage !== 'ALL') {
      const stage = PIPELINE_STAGES.find(s => s.id === selectedStage);
      if (stage && stage.statuses) {
        result = result.filter(j => stage.statuses!.includes(j.status));
      }
    }

    // 2. Global Search (Customer, reference_no, address, postcode, ASHP)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(j => {
        const cust = (j.customer_name || '').toLowerCase();
        const ref = (j.reference_no || '').toLowerCase();
        const addr = (j.property?.address_line1 || '').toLowerCase();
        const post = (j.property?.postcode || '').toLowerCase();
        const ashp = (j.design?.ashpModel || '').toLowerCase();
        const email = (j.email || '').toLowerCase();
        return cust.includes(term) || ref.includes(term) || addr.includes(term) || post.includes(term) || ashp.includes(term) || email.includes(term);
      });
    }

    // 3. Status Filter (from SearchableSelect)
    if (statusFilter) {
      result = result.filter(j => (j.status || '').toLowerCase() === (statusFilter || '').toLowerCase());
    }

    // 4. Job Type Filter
    if (typeFilter) {
      if (typeFilter === 'MODE_A') {
        result = result.filter(j => j.commercial?.mode === 'NEW_LEAD' || (!j.commercial && j.property));
      } else if (typeFilter === 'MODE_B') {
        result = result.filter(j => j.commercial?.mode === 'AFTER_SURVEY');
      } else if (typeFilter === 'UNQUOTED') {
        result = result.filter(j => !j.hasCommercialData);
      }
    }

    // 5. Date Filter
    if (dateFilter && dateFilter !== 'ALL') {
      const now = new Date();
      result = result.filter(j => {
        const itemDate = new Date(j.created_at || now);
        if (dateFilter === 'TODAY') {
          return itemDate.toDateString() === now.toDateString();
        }
        if (dateFilter === 'THIS_WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= sevenDaysAgo;
        }
        if (dateFilter === 'THIS_MONTH') {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // 6. Property Type Filter
    if (propertyTypeFilter) {
      result = result.filter(j => j.property?.property_type === propertyTypeFilter);
    }

    // 7. ASHP Filter
    if (ashpFilter) {
      result = result.filter(j => j.design?.ashpModel === ashpFilter);
    }

    // 8. Rating / Grade Filter
    if (ratingFilter) {
      result = result.filter(j => j.commercial?.profitability_grade === ratingFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = null;
      let valB: any = null;

      switch (sortField) {
        case 'date':
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
          break;
        case 'customer':
          valA = (a.customer_name || '').toLowerCase();
          valB = (b.customer_name || '').toLowerCase();
          break;
        case 'status':
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
          break;
        case 'heat':
          valA = a.design?.heatRequirementKw || 0;
          valB = b.design?.heatRequirementKw || 0;
          break;
        case 'contribution':
          valA = a.commercial?.customer_contribution || 0;
          valB = b.commercial?.customer_contribution || 0;
          break;
        case 'profit':
          valA = a.commercial?.gross_profit || 0;
          valB = b.commercial?.gross_profit || 0;
          break;
        case 'margin':
          valA = a.commercial?.gross_margin_percent || 0;
          valB = b.commercial?.gross_margin_percent || 0;
          break;
        default:
          valA = a.created_at;
          valB = b.created_at;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [jobs, selectedStage, searchTerm, statusFilter, typeFilter, dateFilter, propertyTypeFilter, ashpFilter, ratingFilter, sortField, sortDirection]);

  // Toggle Sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStage('ALL');
    setStatusFilter('');
    setTypeFilter('');
    setDateFilter('ALL');
    setPropertyTypeFilter('');
    setAshpFilter('');
    setRatingFilter('');
  };

  const isAnyFilterActive = Boolean(
    searchTerm || selectedStage !== 'ALL' || statusFilter || typeFilter ||
    dateFilter !== 'ALL' || propertyTypeFilter || ashpFilter || ratingFilter
  );

  // Status Select Options for SearchableSelect filter
  const statusSelectOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'All Statuses' },
      ...ALL_17_STATUSES.map(s => ({
        value: s,
        label: s,
        badge: (summaryData?.statusCounts?.[s] || 0) > 0 ? String(summaryData.statusCounts[s]) : undefined
      }))
    ];
  }, [summaryData]);

  const typeSelectOptions: SelectOption[] = useMemo(() => [
    { value: '', label: 'All Types' },
    { value: 'MODE_A', label: 'Mode A (New Lead)' },
    { value: 'MODE_B', label: 'Mode B (After Survey)' },
    { value: 'UNQUOTED', label: 'Unquoted / Awaiting Calc' }
  ], []);

  const dateSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'ALL', label: 'All Time' },
    { value: 'TODAY', label: 'Today' },
    { value: 'THIS_WEEK', label: 'This Week' },
    { value: 'THIS_MONTH', label: 'This Month' }
  ], []);

  const propertyTypeSelectOptions: SelectOption[] = useMemo(() => [
    { value: '', label: 'All Property Types' },
    ...distinctPropertyTypes.map(p => ({ value: p, label: p }))
  ], [distinctPropertyTypes]);

  const ashpSelectOptions: SelectOption[] = useMemo(() => [
    { value: '', label: 'All ASHPs' },
    ...distinctAshpModels.map(m => ({ value: m, label: m }))
  ], [distinctAshpModels]);

  const ratingSelectOptions: SelectOption[] = useMemo(() => [
    { value: '', label: 'All Grades' },
    { value: 'A+', label: 'A+ (Premium Margin > 28%)' },
    { value: 'A', label: 'A (Target Margin 25–28%)' },
    { value: 'B', label: 'B (Acceptable 22–25%)' },
    { value: 'C', label: 'C (Caution 18–22%)' },
    { value: 'D', label: 'D (Commercial Risk 15–18%)' },
    { value: 'F', label: 'F (Unviable < 15%)' }
  ], []);

  const allStatusOptions: SelectOption[] = useMemo(() => [
    ...ALL_17_STATUSES.map(s => ({
      value: s,
      label: s
    }))
  ], []);

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading Prime Energy Dashboard 2.0...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px' }}>
        <div className="crm-attention-card alert">
          <div>
            <strong>Failed to load CRM Dashboard:</strong> {error}
          </div>
          <button onClick={fetchData} className="btn btn-secondary btn-sm">Retry</button>
        </div>
      </div>
    );
  }

  const kpis = summaryData?.kpis || {
    totalJobs: jobs.length,
    pending: 0,
    completed: 0,
    quotationsVerified: 0,
    cancelled: 0
  };

  const comm = summaryData?.commercial || {
    totalJobValue: 0,
    totalCustomerContribution: 0,
    totalGrantValue: 0,
    totalGrossProfit: 0,
    totalJobCost: 0,
    avgGrossMargin: 25.0,
    jobsWithCommercialCount: 0,
    totalJobsCount: jobs.length
  };

  const needsAttention = summaryData?.needsAttention || [];
  const recentActivity = summaryData?.recentActivity || [];

  return (
    <div className="crm-container">
      {/* 1. Header */}
      <div className="crm-header">
        <div>
          <h1 className="crm-header-title">
            Prime Energy CRM & Job Pipeline
          </h1>
          <p className="crm-header-desc">
            Internal operations dashboard for domestic ASHP installations, BUS grant compliance & commercial governance.
          </p>
        </div>
        <div className="crm-header-actions">
          <button
            type="button"
            onClick={() => setShowAnalyticsSection(prev => !prev)}
            className={`crm-header-btn crm-header-btn-secondary ${showAnalyticsSection ? 'active' : ''}`}
            title="Toggle Canva-Style Commercial Analytics"
          >
            <BarChart3 size={15} />
            <span>{showAnalyticsSection ? 'Hide Margin Model' : 'View Margin Model'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('new-lead')}
            className="crm-header-btn crm-header-btn-primary"
            title="Create New Lead Pre-Survey (Mode A)"
          >
            <PlusCircle size={15} />
            <span>New Lead Pre-Survey</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('after-survey')}
            className="crm-header-btn crm-header-btn-secondary"
            title="Enter Survey Design (Mode B)"
          >
            <FileText size={15} />
            <span>Enter Survey Design</span>
          </button>
        </div>
      </div>

      {/* 2. Operational Pipeline KPIs (Full Width Row) */}
      <div className="crm-operational-section">
        <div className="crm-section-eyebrow">
          <Activity size={13} /> Operational Pipeline ({kpis.totalJobs} Records)
        </div>
        <div className="crm-operational-grid">
          <div className="crm-kpi-card kpi-total">
            <div className="crm-kpi-header">
              <span className="crm-kpi-label">Total Jobs</span>
              <Layers size={14} />
            </div>
            <div className="crm-kpi-val">{kpis.totalJobs}</div>
            <div className="crm-kpi-sub">Total active pipeline</div>
          </div>

          <div className="crm-kpi-card kpi-pending">
            <div className="crm-kpi-header">
              <span className="crm-kpi-label">Pending</span>
              <Clock size={14} />
            </div>
            <div className="crm-kpi-val">{kpis.pending}</div>
            <div className="crm-kpi-sub">In survey / quote / check</div>
          </div>

          <div className="crm-kpi-card kpi-completed">
            <div className="crm-kpi-header">
              <span className="crm-kpi-label">Completed</span>
              <CheckCircle2 size={14} />
            </div>
            <div className="crm-kpi-val">{kpis.completed}</div>
            <div className="crm-kpi-sub">Installed & certified</div>
          </div>

          <div className="crm-kpi-card kpi-verified">
            <div className="crm-kpi-header">
              <span className="crm-kpi-label">Quotations Verified</span>
              <CheckCircle size={14} />
            </div>
            <div className="crm-kpi-val">{kpis.quotationsVerified}</div>
            <div className="crm-kpi-sub">BUS approved / ready</div>
          </div>

          <div className="crm-kpi-card kpi-cancelled">
            <div className="crm-kpi-header">
              <span className="crm-kpi-label">Cancelled</span>
              <Ban size={14} />
            </div>
            <div className="crm-kpi-val">{kpis.cancelled}</div>
            <div className="crm-kpi-sub">Declined or aborted</div>
          </div>
        </div>
      </div>

      {/* 3. Commercial Overview (Full Width Prominent Row!) */}
      <div className="crm-commercial-section">
        <div className="crm-section-eyebrow">
          <PoundSterling size={13} /> Commercial Overview ({comm.jobsWithCommercialCount} Quoted Jobs)
        </div>
        <div className="crm-commercial-bar">
          <div className="crm-comm-item comm-value">
            <span className="crm-comm-label">
              Total Job Value
              <TrendingUp size={13} />
            </span>
            <span className="crm-comm-val">
              £{comm.totalJobValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="crm-comm-sub">Gross quoted pipeline</span>
          </div>

          <div className="crm-comm-item comm-contrib">
            <span className="crm-comm-label">
              Customer Contribution
              <PoundSterling size={13} />
            </span>
            <span className="crm-comm-val">
              £{comm.totalCustomerContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="crm-comm-sub">Direct customer payments</span>
          </div>

          <div className="crm-comm-item comm-grant">
            <span className="crm-comm-label">
              BUS Grant Value
              <Zap size={13} />
            </span>
            <span className="crm-comm-val">
              £{comm.totalGrantValue.toLocaleString()}
            </span>
            <span className="crm-comm-sub">£7,500 / £9,000 claimed</span>
          </div>

          <div className="crm-comm-item comm-profit">
            <span className="crm-comm-label">
              Gross Profit
              <TrendingUp size={13} />
            </span>
            <span className="crm-comm-val">
              £{comm.totalGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="crm-comm-sub">Net business margin</span>
          </div>

          <div className="crm-comm-item comm-margin">
            <span className="crm-comm-label">
              Average Gross Margin
              <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>Target 25%</span>
            </span>
            <span className="crm-comm-val">
              {comm.avgGrossMargin}%
            </span>
            <span className="crm-comm-sub">Target: 25.0% deterministic</span>
          </div>
        </div>
      </div>

      {/* Collapsible Canva Analytics Waterfall */}
      {showAnalyticsSection && (
        <div style={{ transition: 'all 0.3s ease' }}>
          <GoldenFormulaExplainer />
        </div>
      )}

      {/* 4. Priority / Needs Attention Area */}
      {needsAttention.length > 0 && (
        <div className="crm-attention-container">
          <div
            className="crm-attention-header"
            onClick={() => setShowAttentionSection(prev => !prev)}
          >
            <span className="crm-attention-title">
              <AlertTriangle size={15} style={{ color: 'var(--warning)' }} />
              Needs Attention ({needsAttention.length} Genuine Action Items)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {showAttentionSection ? 'Click to collapse' : 'Click to expand'}
              </span>
              {showAttentionSection ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </div>

          {showAttentionSection && (
            <div className="crm-attention-items">
              {needsAttention.map((att: any) => (
                <div key={att.id} className={`crm-attention-card ${att.type}`}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.675rem', padding: '2px 6px' }}>
                        {att.badge}
                      </span>
                      <strong style={{ fontSize: '0.8125rem' }}>{att.title}</strong>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.785rem' }}>
                      {att.description}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm(att.referenceNo);
                      setExpandedJobId(att.jobId);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                  >
                    View Job
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Google Sheets Style Data Workspace */}
      <div className="crm-sheet-workspace">
        <div className="crm-sheet-workspace-header">
          <div className="crm-sheet-title-row">
            <span className="crm-sheet-title">Job Management Spreadsheet Grid</span>
            <span className="crm-sheet-count-badge">
              {filteredJobs.length} of {jobs.length} jobs {isAnyFilterActive && '(filtered)'}
            </span>
          </div>

          <div className="crm-sheet-custom-actions">
            {/* Undo & Redo History Controls */}
            <div className="crm-undo-redo-cluster" title="Undo / Redo (Ctrl+Z / Ctrl+Y)">
              <button
                type="button"
                className="crm-sheet-tool-btn"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                title={undoStack.length > 0 ? `Undo: ${undoStack[undoStack.length - 1].description} (Ctrl+Z)` : 'Undo (Ctrl+Z)'}
              >
                <Undo2 size={13} />
                <span>Undo</span>
              </button>
              <button
                type="button"
                className="crm-sheet-tool-btn"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title={redoStack.length > 0 ? `Redo: ${redoStack[redoStack.length - 1].description} (Ctrl+Y)` : 'Redo (Ctrl+Y)'}
              >
                <Redo2 size={13} />
                <span>Redo</span>
              </button>
            </div>

            {/* Row Height Customization Controls */}
            <div className="crm-row-height-control" title="Adjust row height">
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '2px' }}>Height:</span>
              <button
                type="button"
                className={`crm-row-height-btn ${rowHeight === 32 ? 'active' : ''}`}
                onClick={() => setRowHeight(32)}
                title="Compact row height (32px)"
              >
                32
              </button>
              <button
                type="button"
                className={`crm-row-height-btn ${rowHeight === 38 ? 'active' : ''}`}
                onClick={() => setRowHeight(38)}
                title="Standard row height (38px)"
              >
                38
              </button>
              <button
                type="button"
                className={`crm-row-height-btn ${rowHeight === 48 ? 'active' : ''}`}
                onClick={() => setRowHeight(48)}
                title="Comfortable row height (48px)"
              >
                48
              </button>
            </div>

            {/* Add Custom Column Button */}
            <button
              type="button"
              className="crm-sheet-tool-btn"
              onClick={() => setIsAddColModalOpen(true)}
              title="Add new column to spreadsheet"
            >
              <Columns size={13} />
              <span>+ Column</span>
            </button>

            {/* Add New Row Button */}
            <button
              type="button"
              className="crm-sheet-tool-btn primary"
              onClick={() => setIsAddRowModalOpen(true)}
              title="Add new row / job to spreadsheet"
            >
              <Plus size={13} />
              <span>+ Row</span>
            </button>

            {/* Reset Layout */}
            <button
              type="button"
              className="crm-sheet-tool-btn"
              onClick={handleResetColumnWidths}
              title="Reset column widths and row height"
              style={{ padding: '4px 8px' }}
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* Pipeline Stages Ribbon */}
        <div className="crm-pipeline-ribbon">
          {PIPELINE_STAGES.map(stage => {
            let count = 0;
            if (stage.id === 'ALL') {
              count = jobs.length;
            } else if (stage.statuses) {
              count = jobs.filter(j => stage.statuses!.includes(j.status)).length;
            }
            const isActive = selectedStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`crm-stage-chip ${isActive ? 'active' : ''}`}
              >
                <span>{stage.name}</span>
                <span className="crm-stage-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Single-Line Compact Horizontal Filter Toolbar */}
        <div className="crm-sheet-toolbar">
          {/* Search Input */}
          <div className="crm-toolbar-search">
            <Search size={14} className="crm-toolbar-search-icon" />
            <input
              type="text"
              placeholder="Search jobs, customer, address, postcode, ASHP..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="crm-toolbar-search-clear">
                <X size={12} />
              </button>
            )}
          </div>

          {/* 1. Status Filter */}
          <div className="crm-toolbar-select-item">
            <SearchableSelect
              options={statusSelectOptions}
              value={statusFilter}
              onChange={val => setStatusFilter(val || '')}
              placeholder="Status: All"
              searchPlaceholder="Status..."
              compact={true}
            />
          </div>

          {/* 2. Job Type Filter */}
          <div className="crm-toolbar-select-item">
            <SearchableSelect
              options={typeSelectOptions}
              value={typeFilter}
              onChange={val => setTypeFilter(val || '')}
              placeholder="Type: All"
              compact={true}
              searchable={false}
            />
          </div>

          {/* 3. Date Filter */}
          <div className="crm-toolbar-select-item">
            <SearchableSelect
              options={dateSelectOptions}
              value={dateFilter}
              onChange={val => setDateFilter(val || 'ALL')}
              placeholder="Date: All"
              compact={true}
              searchable={false}
            />
          </div>

          {/* 4. Property Type Filter */}
          <div className="crm-toolbar-select-item">
            <SearchableSelect
              options={propertyTypeSelectOptions}
              value={propertyTypeFilter}
              onChange={val => setPropertyTypeFilter(val || '')}
              placeholder="Property: All"
              compact={true}
            />
          </div>

          {/* 5. ASHP Model Filter */}
          <div className="crm-toolbar-select-item">
            <SearchableSelect
              options={ashpSelectOptions}
              value={ashpFilter}
              onChange={val => setAshpFilter(val || '')}
              placeholder="ASHP: All"
              compact={true}
            />
          </div>

          {/* 6. Grade Filter */}
          <div className="crm-toolbar-select-item">
            <SearchableSelect
              options={ratingSelectOptions}
              value={ratingFilter}
              onChange={val => setRatingFilter(val || '')}
              placeholder="Grade: All"
              compact={true}
              searchable={false}
            />
          </div>

          {/* Clear Filters Button */}
          {isAnyFilterActive && (
            <button onClick={handleResetFilters} className="crm-toolbar-reset" title="Reset all filters">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* Real Horizontal & Vertical Scroll Container for Google Sheet Grid (Comfortably shows 15 jobs) */}
        <div className="crm-sheet-scroll-container" ref={tableContainerRef} style={{ maxHeight: expandedJobId ? '860px' : '620px' }}>
          <table className="crm-sheet-grid" style={{ width: 'max-content', minWidth: 'max-content' }}>
            <thead>
              <tr>
                {/* 1. Customer */}
                <th
                  onClick={() => handleSort('customer')}
                  style={{ width: columnWidths.customer, minWidth: columnWidths.customer, maxWidth: columnWidths.customer }}
                  className={`crm-th-resizable ${sortField === 'customer' ? 'sorted' : ''}`}
                >
                  <span>JOB / CUSTOMER {sortField === 'customer' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('customer', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 2. Address */}
                <th
                  style={{ width: columnWidths.address, minWidth: columnWidths.address, maxWidth: columnWidths.address }}
                  className="crm-th-resizable"
                >
                  <span>ADDRESS</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('address', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 3. Date */}
                <th
                  onClick={() => handleSort('date')}
                  style={{ width: columnWidths.date, minWidth: columnWidths.date, maxWidth: columnWidths.date }}
                  className={`crm-th-resizable ${sortField === 'date' ? 'sorted' : ''}`}
                >
                  <span>DATE {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('date', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 4. Type */}
                <th
                  style={{ width: columnWidths.type, minWidth: columnWidths.type, maxWidth: columnWidths.type }}
                  className="crm-th-resizable"
                >
                  <span>TYPE</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('type', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 5. Status */}
                <th
                  onClick={() => handleSort('status')}
                  style={{ width: columnWidths.status, minWidth: columnWidths.status, maxWidth: columnWidths.status }}
                  className={`crm-th-resizable ${sortField === 'status' ? 'sorted' : ''}`}
                >
                  <span>STATUS {sortField === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('status', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 6. Heat Req */}
                <th
                  onClick={() => handleSort('heat')}
                  style={{ width: columnWidths.heat, minWidth: columnWidths.heat, maxWidth: columnWidths.heat, textAlign: 'right' }}
                  className={`crm-th-resizable ${sortField === 'heat' ? 'sorted' : ''}`}
                >
                  <span>HEAT REQ {sortField === 'heat' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('heat', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 7. ASHP Model */}
                <th
                  style={{ width: columnWidths.ashp, minWidth: columnWidths.ashp, maxWidth: columnWidths.ashp }}
                  className="crm-th-resizable"
                >
                  <span>ASHP MODEL</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('ashp', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 8. Grant */}
                <th
                  style={{ width: columnWidths.grant, minWidth: columnWidths.grant, maxWidth: columnWidths.grant, textAlign: 'right' }}
                  className="crm-th-resizable"
                >
                  <span>GRANT</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('grant', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 9. Contribution */}
                <th
                  onClick={() => handleSort('contribution')}
                  style={{ width: columnWidths.contribution, minWidth: columnWidths.contribution, maxWidth: columnWidths.contribution, textAlign: 'right' }}
                  className={`crm-th-resizable ${sortField === 'contribution' ? 'sorted' : ''}`}
                >
                  <span>CONTRIB {sortField === 'contribution' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('contribution', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 10. Profit */}
                <th
                  onClick={() => handleSort('profit')}
                  style={{ width: columnWidths.profit, minWidth: columnWidths.profit, maxWidth: columnWidths.profit, textAlign: 'right' }}
                  className={`crm-th-resizable ${sortField === 'profit' ? 'sorted' : ''}`}
                >
                  <span>PROFIT {sortField === 'profit' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('profit', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* 11. Margin */}
                <th
                  onClick={() => handleSort('margin')}
                  style={{ width: columnWidths.margin, minWidth: columnWidths.margin, maxWidth: columnWidths.margin, textAlign: 'right' }}
                  className={`crm-th-resizable ${sortField === 'margin' ? 'sorted' : ''}`}
                >
                  <span>MARGIN {sortField === 'margin' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                  <div
                    className="crm-col-resizer"
                    onMouseDown={(e) => handleColResizeStart('margin', e)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                  />
                </th>

                {/* Custom User Columns */}
                {customColumns.map(col => {
                  const colW = columnWidths[col.id] || col.width || 150;
                  return (
                    <th
                      key={col.id}
                      style={{ width: colW, minWidth: colW, maxWidth: colW }}
                      className="crm-th-resizable"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col.title}>
                          {col.title}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete column "${col.title}"?`)) {
                              handleDeleteCustomColumn(col.id);
                            }
                          }}
                          className="crm-col-delete-btn"
                          title="Delete Column"
                        >
                          ×
                        </button>
                      </div>
                      <div
                        className="crm-col-resizer"
                        onMouseDown={(e) => handleColResizeStart(col.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Drag to resize column"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, jobIndex) => {
                const isExpanded = expandedJobId === job.id;
                const hasComm = job.hasCommercialData && job.commercial;
                const formattedDate = job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

                return (
                  <React.Fragment key={job.id}>
                    <tr
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      onContextMenu={(e) => handleRowContextMenu(e, job)}
                      className={`crm-sheet-row ${isExpanded ? 'expanded' : ''}`}
                      style={{ height: `${rowHeight}px` }}
                    >
                      {/* Col 1: Job / Customer */}
                      <td
                        style={{ width: columnWidths.customer, minWidth: columnWidths.customer, maxWidth: columnWidths.customer, height: `${rowHeight}px` }}
                        title={`${job.reference_no} — ${job.customer_name}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <span style={{ color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.785rem', flexShrink: 0 }}>
                            {job.reference_no}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.customer_name}
                          </span>
                        </div>
                      </td>

                      {/* Col 2: Address */}
                      <td
                        style={{ width: columnWidths.address, minWidth: columnWidths.address, maxWidth: columnWidths.address, height: `${rowHeight}px` }}
                        title={`${job.property?.address_line1 || 'No address'}, ${job.property?.postcode || ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.property?.address_line1 || 'No address'}
                          </span>
                          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {job.property?.postcode || ''}
                          </span>
                        </div>
                      </td>

                      {/* Col 3: Date */}
                      <td
                        style={{ width: columnWidths.date, minWidth: columnWidths.date, maxWidth: columnWidths.date, height: `${rowHeight}px`, color: 'var(--text-muted)', fontSize: '0.75rem' }}
                        title={formattedDate}
                      >
                        {formattedDate}
                      </td>

                      {/* Col 4: Type */}
                      <td
                        style={{ width: columnWidths.type, minWidth: columnWidths.type, maxWidth: columnWidths.type, height: `${rowHeight}px` }}
                        title={hasComm ? (job.commercial.mode === 'NEW_LEAD' ? 'Mode A (Lead)' : 'Mode B (Survey)') : 'Unquoted'}
                      >
                        {hasComm ? (
                          <span className="badge badge-neutral" style={{ fontSize: '0.675rem', padding: '1px 5px' }}>
                            {job.commercial.mode === 'NEW_LEAD' ? 'Mode A' : 'Mode B'}
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.675rem', padding: '1px 5px', opacity: 0.6 }}>
                            Unquoted
                          </span>
                        )}
                      </td>

                      {/* Col 5: Status — Google Sheets In-Cell Dropdown Pill */}
                      <td
                        onClick={e => e.stopPropagation()}
                        style={{ width: columnWidths.status, minWidth: columnWidths.status, maxWidth: columnWidths.status, height: `${rowHeight}px`, overflow: 'visible', position: 'relative' }}
                      >
                        <div className="gs-status-cell">
                          {(() => {
                            const cfg = STATUS_CONFIG[job.status] || { bg: '#e2e8f0', text: '#334155', border: '#cbd5e1' };
                            return (
                              <button
                                type="button"
                                data-status-job-id={job.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenStatusDropdownId(openStatusDropdownId === job.id ? null : job.id);
                                }}
                                disabled={updatingStatusJobId === job.id}
                                className={`gs-status-chip ${getStatusPillClass(job.status)}`}
                                title={`Status: ${job.status} (Click to change)`}
                              >
                                <span className="gs-status-chip-text">
                                  {updatingStatusJobId === job.id ? 'Updating...' : job.status}
                                </span>
                                <span className="gs-status-chip-triangle">
                                  ▼
                                </span>
                              </button>
                            );
                          })()}

                          {openStatusDropdownId === job.id && (
                            <>
                              <div
                                className="gs-status-menu-backdrop"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenStatusDropdownId(null);
                                }}
                              />
                              <div className="gs-status-menu" onClick={e => e.stopPropagation()}>
                                <div className="gs-status-menu-header">Change Status</div>
                                <div className="gs-status-menu-list">
                                  {ALL_17_STATUSES.map(st => {
                                    const isSelected = job.status === st;
                                    return (
                                      <div
                                        key={st}
                                        className={`gs-status-menu-item ${isSelected ? 'selected' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(job.id, st);
                                          setOpenStatusDropdownId(null);
                                        }}
                                      >
                                        <span
                                          className={`gs-status-menu-pill-preview ${getStatusPillClass(st)}`}
                                        >
                                          {st}
                                        </span>
                                        {isSelected && <CheckCircle size={13} className="gs-status-item-check" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Col 6: Heat Req */}
                      <td
                        className="crm-sheet-num"
                        style={{ width: columnWidths.heat, minWidth: columnWidths.heat, maxWidth: columnWidths.heat, height: `${rowHeight}px` }}
                        title={`Heat Requirement: ${job.design?.heatRequirementDisplay || '—'}`}
                      >
                        {job.design?.heatRequirementDisplay !== '—' ? (
                          <span style={{ fontWeight: 700 }}>{job.design.heatRequirementDisplay}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Col 7: ASHP Model */}
                      <td
                        style={{ width: columnWidths.ashp, minWidth: columnWidths.ashp, maxWidth: columnWidths.ashp, height: `${rowHeight}px` }}
                        title={job.design?.ashpModel || '—'}
                      >
                        {job.design?.ashpModel !== '—' ? (
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {job.design?.ashpModel}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Col 8: Grant */}
                      <td
                        className="crm-sheet-num"
                        style={{ width: columnWidths.grant, minWidth: columnWidths.grant, maxWidth: columnWidths.grant, height: `${rowHeight}px` }}
                        title={hasComm ? `BUS Grant: £${job.commercial.bus_grant.toLocaleString()}` : 'No quote'}>
                        {hasComm ? (
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            £{job.commercial.bus_grant.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Col 9: Contribution */}
                      <td
                        className="crm-sheet-num"
                        style={{ width: columnWidths.contribution, minWidth: columnWidths.contribution, maxWidth: columnWidths.contribution, height: `${rowHeight}px` }}
                        title={hasComm ? `Contribution: £${job.commercial.customer_contribution.toLocaleString()}` : 'No quote'}>
                        {hasComm ? (
                          <span style={{ fontWeight: 700, color: job.commercial.customer_contribution > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                            £{job.commercial.customer_contribution.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Col 10: Profit */}
                      <td
                        className="crm-sheet-num"
                        style={{ width: columnWidths.profit, minWidth: columnWidths.profit, maxWidth: columnWidths.profit, height: `${rowHeight}px` }}
                        title={hasComm ? `Profit: £${job.commercial.gross_profit.toLocaleString()}` : 'No quote'}>
                        {hasComm ? (
                          <span style={{ fontWeight: 800, color: '#059669' }}>
                            £{job.commercial.gross_profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Col 11: Margin */}
                      <td
                        className="crm-sheet-num"
                        style={{ width: columnWidths.margin, minWidth: columnWidths.margin, maxWidth: columnWidths.margin, height: `${rowHeight}px` }}
                        title={hasComm ? `Margin: ${job.commercial.gross_margin_percent}%` : 'No quote'}
                      >
                        {hasComm ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <span className="crm-margin-percent" style={{ fontWeight: 800, color: job.commercial.gross_margin_percent >= 25.0 ? '#059669' : 'var(--warning)' }}>
                              {job.commercial.gross_margin_percent}%
                            </span>
                            <Badge type="grade" value={job.commercial.profitability_grade} />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Custom User Columns in tbody */}
                      {customColumns.map(col => {
                        const cellVal = customCellValues[job.id]?.[col.id] || '';
                        const colW = columnWidths[col.id] || col.width || 150;
                        return (
                          <td
                            key={col.id}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: colW,
                              minWidth: colW,
                              maxWidth: colW,
                              height: `${rowHeight}px`,
                              padding: '2px 6px'
                            }}
                          >
                            <input
                              type="text"
                              className="crm-custom-cell-input"
                              value={cellVal}
                              placeholder="—"
                              onChange={(e) => handleCustomCellChange(job.id, col.id, e.target.value)}
                              title={cellVal}
                            />
                          </td>
                        );
                      })}
                    </tr>

                    {/* Expanded Row: Smart Slider for Single Job Dossier */}
                    {isExpanded && (
                      <tr className="crm-sheet-expand-row" onClick={e => e.stopPropagation()}>
                        {/* FIX: Removed borders and padding from the outer td so the sticky wrapper can perfectly lock to the viewport edges without being pushed out */}
                        <td colSpan={11 + customColumns.length} style={{ padding: 0, border: 'none' }}>
                          <div
                            className="crm-sheet-slider-expand-wrapper"
                            style={{
                              // FIX: This section rigidly anchors the dossier to the screen. 
                              // Jab main table scroll hoga, yeh slider apni jagah se hilay ga nahi.
                              position: 'sticky',
                              left: 0,
                              display: 'block',
                              width: containerWidth && containerWidth > 0 ? `${containerWidth}px` : '100vw',
                              maxWidth: '100vw',
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                              zIndex: 20 // ensures it stays visually over any scrolling grid columns
                            }}
                          >
                            <JobDossierSlider
                              job={job}
                              jobIndex={jobIndex}
                              totalJobs={filteredJobs.length}
                              containerWidth={containerWidth}
                              onPrevJob={jobIndex > 0 ? () => setExpandedJobId(filteredJobs[jobIndex - 1].id) : undefined}
                              onNextJob={jobIndex < filteredJobs.length - 1 ? () => setExpandedJobId(filteredJobs[jobIndex + 1].id) : undefined}
                              onSelectSnapshot={setSelectedSnapshotQuoteId}
                              onNavigate={onNavigate}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>
                      No jobs match your search or filter criteria
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                      {isAnyFilterActive && (
                        <button onClick={handleResetFilters} className="btn btn-secondary btn-sm">
                          <RotateCcw size={14} /> Clear Filters
                        </button>
                      )}
                      <button onClick={() => onNavigate('new-lead')} className="btn btn-primary btn-sm">
                        <PlusCircle size={14} /> Create New Lead
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Mobile Cards View with Slider */}
      <div className="crm-mobile-cards">
        {filteredJobs.map((job, jobIndex) => {
          const isExpanded = expandedJobId === job.id;
          const hasComm = job.hasCommercialData && job.commercial;
          const formattedDate = job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

          return (
            <div
              key={job.id}
              className={`crm-mobile-card ${isExpanded ? 'expanded' : ''}`}
              onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{job.customer_name}</strong>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {job.reference_no} • {job.property?.address_line1}, {job.property?.postcode}
                  </div>
                </div>
                <span className={`crm-status-badge ${getStatusBadgeClass(job.status)}`}>
                  {job.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.785rem', margin: '10px 0', padding: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Heat Req: </span>
                  <strong>{job.design?.heatRequirementDisplay}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>ASHP: </span>
                  <strong>{job.design?.ashpModel}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Contribution: </span>
                  <strong style={{ color: hasComm && job.commercial.customer_contribution > 0 ? '#8b5cf6' : 'inherit' }}>
                    {hasComm ? `£${job.commercial.customer_contribution.toLocaleString()}` : '—'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Profit: </span>
                  <strong style={{ color: '#059669' }}>
                    {hasComm ? `£${job.commercial.gross_profit.toLocaleString()} (${job.commercial.gross_margin_percent}%)` : '—'}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                <span>Date: {formattedDate}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {isExpanded ? 'Hide dossier ▲' : 'Expand slider dossier ▼'}
                </span>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '14px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Update Status:</label>
                    <div style={{ flex: 1, maxWidth: '240px' }}>
                      <SearchableSelect
                        options={allStatusOptions}
                        value={job.status}
                        onChange={val => val && handleStatusChange(job.id, val)}
                        disabled={updatingStatusJobId === job.id}
                        compact={true}
                        searchable={false}
                      />
                    </div>
                  </div>

                  <JobDossierSlider
                    job={job}
                    jobIndex={jobIndex}
                    totalJobs={filteredJobs.length}
                    onPrevJob={jobIndex > 0 ? () => setExpandedJobId(filteredJobs[jobIndex - 1].id) : undefined}
                    onNextJob={jobIndex < filteredJobs.length - 1 ? () => setExpandedJobId(filteredJobs[jobIndex + 1].id) : undefined}
                    onSelectSnapshot={setSelectedSnapshotQuoteId}
                    onNavigate={onNavigate}
                  />
                </div>
              )}
            </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No jobs match your search or filter criteria.</p>
            <button onClick={() => onNavigate('new-lead')} className="btn btn-primary btn-sm">
              <PlusCircle size={14} /> Create New Lead
            </button>
          </div>
        )}
      </div>

      {/* 9. Recent Activity Bar */}
      {recentActivity.length > 0 && (
        <div className="crm-activity-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Recent CRM Audit & Operational Activity
            </span>
            <Activity size={15} style={{ color: 'var(--text-muted)' }} />
          </div>

          <div>
            {recentActivity.slice(0, 5).map((act: any) => (
              <div key={act.id} className="crm-activity-item">
                <div>
                  <span style={{ fontWeight: 700 }}>{act.userName}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>•</span>
                  <span>{act.reason || `${act.action} on ${act.entityId}`}</span>
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  {act.createdAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Column Modal */}
      {isAddColModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddColModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: '16px', paddingBottom: '10px' }}>
              <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Columns size={16} style={{ color: 'var(--primary)' }} />
                <span>Add Custom Column</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddColModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newColTitle.trim()) {
                handleAddCustomColumn(newColTitle.trim());
                setNewColTitle('');
                setIsAddColModalOpen(false);
              }
            }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ marginBottom: '6px' }}>
                  Column Title / Header Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Surveyor Notes, Target Date, PO Ref"
                  value={newColTitle}
                  onChange={e => setNewColTitle(e.target.value)}
                  autoFocus
                  required
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  This creates an interactive editable column on each job row in the spreadsheet.
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsAddColModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!newColTitle.trim()}
                >
                  <Plus size={14} /> Add Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Row Modal */}
      {isAddRowModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddRowModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: '16px', paddingBottom: '10px' }}>
              <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} style={{ color: 'var(--primary)' }} />
                <span>Quick Add Job / Lead Row</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRowModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateNewRow}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Eleanor Vance"
                  value={newRowData.customerName}
                  onChange={e => setNewRowData(prev => ({ ...prev, customerName: e.target.value }))}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Address Line 1</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 14 Primrose Hill"
                  value={newRowData.addressLine1}
                  onChange={e => setNewRowData(prev => ({ ...prev, addressLine1: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Postcode</label>
                  <input
                    type="text"
                    className="form-control font-mono"
                    placeholder="e.g. NW1 8XL"
                    value={newRowData.postcode}
                    onChange={e => setNewRowData(prev => ({ ...prev, postcode: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="07700 900123"
                    value={newRowData.phone}
                    onChange={e => setNewRowData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Property Type</label>
                <select
                  className="form-control"
                  value={newRowData.propertyType}
                  onChange={e => setNewRowData(prev => ({ ...prev, propertyType: e.target.value }))}
                >
                  <option value="Semi detached">Semi detached</option>
                  <option value="Detached">Detached</option>
                  <option value="Terraced">Terraced</option>
                  <option value="End terrace">End terrace</option>
                  <option value="Flat">Flat</option>
                  <option value="Bungalow">Bungalow</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsAddRowModalOpen(false);
                    onNavigate('new-lead');
                  }}
                  title="Open full quote wizard"
                >
                  Full Wizard →
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsAddRowModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={isSubmittingRow || !newRowData.customerName.trim()}
                  >
                    {isSubmittingRow ? 'Adding...' : 'Add Row'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snapshot Inspection Modal */}
      {selectedSnapshotQuoteId && (
        <SnapshotModal
          quoteId={selectedSnapshotQuoteId}
          onClose={() => setSelectedSnapshotQuoteId(null)}
        />
      )}

      {/* Right-Click Context Menu for Job Row */}
      {contextMenu && (
        <div
          className="crm-context-menu"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="crm-context-menu-header">
            <span className="crm-context-menu-ref">{contextMenu.job.reference_no}</span>
            <span className="crm-context-menu-name">{contextMenu.job.customer_name}</span>
          </div>

          <button
            type="button"
            className="crm-context-menu-item"
            onClick={() => handleStartEditJob(contextMenu.job)}
          >
            <Edit3 size={14} style={{ color: 'var(--primary)' }} />
            <span>Edit Job</span>
          </button>

          <button
            type="button"
            className="crm-context-menu-item"
            onClick={() => {
              setExpandedJobId(contextMenu.job.id);
              setContextMenu(null);
            }}
          >
            <Eye size={14} />
            <span>View Job Dossier</span>
          </button>

          <button
            type="button"
            className="crm-context-menu-item"
            onClick={() => {
              if (contextMenu.job?.reference_no) {
                navigator.clipboard.writeText(contextMenu.job.reference_no);
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
              }
              setContextMenu(null);
            }}
          >
            <Copy size={14} />
            <span>{copiedRef ? 'Copied!' : 'Copy Reference'}</span>
          </button>

          <div className="crm-context-menu-divider" />

          <button
            type="button"
            className="crm-context-menu-item danger"
            onClick={() => {
              const targetJob = contextMenu.job;
              setContextMenu(null);
              handleDeleteJob(targetJob);
            }}
          >
            <Trash2 size={14} />
            <span>Delete Job</span>
          </button>
        </div>
      )}

      {/* 5-Second Undo Toast Notification */}
      {deleteToast && (
        <div className="crm-undo-toast" role="alert" onClick={(e) => e.stopPropagation()}>
          <div className="crm-undo-toast-content">
            <Trash2 size={18} className="crm-undo-toast-icon" />
            <div className="crm-undo-toast-text">
              <span className="crm-undo-toast-title">
                Job <strong>{deleteToast.job?.reference_no}</strong> deleted
              </span>
              <span className="crm-undo-toast-subtitle">
                {deleteToast.job?.customer_name} ({deleteToast.countdown}s remaining)
              </span>
            </div>
            <button
              type="button"
              className="crm-undo-toast-btn"
              onClick={() => handleUndoDelete()}
              title="Undo job deletion"
            >
              <Undo2 size={13} />
              <span>Undo ({deleteToast.countdown}s)</span>
            </button>
            <button
              type="button"
              className="crm-undo-toast-close"
              onClick={() => commitPendingDelete()}
              title="Delete permanently now"
            >
              <X size={14} />
            </button>
          </div>
          <div className="crm-undo-toast-progress" />
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="modal-backdrop" onClick={() => !isSavingEdit && setEditingJob(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '540px', width: '92vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                    Edit Job — {editingJob.reference_no}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Update customer, status, property and notes
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !isSavingEdit && setEditingJob(null)}
                disabled={isSavingEdit}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditJob} style={{ padding: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Customer Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.customerName}
                  onChange={e => setEditFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Status</label>
                  <select
                    className="form-control"
                    value={editFormData.status}
                    onChange={e => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    {ALL_17_STATUSES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Property Type</label>
                  <select
                    className="form-control"
                    value={editFormData.propertyType}
                    onChange={e => setEditFormData(prev => ({ ...prev, propertyType: e.target.value }))}
                  >
                    <option value="Semi detached">Semi detached</option>
                    <option value="Detached">Detached</option>
                    <option value="Terraced">Terraced</option>
                    <option value="End terrace">End terrace</option>
                    <option value="Flat">Flat</option>
                    <option value="Bungalow">Bungalow</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Address Line 1</label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.addressLine1}
                  onChange={e => setEditFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Postcode</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFormData.postcode}
                    onChange={e => setEditFormData(prev => ({ ...prev, postcode: e.target.value.toUpperCase() }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFormData.phone}
                    onChange={e => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Sales Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={editFormData.salesNotes}
                  onChange={e => setEditFormData(prev => ({ ...prev, salesNotes: e.target.value }))}
                  placeholder="Enter internal notes, customer preferences or updates..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingJob(null)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSavingEdit || !editFormData.customerName.trim()}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};