import React, { useState, useEffect } from 'react';
import { FileText, Shield, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.js';
import { SnapshotModal } from '../components/SnapshotModal.js';
import { OverrideModal } from '../components/OverrideModal.js';
import { Quote, User } from '../types.js';

interface QuotesViewProps {
  currentUser: User | null;
}

export const QuotesView: React.FC<QuotesViewProps> = ({ currentUser }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [selectedOverrideQuote, setSelectedOverrideQuote] = useState<Quote | null>(null);
  const [verifiedIds, setVerifiedIds] = useState<Record<string, boolean>>({});

  const fetchQuotes = async () => {
    try {
      const res = await api.getQuotes();
      setQuotes(res.quotes || []);
    } catch (err) {
      console.error('Failed to load quotes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleVerify = async (quoteId: string) => {
    try {
      const res = await api.verifySnapshot(quoteId);
      if (res.isMatch) {
        setVerifiedIds(prev => ({ ...prev, [quoteId]: true }));
      } else {
        alert('Discrepancy detected in snapshot: ' + res.discrepancies.join(', '));
      }
    } catch (err: any) {
      alert('Verification failed: ' + err.message);
    }
  };

  const userRole = currentUser?.role_name || currentUser?.role || 'READ_ONLY';
  const isManagerOrAdmin = userRole === 'ESTIMATOR' || userRole === 'ADMIN';

  return (
    <div className="quotes-view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Quotes & Immutable Calculation Snapshots
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            All historical commercial quotes are locked into immutable snapshots with versioned rules and product prices.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote Reference</th>
                <th>Customer & Address</th>
                <th>Mode</th>
                <th>Total Cost</th>
                <th>BUS Grant</th>
                <th>Customer Contribution</th>
                <th>Margin %</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{q.quote_reference}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(q.created_at).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{q.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{q.address_line1}, {q.postcode}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                      {q.mode === 'NEW_LEAD' ? 'Mode A (Lead)' : 'Mode B (Survey)'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>£{q.total_job_cost.toLocaleString()}</td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>£{q.bus_grant.toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: '#b45309' }}>
                    £{q.customer_contribution.toLocaleString()}
                    {q.manual_override === 1 && (
                      <span title={q.override_reason} style={{ marginLeft: '4px', color: '#dc2626', cursor: 'help' }}>*</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: q.gross_margin_percent >= 25 ? '#059669' : '#d97706' }}>
                    {q.gross_margin_percent}%
                  </td>
                  <td><Badge type="grade" value={q.profitability_grade} /></td>
                  <td>
                    <span className={`badge ${q.status === 'ACCEPTED' ? 'badge-success' : 'badge-neutral'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setSelectedSnapshotId(q.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                      >
                        <Shield size={13} /> Snapshot
                      </button>
                      <button
                        onClick={() => handleVerify(q.id)}
                        className={`btn ${verifiedIds[q.id] ? 'btn-secondary' : 'btn-secondary'} btn-sm`}
                        style={{ padding: '5px 8px', fontSize: '0.75rem', color: verifiedIds[q.id] ? '#059669' : undefined }}
                        title="Verify historical reproduction"
                      >
                        {verifiedIds[q.id] ? <CheckCircle2 size={13} /> : <RefreshCw size={13} />}
                        {verifiedIds[q.id] ? 'Verified' : 'Verify'}
                      </button>
                      {isManagerOrAdmin && (
                        <button
                          onClick={() => setSelectedOverrideQuote(q)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#b45309' }}
                          title="Commercial Manager Override"
                        >
                          <AlertTriangle size={13} /> Override
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No quotes found. Run a New Lead calculation to generate and lock your first quote snapshot.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSnapshotId && (
        <SnapshotModal
          quoteId={selectedSnapshotId}
          onClose={() => setSelectedSnapshotId(null)}
        />
      )}

      {selectedOverrideQuote && (
        <OverrideModal
          quote={selectedOverrideQuote}
          currentUserId={currentUser?.id || 'user_estimator'}
          onClose={() => setSelectedOverrideQuote(null)}
          onSuccess={() => {
            setSelectedOverrideQuote(null);
            fetchQuotes();
          }}
        />
      )}
    </div>
  );
};
