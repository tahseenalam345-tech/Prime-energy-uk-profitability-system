import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Plus, CheckCircle2, Clock, AlertTriangle, XCircle, ChevronRight,
  Upload, Trash2, ArrowLeft, ExternalLink, ShieldCheck, UserCheck, HelpCircle,
  FileCheck, Calendar, Filter, Sparkles, AlertCircle, Building2, RefreshCw, FileCode, History
} from 'lucide-react';
import { api } from '../services/api.js';
import {
  Submission, SubmissionItem, SubmissionEvidence, SubmissionSummary, User, Lead
} from '../types.js';

interface SubmissionsViewProps {
  currentUser: User | null;
  onNavigateToLead?: (leadId: string) => void;
}

const STAGES = [
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

const STATUS_OPTIONS = [
  'Pending', 'In Progress', 'Awaiting Customer', 'Awaiting Ofgem',
  'Awaiting MCS', 'Awaiting Supplier', 'Completed', 'Not Required',
  'Rejected', 'Expired', 'Superseded', 'Needs Review'
];

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({ currentUser }) => {
  // Navigation & View mode
  const [activeView, setActiveView] = useState<'home' | 'workspace'>('home');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Home view states
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');

  // Create Submission Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [existingLeads, setExistingLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPostcode, setNewPostcode] = useState('');
  const [newTechnology, setNewTechnology] = useState('Air-to-water heat pump');
  const [newGrantCategory, setNewGrantCategory] = useState('£7,500 Standard AWHP/GSHP');
  const [newPropertyStatus, setNewPropertyStatus] = useState('Existing property');
  const [newOnOffGas, setNewOnOffGas] = useState('On gas grid');
  const [newExistingFuel, setNewExistingFuel] = useState('Mains Gas');
  const [newCylinderApp, setNewCylinderApp] = useState(true);
  const [creating, setCreating] = useState(false);

  // Workspace View States
  const [workspace, setWorkspace] = useState<Submission | null>(null);
  const [activeStageCode, setActiveStageCode] = useState('01_eligibility');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Requirement Item Detail Modal / Side Panel
  const [selectedItem, setSelectedItem] = useState<SubmissionItem | null>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // Upload Evidence States
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [evidenceDataUrl, setEvidenceDataUrl] = useState('');
  const [evidenceFileType, setEvidenceFileType] = useState('');
  const [evidenceFileSize, setEvidenceFileSize] = useState(0);
  const [evidenceRefNo, setEvidenceRefNo] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Load Home Data
  const loadSubmissionsData = async () => {
    setLoading(true);
    try {
      const [sumRes, subList] = await Promise.all([
        api.getSubmissionsSummary(),
        api.getSubmissions({
          search: searchQuery,
          stage: stageFilter,
          status: statusFilter,
          technology: techFilter
        })
      ]);
      setSummary(sumRes);
      setSubmissions(subList);
    } catch (err) {
      console.error('Failed to load submissions list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'home') {
      loadSubmissionsData();
    }
  }, [activeView, searchQuery, stageFilter, statusFilter, techFilter]);

  // Load Workspace Detail Data
  const loadWorkspace = async (id: string) => {
    setWorkspaceLoading(true);
    try {
      const data = await api.getSubmissionDetail(id);
      setWorkspace(data);
      if (data.current_stage) {
        const found = STAGES.find(s => s.name === data.current_stage);
        if (found) setActiveStageCode(found.code);
      }
    } catch (err) {
      console.error('Failed to load workspace', err);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleOpenWorkspace = (id: string) => {
    setSelectedSubmissionId(id);
    setActiveView('workspace');
    loadWorkspace(id);
  };

  // Open Create Submission Modal
  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const leads = await api.getLeads();
      setExistingLeads(leads || []);
    } catch (err) {
      console.error('Failed to load leads for create submission modal', err);
    }
  };

  const handleSelectLeadForCreation = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = existingLeads.find(l => l.id === leadId);
    if (lead) {
      setNewCustomerName(lead.customer_name || '');
      setNewCustomerEmail(lead.email || '');
      setNewCustomerPhone(lead.phone || '');
      setNewAddress(lead.address_line1 || '');
      setNewPostcode(lead.postcode || '');
      if (lead.property_status) setNewPropertyStatus(lead.property_status);
      if (lead.on_off_gas_grid) setNewOnOffGas(lead.on_off_gas_grid);
    }
  };

  const handleCreateSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newAddress) return;
    setCreating(true);
    try {
      const created = await api.createSubmission({
        lead_id: selectedLeadId || undefined,
        customer_name: newCustomerName,
        customer_email: newCustomerEmail,
        customer_phone: newCustomerPhone,
        property_address: newAddress,
        postcode: newPostcode,
        technology: newTechnology,
        grant_category: newGrantCategory,
        property_status: newPropertyStatus,
        on_off_gas_grid: newOnOffGas,
        existing_fuel: newExistingFuel,
        cylinder_applicable: newCylinderApp ? 1 : 0
      });
      setShowCreateModal(false);
      handleOpenWorkspace(created.id);
    } catch (err) {
      console.error('Failed to create submission', err);
    } finally {
      setCreating(false);
    }
  };

  // Open Item Detail Panel
  const handleOpenItemDetail = async (item: SubmissionItem) => {
    if (!selectedSubmissionId) return;
    setItemLoading(true);
    setSelectedItem(item);
    try {
      const detail = await api.getSubmissionItemDetail(selectedSubmissionId, item.id);
      setSelectedItem(detail);
    } catch (err) {
      console.error('Failed to load item detail', err);
    } finally {
      setItemLoading(false);
    }
  };

  // Update Item Status or Metadata
  const handleUpdateItem = async (updates: Partial<SubmissionItem>) => {
    if (!selectedSubmissionId || !selectedItem) return;
    setSavingItem(true);
    try {
      const updated = await api.updateSubmissionItem(selectedSubmissionId, selectedItem.id, {
        ...updates,
        user_name: currentUser?.name || 'Staff User',
        user_id: currentUser?.id || 'staff'
      });
      setSelectedItem(updated);
      // Reload workspace in background to sync completion stats
      loadWorkspace(selectedSubmissionId);
    } catch (err) {
      console.error('Failed to update requirement item', err);
    } finally {
      setSavingItem(false);
    }
  };

  // Handle Evidence File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEvidenceFileName(file.name);
      setEvidenceFileType(file.type);
      setEvidenceFileSize(file.size);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setEvidenceDataUrl(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Upload Evidence
  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionId || !selectedItem || !evidenceFileName || !evidenceDataUrl) return;
    setUploading(true);
    try {
      await api.uploadSubmissionEvidence(selectedSubmissionId, selectedItem.id, {
        file_name: evidenceFileName,
        file_type: evidenceFileType,
        file_size: evidenceFileSize,
        file_data_url: evidenceDataUrl,
        reference_no: evidenceRefNo,
        uploaded_by: currentUser?.name || 'Staff User',
        notes: evidenceNotes
      });
      // Reset upload inputs
      setEvidenceFileName('');
      setEvidenceDataUrl('');
      setEvidenceFileType('');
      setEvidenceFileSize(0);
      setEvidenceRefNo('');
      setEvidenceNotes('');
      // Reload item detail
      const refreshedItem = await api.getSubmissionItemDetail(selectedSubmissionId, selectedItem.id);
      setSelectedItem(refreshedItem);
      loadWorkspace(selectedSubmissionId);
    } catch (err) {
      console.error('Failed to upload evidence file', err);
    } finally {
      setUploading(false);
    }
  };

  // Delete Evidence File
  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!selectedSubmissionId || !selectedItem) return;
    try {
      await api.deleteSubmissionEvidence(selectedSubmissionId, selectedItem.id, evidenceId);
      const refreshedItem = await api.getSubmissionItemDetail(selectedSubmissionId, selectedItem.id);
      setSelectedItem(refreshedItem);
      loadWorkspace(selectedSubmissionId);
    } catch (err) {
      console.error('Failed to delete evidence file', err);
    }
  };

  // Status Badge Colors Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <span className="badge badge-success" style={{ fontWeight: 700, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>COMPLETED</span>;
      case 'In Progress':
        return <span className="badge badge-primary" style={{ fontWeight: 700, background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}>IN PROGRESS</span>;
      case 'Awaiting Customer':
        return <span className="badge badge-warning" style={{ fontWeight: 700, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}>AWAITING CUSTOMER</span>;
      case 'Awaiting Ofgem':
        return <span className="badge badge-warning" style={{ fontWeight: 700, background: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }}>AWAITING OFGEM</span>;
      case 'Awaiting MCS':
        return <span className="badge badge-primary" style={{ fontWeight: 700, background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc' }}>AWAITING MCS</span>;
      case 'Not Required':
        return <span className="badge badge-neutral" style={{ fontWeight: 600, background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>NOT REQUIRED</span>;
      case 'Rejected':
      case 'Blocked':
        return <span className="badge badge-danger" style={{ fontWeight: 700, background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }}>REJECTED</span>;
      case 'Needs Review':
        return <span className="badge badge-warning" style={{ fontWeight: 700, background: '#fae8ff', color: '#86198f', border: '1px solid #f0abfc' }}>NEEDS REVIEW</span>;
      default:
        return <span className="badge badge-neutral" style={{ fontWeight: 600 }}>{status.toUpperCase()}</span>;
    }
  };

  // Classification Badge Helper
  const getClassificationBadge = (cls: string) => {
    switch (cls) {
      case 'OFFICIAL':
        return <span className="badge" style={{ fontWeight: 700, background: '#059669', color: '#ffffff', fontSize: '0.65rem' }}>OFFICIAL REQUIREMENT</span>;
      case 'CONDITIONAL':
        return <span className="badge" style={{ fontWeight: 700, background: '#2563eb', color: '#ffffff', fontSize: '0.65rem' }}>CONDITIONAL</span>;
      case 'PRIME ENERGY INTERNAL':
        return <span className="badge" style={{ fontWeight: 700, background: '#d97706', color: '#ffffff', fontSize: '0.65rem' }}>PRIME INTERNAL CONTROL</span>;
      case 'NEEDS CONFIRMATION':
        return <span className="badge" style={{ fontWeight: 700, background: '#dc2626', color: '#ffffff', fontSize: '0.65rem' }}>NEEDS CONFIRMATION</span>;
      default:
        return <span className="badge" style={{ fontSize: '0.65rem' }}>{cls}</span>;
    }
  };

  // =========================================================================
  // VIEW 1: SUBMISSIONS HOME SCREEN
  // =========================================================================
  if (activeView === 'home') {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={26} color="var(--primary)" />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                SUBMISSIONS WORKFLOW MODULE
              </h1>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              UK Heat Pump BUS & MCS Compliance Master Evidence & Stage Tracker
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
          >
            <Plus size={18} />
            <span>Create New Submission</span>
          </button>
        </div>

        {/* Dashboard Summary Counter Cards */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid var(--primary)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Jobs</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>{summary.totalActive}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #64748b', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>{summary.pending}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #2563eb', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>In Progress</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{summary.inProgress}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #d97706', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Awaiting Customer</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{summary.awaitingCustomer}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #ea580c', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Awaiting Ofgem</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>{summary.awaitingOfgem}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #7c3aed', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Awaiting MCS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>{summary.awaitingMcs}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #059669', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{summary.completed}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #dc2626', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overdue</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{summary.overdue}</div>
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by Job Ref, Customer name, address or postcode..."
                style={{ paddingLeft: '34px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            <div style={{ width: '180px' }}>
              <select className="form-control" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="">All 12 Stages</option>
                {STAGES.map(s => (
                  <option key={s.code} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '170px' }}>
              <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '190px' }}>
              <select className="form-control" value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
                <option value="">All Technologies</option>
                <option value="Air-to-water heat pump">Air-to-water ASHP</option>
                <option value="Ground-source heat pump">Ground-source GSHP</option>
                <option value="Air-to-air heat pump">Air-to-air AAHP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clean Job Cards List */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p>Loading submission workspaces...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <FileText size={40} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>No Submissions Found</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.9rem' }}>
              Create a new submission workspace to begin tracking UK BUS & MCS compliance evidence.
            </p>
            <button type="button" className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleOpenCreateModal}>
              Create First Submission
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {submissions.map(sub => (
              <div
                key={sub.id}
                className="card"
                onClick={() => handleOpenWorkspace(sub.id)}
                style={{
                  padding: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span className="badge badge-primary" style={{ fontWeight: 800, fontSize: '0.75rem', background: '#059669', color: '#ffffff' }}>
                        {sub.job_reference}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px', margin: '4px 0 0 0' }}>
                        {sub.customer_name}
                      </h3>
                    </div>
                    {getStatusBadge(sub.overall_status)}
                  </div>

                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={14} color="var(--primary)" />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{sub.property_address}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', marginBottom: '12px' }}>
                    <span style={{ padding: '3px 8px', background: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: 600 }}>
                      ⚡ {sub.technology}
                    </span>
                    <span style={{ padding: '3px 8px', background: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border)', color: '#059669', fontWeight: 700 }}>
                      {sub.grant_category}
                    </span>
                  </div>

                  {/* Stage & Progress Bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                      <span style={{ color: 'var(--primary)' }}>Stage: {sub.current_stage}</span>
                      <span style={{ color: 'var(--text-main)' }}>{sub.completion_percentage}% Completed</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${sub.completion_percentage}%`,
                          height: '100%',
                          background: sub.completion_percentage === 100 ? '#059669' : 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                          borderRadius: '4px',
                          transition: 'width 0.4s'
                        }}
                      />
                    </div>
                  </div>

                  {/* Next Action Alert */}
                  {sub.next_action && (
                    <div style={{ padding: '6px 10px', borderRadius: '6px', background: '#fef3c7', border: '1px solid #fde047', color: '#92400e', fontSize: '0.75rem', fontWeight: 600 }}>
                      👉 {sub.next_action}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Updated: {new Date(sub.updated_at).toLocaleDateString()}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: 700 }}>
                    Open Workspace <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE NEW SUBMISSION MODAL */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, padding: '16px' }}>
            <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '24px', background: 'var(--bg-card)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Create New Submission Workspace</h3>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <XCircle size={22} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmissionSubmit} className="space-y-4">
                {existingLeads.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Link Existing Lead (Optional)</label>
                    <select
                      className="form-control"
                      value={selectedLeadId}
                      onChange={(e) => handleSelectLeadForCreation(e.target.value)}
                    >
                      <option value="">-- Create Standalone Submission --</option>
                      {existingLeads.map(l => (
                        <option key={l.id} value={l.id}>{l.reference_no} — {l.customer_name} ({l.address_line1})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input type="text" required className="form-control" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="e.g. John Smith" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} placeholder="john@example.com" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Property Address *</label>
                    <input type="text" required className="form-control" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="14 High Street, Manchester" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Postcode</label>
                    <input type="text" className="form-control" value={newPostcode} onChange={e => setNewPostcode(e.target.value)} placeholder="M1 4BT" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Technology</label>
                    <select className="form-control" value={newTechnology} onChange={e => setNewTechnology(e.target.value)}>
                      <option value="Air-to-water heat pump">Air-to-water heat pump (AWHP)</option>
                      <option value="Ground-source heat pump">Ground-source heat pump (GSHP)</option>
                      <option value="Air-to-air heat pump">Air-to-air heat pump (AAHP)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">BUS Grant Category</label>
                    <select className="form-control" value={newGrantCategory} onChange={e => setNewGrantCategory(e.target.value)}>
                      <option value="£7,500 Standard AWHP/GSHP">£7,500 Standard AWHP/GSHP Grant</option>
                      <option value="£9,000 Off-Gas Oil/LPG Uplift">£9,000 Off-Gas Oil/LPG Uplift</option>
                      <option value="£2,500 AAHP Grant">£2,500 AAHP Grant</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Property Status</label>
                    <select className="form-control" value={newPropertyStatus} onChange={e => setNewPropertyStatus(e.target.value)}>
                      <option value="Existing property">Existing property</option>
                      <option value="Self-build">Self-build</option>
                      <option value="Developer new-build">Developer new-build</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gas Grid</label>
                    <select className="form-control" value={newOnOffGas} onChange={e => setNewOnOffGas(e.target.value)}>
                      <option value="On gas grid">On gas grid</option>
                      <option value="Off gas grid">Off gas grid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Existing Fuel</label>
                    <select className="form-control" value={newExistingFuel} onChange={e => setNewExistingFuel(e.target.value)}>
                      <option value="Mains Gas">Mains Gas</option>
                      <option value="Heating Oil">Heating Oil</option>
                      <option value="Bulk LPG">Bulk LPG</option>
                      <option value="Electricity">Electricity</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <input type="checkbox" id="cylCheck" checked={newCylinderApp} onChange={e => setNewCylinderApp(e.target.checked)} />
                  <label htmlFor="cylCheck" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                    Hot Water Storage Cylinder Applicable
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? 'Creating Workspace...' : 'Initialize 42-Step Submission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: SUBMISSION WORKSPACE SCREEN
  // =========================================================================
  const currentStageObj = workspace?.stages?.find(s => s.code === activeStageCode);

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveView('home')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}
            >
              <ArrowLeft size={14} /> Back to Submissions Home
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.85rem', fontWeight: 800, background: '#059669', color: '#ffffff' }}>
                {workspace?.job_reference || 'SUB-2026-JOB'}
              </span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {workspace?.customer_name}
              </h1>
              {workspace && getStatusBadge(workspace.overall_status)}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              📍 {workspace?.property_address} ({workspace?.postcode}) | ⚡ {workspace?.technology}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
              {workspace?.overallCompletionPercentage || 0}% Complete
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Retention Lock: <strong>{workspace?.six_year_retention_date || '6 Years'}</strong> (BUS Reg 17)
            </div>
          </div>
        </div>

        {/* Quick Meta Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
          <div>Grant Category: <strong style={{ color: '#059669' }}>{workspace?.grant_category}</strong></div>
          <div>Property Status: <strong>{workspace?.property_status}</strong></div>
          <div>Gas Grid: <strong>{workspace?.on_off_gas_grid}</strong> ({workspace?.existing_fuel})</div>
          <div>BUS Voucher: <strong>{workspace?.bus_voucher_reference || 'Pending App'}</strong></div>
          <div>MCS Cert: <strong>{workspace?.mcs_certificate_number || 'Pending MID'}</strong></div>
        </div>

        {/* Top Next Action Alert */}
        {workspace?.next_action && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde047', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#b45309" />
            <span>{workspace.next_action}</span>
          </div>
        )}
      </div>

      {/* 12-Stage Navigation Workflow Bar */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: '6px', paddingBottom: '4px' }}>
        {STAGES.map((stg) => {
          const stgSummary = workspace?.stages?.find(s => s.code === stg.code);
          const isActive = activeStageCode === stg.code;
          const isCompleted = stgSummary?.status === 'Completed';
          const isBlocked = stgSummary?.status === 'Blocked';

          return (
            <button
              key={stg.code}
              type="button"
              onClick={() => setActiveStageCode(stg.code)}
              style={{
                flex: '0 0 auto',
                padding: '10px 14px',
                borderRadius: '8px',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: isActive ? 'var(--primary-light)' : 'var(--bg-card)',
                color: isActive ? 'var(--primary-dark)' : 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {isCompleted ? (
                <CheckCircle2 size={14} color="#059669" />
              ) : isBlocked ? (
                <AlertCircle size={14} color="#dc2626" />
              ) : (
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>●</span>
              )}
              <span>{stg.name}</span>
              {stgSummary && (
                <span style={{ fontSize: '0.7rem', padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-panel)', color: 'var(--text-muted)' }}>
                  {stgSummary.completedCount}/{stgSummary.applicableCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* STAGE PAGE CONTENT */}
      {workspaceLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading stage requirements...</p>
        </div>
      ) : currentStageObj ? (
        <div className="space-y-4">
          {/* Stage Header Banner */}
          <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-panel)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {currentStageObj.name} REQUIREMENTS & EVIDENCE
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                {currentStageObj.completedCount} of {currentStageObj.applicableCount} applicable stage items completed ({currentStageObj.completionPercentage}%)
              </p>
            </div>
            <div style={{ width: '160px' }}>
              <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${currentStageObj.completionPercentage}%`, height: '100%', background: '#059669' }} />
              </div>
            </div>
          </div>

          {/* Requirement Items Cards List */}
          <div className="space-y-3">
            {currentStageObj.items.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '16px',
                  background: item.status === 'Not Required' ? 'var(--bg-canvas)' : 'var(--bg-card)',
                  opacity: item.status === 'Not Required' ? 0.65 : 1,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', background: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {item.section_name}
                    </span>
                    {getClassificationBadge(item.classification)}
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      {item.title}
                    </h4>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 6px 0' }}>
                    {item.short_description || item.what_is_this}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Completes: <strong>{item.who_completes || 'Staff'}</strong></span>
                    <span>Submits: <strong>{item.who_submits || 'Internal'}</strong></span>
                    <span>Signature: <strong style={{ color: '#2563eb' }}>{item.customer_signature_type}</strong></span>
                    {item.due_date && <span>Due: <strong>{item.due_date}</strong></span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Evidence Count Badge */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {item.evidenceCount && item.evidenceCount > 0 ? (
                      <span className="badge badge-success" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                        📎 {item.evidenceCount} Files
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No Files Uploaded</span>
                    )}
                  </div>

                  {/* Status Chip */}
                  {getStatusBadge(item.status)}

                  {/* Open Detail Button */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenItemDetail(item)}
                    style={{ fontWeight: 700, padding: '6px 14px' }}
                  >
                    Open Detail & Evidence
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* REQUIREMENT ITEM DETAIL SIDE PANEL / MODAL */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1070, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '850px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'var(--bg-card)', borderRadius: '12px' }}>
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {getClassificationBadge(selectedItem.classification)}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedItem.stage_name} → {selectedItem.section_name}</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {selectedItem.title}
                </h3>
              </div>

              <button type="button" onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <XCircle size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }} className="space-y-6">
              {itemLoading ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
                  <p>Loading item specification & evidence files...</p>
                </div>
              ) : (
                <>
                  {/* Plain-English Explanation */}
                  <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      What is this? (Plain-English)
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0 }}>
                      {selectedItem.what_is_this || selectedItem.short_description}
                    </p>
                  </div>

                  {/* Why Required */}
                  <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HelpCircle size={16} color="#1d4ed8" /> Why is this required?
                    </div>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      {selectedItem.why_required}
                    </p>
                  </div>

                  {/* Core Attribute Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.825rem' }}>
                    <div style={{ padding: '10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Who Completes</span>
                      <strong style={{ color: 'var(--text-main)' }}>{selectedItem.who_completes || 'Installer'}</strong>
                    </div>

                    <div style={{ padding: '10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Who Submits</span>
                      <strong style={{ color: 'var(--text-main)' }}>{selectedItem.who_submits || 'Installer'}</strong>
                    </div>

                    <div style={{ padding: '10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Customer Signature</span>
                      <strong style={{ color: '#2563eb' }}>{selectedItem.customer_signature_type}</strong>
                    </div>

                    <div style={{ padding: '10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Authority Source</span>
                      <strong style={{ color: 'var(--text-main)' }}>{selectedItem.authority || 'Ofgem / MCS'}</strong>
                      {selectedItem.source_url && (
                        <a href={selectedItem.source_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px' }}>
                          View Source <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Status & Assignment Controls Form */}
                  <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }} className="space-y-4">
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Update Requirement Status & Management</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Requirement Status</label>
                        <select
                          className="form-control"
                          value={selectedItem.status}
                          onChange={(e) => handleUpdateItem({ status: e.target.value })}
                        >
                          {STATUS_OPTIONS.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Responsible Person</label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedItem.responsible_person || ''}
                          onChange={(e) => handleUpdateItem({ responsible_person: e.target.value })}
                          placeholder="e.g. Lead Surveyor"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Due Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={selectedItem.due_date || ''}
                          onChange={(e) => handleUpdateItem({ due_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Reference Number / Document ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedItem.reference_number || ''}
                          onChange={(e) => handleUpdateItem({ reference_number: e.target.value })}
                          placeholder="e.g. MCS-10928374 or EPC-9920182"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Signature Requirement Rule</label>
                        <select
                          className="form-control"
                          value={selectedItem.customer_signature_type}
                          onChange={(e) => handleUpdateItem({ customer_signature_type: e.target.value })}
                        >
                          <option value="No signature">No signature</option>
                          <option value="Customer signature">Customer signature</option>
                          <option value="Ofgem electronic consent">Ofgem electronic consent</option>
                          <option value="Conditional">Conditional</option>
                          <option value="Installer/portal authentication">Installer/portal authentication</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Notes & Audit Remarks</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={selectedItem.notes || ''}
                        onChange={(e) => handleUpdateItem({ notes: e.target.value })}
                        placeholder="Add compliance notes or findings..."
                      />
                    </div>
                  </div>

                  {/* EVIDENCE FILE MANAGEMENT AREA */}
                  <div className="space-y-4">
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={18} color="var(--primary)" /> Evidence Files ({selectedItem.evidenceFiles?.length || 0})
                    </h4>

                    {/* Upload New Evidence Form */}
                    <form onSubmit={handleUploadEvidence} style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px border var(--border)' }} className="space-y-3">
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                        <div>
                          <label className="form-label">Choose Document File (PDF, JPG, PNG, DOCX)</label>
                          <input type="file" className="form-control" onChange={handleFileChange} />
                        </div>

                        <div>
                          <label className="form-label">Ref / Cert No</label>
                          <input type="text" className="form-control" value={evidenceRefNo} onChange={e => setEvidenceRefNo(e.target.value)} placeholder="Ref # (optional)" />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <input type="text" className="form-control" style={{ maxWidth: '400px' }} value={evidenceNotes} onChange={e => setEvidenceNotes(e.target.value)} placeholder="File notes (e.g. Signed survey sheet)" />
                        <button type="submit" className="btn btn-primary btn-sm" disabled={uploading || !evidenceFileName}>
                          {uploading ? 'Uploading...' : 'Upload Evidence File'}
                        </button>
                      </div>
                    </form>

                    {/* List of Evidence Files */}
                    {selectedItem.evidenceFiles && selectedItem.evidenceFiles.length > 0 ? (
                      <div className="space-y-2">
                        {selectedItem.evidenceFiles.map((file) => (
                          <div key={file.id} style={{ padding: '10px 14px', borderRadius: '6px', background: 'var(--bg-panel)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <a href={file.file_path_or_url} download={file.file_name} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>
                                📄 {file.file_name}
                              </a>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Uploaded by {file.uploaded_by} on {new Date(file.uploaded_at).toLocaleString()} {file.reference_no ? `| Ref: ${file.reference_no}` : ''}
                              </div>
                            </div>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteEvidence(file.id)} style={{ padding: '4px 8px' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No evidence files attached to this requirement yet.
                      </div>
                    )}
                  </div>

                  {/* AUDIT HISTORY TIMELINE */}
                  {selectedItem.auditLogs && selectedItem.auditLogs.length > 0 && (
                    <div className="space-y-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={16} color="var(--primary)" /> Activity & Audit History
                      </h4>
                      <div className="space-y-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {selectedItem.auditLogs.map((log) => (
                          <div key={log.id} style={{ fontSize: '0.75rem', padding: '8px 12px', background: 'var(--bg-panel)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                              <strong>{log.user_name || 'Staff User'}</strong>
                              <span>{new Date(log.changed_at).toLocaleString()}</span>
                            </div>
                            <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>
                              Field changed: <code>{log.field_changed}</code> | Old: <s>{log.old_value || 'none'}</s> → New: <strong>{log.new_value}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)}>
                Close Detail Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
