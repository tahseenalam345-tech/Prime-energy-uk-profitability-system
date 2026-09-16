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
  const [targetMargin, setTargetMargin] = useState<number>(7);
  const [labourBase, setLabourBase] = useState<number>(1500);
  const [leadGenCost, setLeadGenCost] = useState<number>(300);
  const [extrasCost, setExtrasCost] = useState<number>(200);
  const [accessoriesCost, setAccessoriesCost] = useState<number>(968);
  const [microboreAllowance, setMicroboreAllowance] = useState<number>(1800);
  const [notes, setNotes] = useState('');

  // User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('READ_ONLY');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const loadAdminData = async () => {
    try {
      const [settingsRes, logsRes, usersRes] = await Promise.all([
        api.getCommercialSettings(),
        api.getAuditLogs(),
        api.getUsers()
      ]);

      const s = settingsRes.settings;
      if (s) {
        setSettings(s);
        setTargetMargin(Math.round((s.target_gross_margin ?? 0.07) * 100));
        setLabourBase(s.labour_baseline ?? 1500);
        setLeadGenCost(s.lead_generation_cost ?? 300);
        setExtrasCost(s.extras_contingency ?? 200);
        setAccessoriesCost(s.accessories_controls_cost ?? 968);
        setMicroboreAllowance(s.microbore_repipe_allowance ?? 1800);
      }
      setAuditLogs(logsRes.logs || []);
      setUsersList(usersRes.users || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await api.createUser({
        name: newUserName,
        email: newUserEmail,
        role_name: newUserRole,
        password: newUserPassword
      });
      if (res.error) {
        alert('Error creating user: ' + res.error);
      } else {
        setSuccessMessage(`User '${newUserEmail}' provisioned successfully.`);
        setShowCreateUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        loadAdminData();
      }
    } catch (err: any) {
      alert('Failed to create user: ' + err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (userId: string, roleName: string) => {
    try {
      const res = await api.updateUserRole(userId, roleName);
      if (res.error) {
        alert('Error changing role: ' + res.error);
      } else {
        setSuccessMessage('User role updated successfully.');
        loadAdminData();
      }
    } catch (err: any) {
      alert('Failed to update user role: ' + err.message);
    }
  };

  const handleToggleStatus = async (userId: string, active: boolean) => {
    try {
      const res = await api.toggleUserStatus(userId, active);
      if (res.error) {
        alert('Error changing user status: ' + res.error);
      } else {
        setSuccessMessage(`User status updated to ${active ? 'ACTIVE' : 'DEACTIVATED'}.`);
        loadAdminData();
      }
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId) return;
    setResettingPassword(true);
    try {
      const res = await api.resetUserPassword(resetUserId, resetNewPassword);
      if (res.error) {
        alert('Error resetting password: ' + res.error);
      } else {
        setSuccessMessage(res.message || 'Password reset successfully.');
        setResetUserId(null);
        setResetNewPassword('');
        loadAdminData();
      }
    } catch (err: any) {
      alert('Failed to reset password: ' + err.message);
    } finally {
      setResettingPassword(false);
    }
  };

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
        accessoriesControlsCost: Number(accessoriesCost),
        microboreRepipeAllowance: Number(microboreAllowance),
        notes: notes || `Commercial settings updated by ${currentUser?.name || 'User'}`,
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

  const canEditSettings = currentUser?.role_name === 'ADMIN' || currentUser?.role_name === 'ESTIMATOR' || currentUser?.role_name === 'SALES';
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

      {!canEditSettings && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
          <strong>Read-Only View:</strong> You are currently logged in with the <strong>{currentUser?.role_name}</strong> role. Contact an authorized Commercial Manager or Admin to modify settings.
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
                min="1"
                max="60"
                step="0.5"
                className="form-control"
                value={targetMargin}
                disabled={!canEditSettings}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prime Energy default setting: 7.0% target margin</span>
            </div>

            <div className="form-group">
              <label className="form-label">Baseline Labour Cost (£) *</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-control"
                value={labourBase}
                disabled={!canEditSettings}
                onChange={(e) => setLabourBase(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prime Energy baseline: £1,500</span>
            </div>

            <div className="form-group">
              <label className="form-label">Lead Generation Allowance (£) *</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-control"
                value={leadGenCost}
                disabled={!canEditSettings}
                onChange={(e) => setLeadGenCost(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prime Energy baseline: £300</span>
            </div>

            <div className="form-group">
              <label className="form-label">Extras / Contingency Allowance (£) *</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-control"
                value={extrasCost}
                disabled={!canEditSettings}
                onChange={(e) => setExtrasCost(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prime Energy baseline: £200</span>
            </div>

            <div className="form-group">
              <label className="form-label">Accessories & Controls Allowance (£) *</label>
              <input
                type="number"
                min="0"
                step="25"
                className="form-control"
                value={accessoriesCost}
                disabled={!canEditSettings}
                onChange={(e) => setAccessoriesCost(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>MagnaClean, AV feet, flex hoses, controller, isolator default: £968</span>
            </div>

            <div className="form-group">
              <label className="form-label">Microbore Full Re-Pipe Allowance (£)</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-control"
                value={microboreAllowance}
                disabled={!canEditSettings}
                onChange={(e) => setMicroboreAllowance(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Provisional re-pipe allowance baseline: £1,800</span>
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

      {/* User & Role Management Section (ADMIN ONLY) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users color="var(--primary)" size={20} /> User & Role Management (Admin Only)
            </h2>
            <p className="card-subtitle">
              Provision internal accounts, assign system roles, activate/deactivate users, and reset credentials.
            </p>
          </div>
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            + Create New User
          </button>
        </div>

        {/* Create User Form Modal / Card */}
        {showCreateUserModal && (
          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>
              Provision New User Account
            </h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-grid" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="e.g. john.doe@primeenergy.co.uk"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Role *</label>
                  <select
                    className="form-control"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  >
                    <option value="ADMIN">ADMIN (Full Access + User Mgmt)</option>
                    <option value="SALES">SALES (Lead & Sales Pipeline)</option>
                    <option value="ESTIMATOR">ESTIMATOR (Commercial & Pricing)</option>
                    <option value="SURVEYOR">SURVEYOR (After-Survey Design)</option>
                    <option value="READ_ONLY">READ_ONLY (View Only)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-control"
                    placeholder="Password (min 6 chars)"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateUserModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={creatingUser} className="btn btn-primary">
                  {creatingUser ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetUserId && (
          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>
              Reset Password for User: {usersList.find(u => u.id === resetUserId)?.email}
            </h3>
            <form onSubmit={handleResetPassword}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">New Password (min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="form-control"
                  placeholder="Enter new password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setResetUserId(null); setResetNewPassword(''); }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={resettingPassword} className="btn btn-primary">
                  {resettingPassword ? 'Resetting Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                      value={u.role_name || u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="SALES">SALES</option>
                      <option value="ESTIMATOR">ESTIMATOR</option>
                      <option value="SURVEYOR">SURVEYOR</option>
                      <option value="READ_ONLY">READ_ONLY</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>
                      {u.active ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleStatus(u.id, !u.active)}
                        className={`btn btn-sm ${u.active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => { setResetUserId(u.id); setResetNewPassword(''); }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usersList.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    Loading user records...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <History color="var(--primary)" size={20} /> System Audit Trail
            </h2>
            <p className="card-subtitle">
              Cryptographically timestamped immutable event log tracking all pricing, quote overrides, user management, and settings updates
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

