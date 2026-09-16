import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, ShieldCheck, Search, HelpCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '../services/api.js';

interface GuideItem {
  stage_code: string;
  stage_name: string;
  section_name: string;
  requirement_key: string;
  title: string;
  short_description?: string;
  what_is_this?: string;
  why_required?: string;
  who_completes?: string;
  who_submits?: string;
  customer_signature_type: string;
  classification: string;
  authority?: string;
  source_url?: string;
  clause_page?: string;
  evidence_required?: string;
  sort_order?: number;
}

export const SubmissionGuideView: React.FC = () => {
  const [stages, setStages] = useState<string[]>([]);
  const [items, setItems] = useState<GuideItem[]>([]);
  const [activeStage, setActiveStage] = useState<string>('01 Eligibility');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookData() {
      try {
        const res = await api.getSubmissionGuideBook();
        setStages(res.stages || []);
        setItems(res.items || []);
      } catch (err) {
        console.error('Failed to load guide book data', err);
      } finally {
        setLoading(false);
      }
    }
    loadBookData();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesStage = !activeStage || item.stage_name === activeStage;
    const matchesSearch = !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.what_is_this || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.why_required || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.section_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={26} color="var(--primary)" />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              SUBMISSION GUIDE & MASTER BOOK
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            UK Domestic Heat Pump Submission Requirements, Evidence Rules & Statutory Sources Manual
          </p>
        </div>
      </div>

      {/* Stage Selector Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: '6px', paddingBottom: '4px' }}>
        {stages.map((stg) => {
          const isActive = activeStage === stg;
          return (
            <button
              key={stg}
              type="button"
              onClick={() => setActiveStage(stg)}
              style={{
                flex: '0 0 auto',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: isActive ? 'var(--primary-light)' : 'var(--bg-card)',
                color: isActive ? 'var(--primary-dark)' : 'var(--text-main)'
              }}
            >
              {stg}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '14px', background: 'var(--bg-card)' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search submission guide manual by requirement name, explanation, or section..."
            style={{ paddingLeft: '34px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Manual Content List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Submission Guide & Master Book...
        </div>
      ) : (
        <div className="space-y-4">
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Showing {filteredItems.length} submission requirements for <strong>{activeStage}</strong>
          </div>

          {filteredItems.map((item) => (
            <div
              key={item.requirement_key}
              className="card"
              style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', background: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                    {item.section_name}
                  </span>
                  {getClassificationBadge(item.classification)}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {item.title}
                  </h3>
                </div>

                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Official Source <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* What is it */}
              <div style={{ background: 'var(--bg-panel)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  What is this?
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  {item.what_is_this || item.short_description}
                </div>
              </div>

              {/* Why required */}
              <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1e40af', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HelpCircle size={14} color="#1d4ed8" /> Why Required?
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  {item.why_required}
                </div>
              </div>

              {/* Specification Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', fontSize: '0.8rem' }}>
                <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Who Completes</span>
                  <strong style={{ color: 'var(--text-main)' }}>{item.who_completes || 'Staff'}</strong>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Who Submits</span>
                  <strong style={{ color: 'var(--text-main)' }}>{item.who_submits || 'Installer'}</strong>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Customer Signature</span>
                  <strong style={{ color: '#2563eb' }}>{item.customer_signature_type}</strong>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Authority & Clause</span>
                  <strong style={{ color: 'var(--text-main)' }}>{item.authority || 'Ofgem / MCS'}</strong> {item.clause_page ? `(${item.clause_page})` : ''}
                </div>
              </div>

              {item.evidence_required && (
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Mandatory Evidence Required: <strong style={{ color: 'var(--text-main)' }}>{item.evidence_required}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
