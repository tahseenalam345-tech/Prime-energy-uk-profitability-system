import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.js';

interface OverrideModalProps {
  quote: any;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({ quote, currentUserId, onClose, onSuccess }) => {
  const [customerContribution, setCustomerContribution] = useState<number>(quote.customer_contribution);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Live recalculations
  const totalCost = quote.total_job_cost;
  const busGrant = quote.bus_grant;
  const newRevenue = Math.round((busGrant + Number(customerContribution)) * 100) / 100;
  const newGrossProfit = Math.round((newRevenue - totalCost) * 100) / 100;
  const newGrossMargin = newRevenue > 0 ? Math.round(((newGrossProfit / newRevenue) * 100) * 10) / 10 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError('A comprehensive commercial justification reason is required for audit compliance.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.overrideQuote(quote.id, {
        userId: currentUserId,
        reason,
        customerContributionOverride: Number(customerContribution)
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit override');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title" style={{ color: '#b45309' }}>
              <AlertTriangle size={20} /> Commercial Manager Override
            </h3>
            <p className="card-subtitle">Quote: {quote.quote_reference} ({quote.customer_name})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.8125rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '18px', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Total Job Cost:</span>
              <strong>£{totalCost.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>BUS Grant:</span>
              <strong>£{busGrant.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8125rem' }}>
              <span>Original Margin:</span>
              <span>{quote.gross_margin_percent}% (£{quote.gross_profit.toLocaleString()} profit)</span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Adjusted Customer Contribution (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              value={customerContribution}
              onChange={(e) => setCustomerContribution(Number(e.target.value))}
              required
            />
          </div>

          {/* Live Outcome Card */}
          <div style={{
            background: newGrossMargin >= 20 ? '#ecfdf5' : '#fffbeb',
            border: `1px solid ${newGrossMargin >= 20 ? '#a7f3d0' : '#fde68a'}`,
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Live Override Result:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Revenue</div>
                <div style={{ fontWeight: 800 }}>£{newRevenue.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Gross Profit</div>
                <div style={{ fontWeight: 800 }}>£{newGrossProfit.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Gross Margin</div>
                <div style={{ fontWeight: 800, color: newGrossMargin >= 20 ? '#059669' : '#d97706' }}>
                  {newGrossMargin}%
                </div>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Commercial Justification Reason (Mandatory Audit Requirement) *</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Explain rationale for contribution discount or margin adjustment (e.g. strategic commercial partnership, competitor price match, bespoke scope reduction)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Saving Override...' : 'Confirm & Log Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
