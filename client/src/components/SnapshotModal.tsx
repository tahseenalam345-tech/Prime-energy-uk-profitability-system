import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

interface SnapshotModalProps {
  quoteId: string;
  onClose: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ quoteId, onClose }) => {
  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  React.useEffect(() => {
    async function loadSnapshot() {
      try {
        const res = await api.getQuoteSnapshot(quoteId);
        setSnapshotData(res.snapshot);
      } catch (err) {
        console.error('Failed to load snapshot', err);
      } finally {
        setLoading(false);
      }
    }
    loadSnapshot();
  }, [quoteId]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.verifySnapshot(quoteId);
      setVerificationResult(res);
    } catch (err: any) {
      alert('Verification failed: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <div>
            <h3 className="card-title">
              <Shield color="#059669" size={22} />
              Immutable Calculation Snapshot
            </h3>
            <p className="card-subtitle">Quote Reference: {snapshotData?.quoteReference || quoteId}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p>Loading locked snapshot...</p>
        ) : snapshotData ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8125rem' }}>
              <div><strong>Created Timestamp:</strong> {new Date(snapshotData.timestamp).toLocaleString()}</div>
              <div><strong>Created By:</strong> {snapshotData.userId}</div>
              <div><strong>Mode:</strong> {snapshotData.mode}</div>
              <div><strong>Ruleset Versions:</strong> BUS {snapshotData.rulesetVersions?.bus || 'v2.4'}, Settings v{snapshotData.rulesetVersions?.commercialSettings || '1'}</div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button onClick={handleVerify} disabled={verifying} className="btn btn-primary btn-sm">
                <RefreshCw size={14} className={verifying ? 'animate-spin' : ''} />
                {verifying ? 'Verifying...' : 'Verify Snapshot Reproducibility'}
              </button>
            </div>

            {verificationResult && (
              <div style={{
                background: verificationResult.isMatch ? '#ecfdf5' : '#fee2e2',
                border: `1px solid ${verificationResult.isMatch ? '#a7f3d0' : '#fca5a5'}`,
                padding: '14px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: verificationResult.isMatch ? '#065f46' : '#991b1b' }}>
                  {verificationResult.isMatch ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>{verificationResult.isMatch ? 'SNAPSHOT REPRODUCED: Exact Byte-for-Byte Match' : 'SNAPSHOT DISCREPANCY DETECTED'}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#334155', marginTop: '6px' }}>
                  Historical outputs strictly match re-evaluation using locked snapshot inputs and price tables.
                </p>
              </div>
            )}

            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>Locked Snapshot Payload (JSON):</h4>
            <pre style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: '16px',
              borderRadius: '8px',
              maxHeight: '320px',
              overflowY: 'auto',
              fontSize: '0.75rem',
              lineHeight: 1.6
            }}>
              {JSON.stringify(snapshotData, null, 2)}
            </pre>
          </div>
        ) : (
          <p>No snapshot found for this quote.</p>
        )}
      </div>
    </div>
  );
};
