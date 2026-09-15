import React from 'react';
import { ShieldCheck, BookOpen, ExternalLink, X, AlertTriangle } from 'lucide-react';
import { RuleEvidence } from '../types.js';

interface RuleEvidenceModalProps {
  rule: RuleEvidence | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RuleEvidenceModal: React.FC<RuleEvidenceModalProps> = ({ rule, isOpen, onClose }) => {
  if (!isOpen || !rule) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED_OFFICIAL_CURRENT':
      case 'VERIFIED_OFFICIAL':
        return <span className="badge badge-success" style={{ fontWeight: 700, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>VERIFIED OFFICIAL (CURRENT)</span>;
      case 'HISTORICAL':
        return <span className="badge badge-neutral" style={{ fontWeight: 700, background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>HISTORICAL (SUPERSEDED)</span>;
      case 'PRIME_CONFIG':
        return <span className="badge badge-primary" style={{ fontWeight: 700 }}>PRIME ENERGY CONFIGURATION</span>;
      case 'ESTIMATION_HEURISTIC':
        return <span className="badge badge-warning" style={{ fontWeight: 700, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}>ESTIMATION HEURISTIC (PRE-SURVEY)</span>;
      case 'SOURCE_REQUIRED':
        return <span className="badge badge-danger" style={{ fontWeight: 700, background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }}>SOURCE REQUIRED</span>;
      default:
        return <span className="badge badge-neutral" style={{ fontWeight: 700 }}>{status}</span>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '16px',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card rule-evidence-modal-box" style={{
        borderRadius: '12px',
        maxWidth: '620px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        padding: 0
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-hover, var(--surface))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck color="#10b981" size={22} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Authoritative Rule Citation & Evidence
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {rule.rule_id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              {rule.rule_name}
            </h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {getStatusBadge(rule.verification_status)}
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                Category: {rule.category}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Verified: {rule.last_verified_at}
              </span>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: 'var(--text-main)',
            marginBottom: '16px',
            borderLeft: '4px solid var(--primary)',
            borderTop: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Regulatory Logic / Value
            </div>
            <div style={{ lineHeight: '1.5' }}>{rule.rule_value}</div>
          </div>

          {/* Citation Card */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: 'var(--surface)',
            marginBottom: '16px'
          }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={16} color="var(--primary)" /> Authoritative Reference
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '8px', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Authority:</span>
              <strong style={{ color: 'var(--text-main)' }}>{rule.authority}</strong>

              <span style={{ color: 'var(--text-secondary)' }}>Document:</span>
              <span style={{ color: 'var(--text-main)' }}>{rule.source_document}</span>

              <span style={{ color: 'var(--text-secondary)' }}>Edition/Version:</span>
              <span style={{ color: 'var(--text-main)' }}>{rule.source_version}</span>

              {rule.evidence_reference && (
                <>
                  <span style={{ color: 'var(--text-secondary)' }}>Section/Page:</span>
                  <strong style={{ color: '#10b981' }}>{rule.evidence_reference}</strong>
                </>
              )}

              <span style={{ color: 'var(--text-secondary)' }}>Effective Date:</span>
              <span style={{ color: 'var(--text-main)' }}>{rule.effective_from} {rule.effective_to ? `to ${rule.effective_to}` : '(Current)'}</span>
            </div>
          </div>

          {rule.notes && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '0.8125rem',
              color: 'var(--text-main)',
              marginBottom: '16px'
            }}>
              <strong style={{ color: '#f59e0b' }}>Regulatory Context:</strong> {rule.notes}
            </div>
          )}

          {rule.source_url && (
            <div style={{ textAlign: 'right' }}>
              <a
                href={rule.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}
              >
                Inspect Official Authority Source <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'var(--surface-hover, var(--surface))'
        }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
