import React, { useState, useEffect } from 'react';
import { Settings, Shield, History, Save, CheckCircle2, AlertTriangle, Users, Database, ExternalLink, ArrowRight } from 'lucide-react';
import { api } from '../services/api.js';
import { User } from '../types.js';

interface AdminViewProps {
  currentUser: User | null;
  onNavigate?: (tab: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, onNavigate }) => {
  const [settings, setSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Editable fields
  const [targetMargin, setTargetMargin] = useState<number>(25);
  const [labourBase, setLabourBase] = useState<number>(1500);
  const [leadGenCost, setLeadGenCost] = useState<number>(300);
  const [extrasCost, setExtrasCost] = useState<number>(200);
  const [combiAllowance, setCombiAllowance] = useState<number>(500);
  const [microboreAllowance, setMicroboreAllowance] = useState<number>(1800);
  const [notes, setNotes] = useState('');

  const loadAdminData = async () => {
    try {
      const [settingsRes, logsRes] = await Promise.all([
        api.getCommercialSettings(),
        api.getAuditLogs()
      ]);

      const s = settingsRes.settings;
      if (s) {
        setSettings(s);
        setTargetMargin(Math.round(s.target_gross_margin * 100));
        setLabourBase(s.labour_baseline);
        setLeadGenCost(s.lead_generation_cost);
        setExtrasCost(s.extras_contingency);
        setCombiAllowance(s.combi_conversion_allowance);
        setMicroboreAllowance(s.microbore_repipe_allowance);
      }
      setAuditLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSuccessMessage('');
    try {
      await api.updateCommercialSettings({
        targetGrossMargin: targetMargin / 100,
        labourBaseline: Number(labourBase),
        leadGenerationCost: Number(leadGenCost),
        extrasContingency: Number(extrasCost),
        combiConversionAllowance: Number(combiAllowance),
        microboreRepipeAllowance: Number(microboreAllowance),
        notes: notes || `Commercial settings updated by ${currentUser?.name}`,
        userId: currentUser?.id || 'user_admin'
      });
      setSuccessMessage('Commercial settings version updated successfully. Historical calculations preserved.');
      loadAdminData();
    } catch (err: any) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const isAdmin = currentUser?.role_name === 'ADMIN';

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Administration, Governance & Audit Trail
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Configure company-wide commercial assumptions, baseline allowances, and inspect all auditable system events.
        </p>
      </div>

      {/* Master Product Data Navigation Banner */}
      <div 
        className="card" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '16px 20px', 
          marginBottom: '20px', 
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(2, 132, 199, 0.1) 100%)',
          border: '1px solid var(--primary)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Authoritative Master Product Database
            </h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Inspect all verified products across ASHP, Cylinders, Radiators, Pipework, and Accessories with separate rated output kW, MCS status, and multi-supplier pricing.
          </p>
        </div>
        {onNavigate && (
          <button 
            onClick={() => onNavigate('products')}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            Open Admin Product Data <ArrowRight size={15} />
          </button>
        )}
      </div>

      {!isAdmin && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
          <strong>Read-Only View:</strong> You are currently logged in with the <strong>{currentUser?.role_name}</strong> role. Only <strong>ADMIN</strong> users can commit modifications to commercial settings.
        </div>
      )}

      {successMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
          {successMessage}
        </div>
      )}

      {/* Commercial Settings Form */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Settings color="var(--primary)" size={20} /> Commercial Settings (Version {settings?.version || 1})
            </h2>
            <p className="card-subtitle">
              Configured company baseline parameters used across all New Lead and Survey calculations
            </p>
          </div>
          <span className="badge badge-success">Active Version: v{settings?.version || 1}</span>
        </div>

        <form onSubmit={handleSaveSettings}>
          <div className="form-grid" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Target Gross Margin % *</label>
              <input
                type="number"
                min="5"
                max="60"
                step="0.5"
                className="form-control"
                value={targetMargin}
                disabled={!isAdmin}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Default: 25.0% deterministic gross margin</span>
            </div>

            <div className="form-group">
              <label className="form-label">Baseline Labour Cost (£) *</label>
              <input
                type="number"
                min="500"
                step="50"
                className="form-control"
                value={labourBase}
                disabled={!isAdmin}
                onChange={(e) => setLabourBase(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prime Energy stated baseline: £1,500</span>
            </div>

            <div className="form-group">
              <label className="form-label">Lead Generation Allowance (£) *</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-control"
                value={leadGenCost}
                disabled={!isAdmin}
                onChange={(e) => setLeadGenCost(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prime Energy stated baseline: £300</span>
            </div>

            <div className="form-group">
              <label className="form-label">Extras / Contingency Allowance (£) *</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-control"
                value={extrasCost}
                disabled={!isAdmin}
                onChange={(e) => setExtrasCost(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prime Energy stated baseline: £200</span>
            </div>

            <div className="form-group">
              <label className="form-label">Combi Conversion Allowance (£)</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-control"
                value={combiAllowance}
                disabled={!isAdmin}
                onChange={(e) => setCombiAllowance(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#b45309' }}>Marked provisional pending confirmation</span>
            </div>

            <div className="form-group">
              <label className="form-label">Microbore Full Re-Pipe Allowance (£)</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-control"
                value={microboreAllowance}
                disabled={!isAdmin}
                onChange={(e) => setMicroboreAllowance(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#b45309' }}>Marked provisional pending confirmation</span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Change Justification / Version Notes</label>
            <input
              className="form-control"
              placeholder="e.g. Q3 Commercial review: adjusting target margin to 26%..."
              value={notes}
              disabled={!isAdmin}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={savingSettings} className="btn btn-primary">
                <Save size={16} />
                {savingSettings ? 'Committing New Version...' : 'Commit New Settings Version'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Audit Trail Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <History color="var(--primary)" size={20} /> System Audit Trail
            </h2>
            <p className="card-subtitle">
              Cryptographically timestamped immutable event log tracking all pricing, quote overrides, and settings updates
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Entity Type</th>
                <th>Action</th>
                <th>Reason / Notes</th>
                <th>Delta Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="font-mono" style={{ fontSize: '0.75rem' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.user_id}</td>
                  <td><span className="badge badge-neutral">{log.entity_type}</span></td>
                  <td>
                    <span className={`badge ${log.action === 'OVERRIDE' ? 'badge-warning' : log.action === 'UPDATE' ? 'badge-info' : 'badge-success'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.reason || 'Standard update'}</td>
                  <td>
                    <details style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      <summary style={{ cursor: 'pointer' }}>View Diff Payload</summary>
                      <pre style={{ background: '#f1f5f9', padding: '8px', borderRadius: '4px', marginTop: '4px', maxWidth: '300px', overflowX: 'auto' }}>
                        {log.new_values}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No audit records recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
