import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, ShieldCheck, Layers, Search, Filter, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.js';
import { RuleEvidence } from '../types.js';
import { RuleEvidenceModal } from '../components/RuleEvidenceModal.js';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect.js';

export const RulesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'BUS' | 'TABLES'>('REGISTRY');
  const [ruleEvidenceList, setRuleEvidenceList] = useState<RuleEvidence[]>([]);
  const [busRules, setBusRules] = useState<any[]>([]);
  const [tables, setTables] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters for Registry
  const [registryCategory, setRegistryCategory] = useState<string>('ALL');
  const [registryStatus, setRegistryStatus] = useState<string>('ALL');
  const [registrySearch, setRegistrySearch] = useState<string>('');

  // Modal inspection state
  const [selectedRule, setSelectedRule] = useState<RuleEvidence | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function loadRules() {
      setLoading(true);
      try {
        const [regRes, busRes, tablesRes] = await Promise.all([
          api.getRuleEvidence(),
          api.getBusRules(),
          api.getEstimationTables()
        ]);
        setRuleEvidenceList(regRes.rules || []);
        setBusRules(busRes.rules || []);
        setTables(tablesRes || {});
      } catch (err) {
        console.error('Failed to load rules', err);
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED_OFFICIAL_CURRENT':
      case 'VERIFIED_OFFICIAL':
        return <span className="badge badge-success badge-status-official" style={{ fontWeight: 700, fontSize: '0.7rem' }}>VERIFIED OFFICIAL (CURRENT)</span>;
      case 'HISTORICAL':
        return <span className="badge badge-neutral badge-status-historical" style={{ fontWeight: 700, fontSize: '0.7rem' }}>HISTORICAL</span>;
      case 'PRIME_CONFIG':
        return <span className="badge badge-primary badge-status-config" style={{ fontWeight: 700, fontSize: '0.7rem' }}>PRIME CONFIG</span>;
      case 'ESTIMATION_HEURISTIC':
        return <span className="badge badge-warning badge-status-heuristic" style={{ fontWeight: 700, fontSize: '0.7rem' }}>ESTIMATION HEURISTIC</span>;
      case 'SOURCE_REQUIRED':
        return <span className="badge badge-danger badge-status-source" style={{ fontWeight: 700, fontSize: '0.7rem' }}>SOURCE REQUIRED</span>;
      default:
        return <span className="badge badge-neutral" style={{ fontWeight: 700, fontSize: '0.7rem' }}>{status}</span>;
    }
  };

  const categories = Array.from(new Set(ruleEvidenceList.map(r => r.category))).filter(Boolean);

  const filteredRules = ruleEvidenceList.filter(r => {
    const matchesCat = registryCategory === 'ALL' || r.category === registryCategory;
    const matchesStatus = registryStatus === 'ALL' || 
      r.verification_status === registryStatus ||
      (registryStatus === 'VERIFIED_OFFICIAL_CURRENT' && r.verification_status === 'VERIFIED_OFFICIAL');
    const matchesSearch = !registrySearch ||
      r.rule_name.toLowerCase().includes(registrySearch.toLowerCase()) ||
      r.rule_id.toLowerCase().includes(registrySearch.toLowerCase()) ||
      r.authority.toLowerCase().includes(registrySearch.toLowerCase()) ||
      r.source_document.toLowerCase().includes(registrySearch.toLowerCase());
    return matchesCat && matchesStatus && matchesSearch;
  });

  return (
    <div className="rules-view-container">
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Authoritative Rules, Standards & Governance Registry
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Traceable regulatory knowledge base. Every calculation rule is strictly classified as Verified Official, Prime Config, or Estimation Heuristic.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('REGISTRY')}
          className={`btn ${activeTab === 'REGISTRY' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ShieldCheck size={16} /> Rule Evidence Registry ({ruleEvidenceList.length} Rules)
        </button>
        <button
          onClick={() => setActiveTab('BUS')}
          className={`btn ${activeTab === 'BUS' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <BookOpen size={16} /> Versioned BUS Rules
        </button>
        <button
          onClick={() => setActiveTab('TABLES')}
          className={`btn ${activeTab === 'TABLES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Layers size={16} /> Pre-Survey Estimation Tables
        </button>
      </div>

      {/* TAB 1: RULE EVIDENCE REGISTRY */}
      {activeTab === 'REGISTRY' && (
        <div>
          {/* Filters Bar */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search rules by name, ID, authority, or document..."
                  className="form-control"
                  style={{ paddingLeft: '32px', fontSize: '0.875rem' }}
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '220px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Category:</span>
                <div style={{ flex: 1 }}>
                  <SearchableSelect
                    options={[{ value: 'ALL', label: `All Categories (${categories.length})` }, ...categories.map(c => ({ value: c, label: c }))]}
                    value={registryCategory}
                    onChange={(val) => setRegistryCategory(val || 'ALL')}
                    placeholder="Filter category..."
                    searchPlaceholder="Search category..."
                    compact
                    clearable={false}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '240px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Status:</span>
                <div style={{ flex: 1 }}>
                  <SearchableSelect
                    options={[
                      { value: 'ALL', label: 'All Statuses' },
                      { value: 'VERIFIED_OFFICIAL_CURRENT', label: 'VERIFIED_OFFICIAL_CURRENT', badge: 'Official' },
                      { value: 'PRIME_CONFIG', label: 'PRIME_CONFIG', badge: 'Config' },
                      { value: 'ESTIMATION_HEURISTIC', label: 'ESTIMATION_HEURISTIC', badge: 'Heuristic' },
                      { value: 'SOURCE_REQUIRED', label: 'SOURCE_REQUIRED', badge: 'Blocked' },
                      { value: 'HISTORICAL', label: 'HISTORICAL', badge: 'Archive' },
                    ]}
                    value={registryStatus}
                    onChange={(val) => setRegistryStatus(val || 'ALL')}
                    placeholder="Filter status..."
                    searchPlaceholder="Search status..."
                    compact
                    clearable={false}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Registry Table */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '200px' }}>Rule Identifier & Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Authority & Reference</th>
                    <th>Rule Logic / Regulatory Value</th>
                    <th>Effective Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>Loading registry...</td></tr>
                  ) : filteredRules.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>No rules matched your search criteria.</td></tr>
                  ) : (
                    filteredRules.map(r => (
                      <tr key={r.rule_id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.rule_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{r.rule_id}</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{r.category}</span>
                        </td>
                        <td>{getStatusBadge(r.verification_status)}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.authority}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{r.source_document} ({r.evidence_reference || r.source_version})</div>
                        </td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>
                          <span style={{ color: 'var(--text-main)', lineHeight: '1.45', display: 'block' }}>{r.rule_value}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.effective_from}</div>
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setSelectedRule(r);
                              setShowModal(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUS RULES */}
      {activeTab === 'BUS' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <ShieldCheck color="#059669" size={22} /> Boiler Upgrade Scheme (BUS) Versioned Rules
              </h2>
              <p className="card-subtitle">Official UK Government statutory scheme (S.I. 2022/439 as amended)</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ruleset ID & Version</th>
                  <th>Standard Grant</th>
                  <th>Off-Gas Uplift</th>
                  <th>Scope</th>
                  <th>Developer New-Build</th>
                  <th>Self-Build</th>
                  <th>Official Source</th>
                </tr>
              </thead>
              <tbody>
                {busRules.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.rule_id}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Version: {b.version} (Effective {b.effective_date})</div>
                    </td>
                    <td style={{ fontWeight: 800, color: '#10b981', fontSize: '1.05rem' }}>
                      £{b.standard_grant.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1.05rem' }}>
                      £{b.off_gas_grant.toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--text-main)' }}>{b.scope_countries}</td>
                    <td>
                      <span className="badge badge-danger">Ineligible (0%)</span>
                    </td>
                    <td>
                      <span className="badge badge-success">Eligible</span>
                    </td>
                    <td>
                      <a
                        href={b.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '0.8125rem' }}
                      >
                        GOV.UK Guidance <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ESTIMATION TABLES */}
      {activeTab === 'TABLES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* EPC Baselines */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>
              <Layers size={18} color="var(--primary)" /> EPC Baseline Heat Loss (W/m²) — Heuristic
            </h3>
            <p className="card-subtitle" style={{ marginBottom: '14px' }}>
              Benchmark thermal power demand by EPC energy rating (Identified as ESTIMATION HEURISTIC)
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>EPC Rating Band</th>
                  <th style={{ textAlign: 'right' }}>Baseline W/m²</th>
                  <th>Classification</th>
                </tr>
              </thead>
              <tbody>
                {tables.epcBaselines?.map((e: any) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>Band {e.epc_band}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                      {e.w_per_m2} W/m²
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>HEURISTIC</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fallback Insulation Table */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>
              <Layers size={18} color="var(--primary)" /> Fallback Insulation Table (W/m²) — Heuristic
            </h3>
            <p className="card-subtitle" style={{ marginBottom: '14px' }}>
              Applied when official EPC rating is missing or unverified
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Fabric Condition</th>
                  <th style={{ textAlign: 'right' }}>Baseline W/m²</th>
                </tr>
              </thead>
              <tbody>
                {tables.fallbacks?.map((f: any) => (
                  <tr key={f.id}>
                    <td style={{ color: 'var(--text-main)' }}>{f.description}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#f59e0b' }}>
                      {f.w_per_m2} W/m²
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Property Multipliers */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>
              <Layers size={18} color="var(--primary)" /> Property Archetype Multipliers — Prime Config
            </h3>
            <p className="card-subtitle" style={{ marginBottom: '14px' }}>
              Exposed thermal envelope factors configured by Prime Energy
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Property Type</th>
                  <th>Multiplier</th>
                  <th>Manual Review</th>
                </tr>
              </thead>
              <tbody>
                {tables.multipliers?.map((m: any) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.property_type}</td>
                    <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>{m.multiplier}x</td>
                    <td>
                      {m.manual_review_flag === 1 ? (
                        <span className="badge badge-warning">Mandatory Review</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Standard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cylinder Sizing Rules */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>
              <Layers size={18} color="var(--primary)" /> Cylinder Sizing Rules — Heuristic
            </h3>
            <p className="card-subtitle" style={{ marginBottom: '14px' }}>
              Domestic hot water storage sizing based on bedrooms & bathrooms
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Property Criteria</th>
                  <th>Recommended Litres</th>
                </tr>
              </thead>
              <tbody>
                {tables.cylinderRules?.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-main)' }}>{c.notes}</td>
                    <td style={{ fontWeight: 800, color: '#10b981' }}>
                      {c.recommended_litres_min === c.recommended_litres_max ? `${c.recommended_litres_min}L` : `${c.recommended_litres_min}–${c.recommended_litres_max}L`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      <RuleEvidenceModal
        rule={selectedRule}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};
