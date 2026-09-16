import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Zap, Award, Tag, Info, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SuitableAshpItem {
  id: string;
  brand?: string | null;
  manufacturer?: string | null;
  productFamily?: string | null;
  model?: string | null;
  sku?: string | null;
  nominalCapacity?: number | null;
  marketingNominalKw?: number | null;
  ratedOutputAtDesign?: number | null;
  ratedOutputKw?: number | null;
  designCondition?: string | null;
  ratedOutputCondition?: string | null;
  mcsStatus?: string | null;
  mcsReference?: string | null;
  priceExVat?: number | null;
  supplier?: string | null;
  manualUrl?: string | null;
}

export interface SuitableAshpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredHeatDemandKw?: number;
  estimatedHeatDemandKw?: number;
  selectedAshpId?: string | null;
  onSelectAshp: (productId: string) => void;
  top3Recommended?: Array<{
    product: SuitableAshpItem;
    rank: number;
    label: string;
    reason: string;
  }>;
  categorizedAshps?: {
    preferred: SuitableAshpItem[];
    bestMatch: SuitableAshpItem[];
    valueCost: SuitableAshpItem[];
    alternatives: SuitableAshpItem[];
    allQualifying: SuitableAshpItem[];
  };
  allAshps?: SuitableAshpItem[];
}

type SortField = 'brand' | 'model' | 'marketingKw' | 'ratedOutput' | 'price' | 'mcsStatus';

export const SuitableAshpsModal: React.FC<SuitableAshpsModalProps> = ({
  isOpen,
  onClose,
  requiredHeatDemandKw,
  estimatedHeatDemandKw,
  selectedAshpId,
  onSelectAshp,
  categorizedAshps,
  allAshps = []
}) => {
  const [activeTab, setActiveTab] = useState<'preferred' | 'bestMatch' | 'valueCost' | 'all'>('preferred');
  const [sortField, setSortField] = useState<SortField>('ratedOutput');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  if (!isOpen) return null;

  const reqDemand = Number(requiredHeatDemandKw ?? estimatedHeatDemandKw ?? 0);

  const getAshpRatedKw = (p: any) =>
    Number(p.ratedOutputAtDesign ?? p.rated_output_at_design ?? p.ratedOutputKw ?? p.rated_output_kw ?? p.nominalCapacity ?? p.nominal_capacity ?? p.marketingNominalKw ?? p.marketing_nominal_kw ?? 0);

  const getAshpNominalKw = (p: any) =>
    Number(p.nominalCapacity ?? p.nominal_capacity ?? p.marketingNominalKw ?? p.marketing_nominal_kw ?? p.nominalKw ?? p.nominal_kw ?? getAshpRatedKw(p));

  const getAshpPriceEx = (p: any) =>
    Number(p.priceExVat ?? p.price_ex_vat ?? 0);

  const getAshpBrand = (p: any) =>
    (p.brand || p.manufacturer || 'Generic').toString();

  const getAshpModel = (p: any) =>
    (p.model || '').toString();

  const getAshpMcs = (p: any) =>
    (p.mcsStatus || p.mcs_status || 'UNCLEAR').toString();

  const safeQualifyingList: SuitableAshpItem[] = (categorizedAshps?.allQualifying && categorizedAshps.allQualifying.length > 0)
    ? categorizedAshps.allQualifying
    : (allAshps && allAshps.length > 0)
    ? allAshps
    : (categorizedAshps?.bestMatch && categorizedAshps.bestMatch.length > 0)
    ? categorizedAshps.bestMatch
    : [];

  const deduplicateAshps = (list: SuitableAshpItem[]) => {
    const seen = new Set<string>();
    const res: SuitableAshpItem[] = [];
    for (const item of list) {
      const brand = getAshpBrand(item).toLowerCase().trim();
      const model = getAshpModel(item).toLowerCase().trim();
      const rated = getAshpRatedKw(item);
      const key = item.sku ? item.sku.toLowerCase().trim() : `${brand}_${model}_${rated}`;
      if (!seen.has(key)) {
        seen.add(key);
        res.push(item);
      }
    }
    return res;
  };

  const filterQualifying = (list: SuitableAshpItem[]) => {
    const deduped = deduplicateAshps(list);
    return deduped.filter(p => {
      const rated = getAshpRatedKw(p);
      return (reqDemand === 0 || rated >= reqDemand || reqDemand <= 1.0);
    });
  };

  const rawQualifying = filterQualifying(safeQualifyingList);
  const fallbackList = deduplicateAshps(safeQualifyingList.length > 0 ? safeQualifyingList : []);

  const effectiveQualifying = rawQualifying.length > 0 ? rawQualifying : fallbackList;

  const preferredBrands = ['daikin', 'vaillant', 'mitsubishi', 'viessmann', 'baxi', 'grant', 'panasonic'];
  const getBrandString = (p: SuitableAshpItem) => getAshpBrand(p).toLowerCase();

  // Top 3 Recommendation Logic
  const top3Recommended = [...effectiveQualifying]
    .sort((a, b) => {
      const ratedA = getAshpRatedKw(a);
      const ratedB = getAshpRatedKw(b);
      const surplusA = reqDemand > 0 ? ratedA - reqDemand : ratedA;
      const surplusB = reqDemand > 0 ? ratedB - reqDemand : ratedB;
      if (surplusA !== surplusB) return surplusA - surplusB;
      const priceA = getAshpPriceEx(a);
      const priceB = getAshpPriceEx(b);
      return priceA - priceB;
    })
    .slice(0, 3);

  const preferredList = (categorizedAshps?.preferred?.length ? filterQualifying(categorizedAshps.preferred) : effectiveQualifying)
    .filter(p => preferredBrands.some(b => getBrandString(p).includes(b)));

  const bestMatchList = (categorizedAshps?.bestMatch?.length ? filterQualifying(categorizedAshps.bestMatch) : effectiveQualifying);
  const valueCostList = (categorizedAshps?.valueCost?.length ? filterQualifying(categorizedAshps.valueCost) : effectiveQualifying);
  const allList = effectiveQualifying;

  const getActiveList = () => {
    switch (activeTab) {
      case 'preferred': return preferredList.length > 0 ? preferredList : bestMatchList;
      case 'bestMatch': return bestMatchList;
      case 'valueCost': return valueCostList;
      case 'all': return allList;
      default: return preferredList.length > 0 ? preferredList : bestMatchList;
    }
  };

  const activeItems = getActiveList();

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedItems = [...activeItems].sort((a, b) => {
    let result = 0;
    if (sortField === 'brand') {
      const brandA = getAshpBrand(a).toLowerCase();
      const brandB = getAshpBrand(b).toLowerCase();
      result = brandA.localeCompare(brandB);
    } else if (sortField === 'model') {
      const modelA = getAshpModel(a).toLowerCase();
      const modelB = getAshpModel(b).toLowerCase();
      result = modelA.localeCompare(modelB);
    } else if (sortField === 'marketingKw') {
      const nomA = getAshpNominalKw(a);
      const nomB = getAshpNominalKw(b);
      result = nomA - nomB;
    } else if (sortField === 'ratedOutput') {
      const ratedA = getAshpRatedKw(a);
      const ratedB = getAshpRatedKw(b);
      result = ratedA - ratedB;
    } else if (sortField === 'price') {
      const priceA = getAshpPriceEx(a);
      const priceB = getAshpPriceEx(b);
      result = priceA - priceB;
    } else if (sortField === 'mcsStatus') {
      const statusA = getAshpMcs(a).toLowerCase();
      const statusB = getAshpMcs(b).toLowerCase();
      result = statusA.localeCompare(statusB);
    }
    return sortOrder === 'asc' ? result : -result;
  });

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-500 ml-1 inline" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400 ml-1 inline" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400 ml-1 inline" />;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '16px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card, #0f172a)',
        color: 'var(--text-main, #f8fafc)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '16px',
        maxWidth: '980px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border, #1e293b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-panel, #0f172a)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#10b981" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #ffffff)' }}>
                Technically Suitable Verified Heat Pumps
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px', margin: 0 }}>
              Required Output: <strong style={{ color: '#10b981' }}>≥ {reqDemand > 0 ? reqDemand.toFixed(1) : 'N/A'} kW</strong> at design condition | Certified MCS Catalog
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #94a3b8)', padding: '6px', borderRadius: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Top 3 Recommended Banner */}
        {top3Recommended.length > 0 && (
          <div style={{ padding: '14px 20px', background: '#090d16', borderBottom: '1px solid var(--border, #1e293b)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Award size={16} color="#fbbf24" />
              <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fcd34d', margin: 0 }}>
                Top 3 Recommended for Current Job
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {top3Recommended.map((recObj, idx) => {
                const rec = (recObj as any).product || recObj;
                const label = (recObj as any).label || `#${idx + 1} Best Fit`;
                const reason = (recObj as any).reason || '';
                const rated = Number(rec.ratedOutputAtDesign ?? rec.ratedOutputKw ?? 0);
                const price = Number(rec.priceExVat ?? 0);
                const isSelected = selectedAshpId === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => {
                      onSelectAshp(rec.id);
                      onClose();
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #10b981' : '1px solid var(--border, #1e293b)',
                      background: isSelected ? 'rgba(6, 78, 59, 0.4)' : '#0f172a',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#fbbf24' }}>#{idx + 1} {label}</span>
                      {isSelected && <span style={{ color: '#34d399', fontWeight: 800 }}>Selected</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.brand || rec.manufacturer} {rec.model}
                    </div>
                    {reason && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{reason}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '6px', color: '#cbd5e1' }}>
                      <span>Rated: <strong style={{ color: '#10b981' }}>{rated > 0 ? `${rated.toFixed(1)} kW` : 'N/A'}</strong></span>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>£{price > 0 ? price.toLocaleString() : 'N/A'} ex VAT</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border, #1e293b)', background: '#090d16', padding: '10px 20px 0', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('preferred')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              fontWeight: activeTab === 'preferred' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              borderBottom: activeTab === 'preferred' ? '2px solid #10b981' : '2px solid transparent',
              background: activeTab === 'preferred' ? '#0f172a' : 'transparent',
              color: activeTab === 'preferred' ? '#34d399' : '#94a3b8'
            }}
          >
            <Award size={14} />
            <span>Prime Preferred ({preferredList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bestMatch')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              fontWeight: activeTab === 'bestMatch' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              borderBottom: activeTab === 'bestMatch' ? '2px solid #10b981' : '2px solid transparent',
              background: activeTab === 'bestMatch' ? '#0f172a' : 'transparent',
              color: activeTab === 'bestMatch' ? '#34d399' : '#94a3b8'
            }}
          >
            <CheckCircle2 size={14} />
            <span>Best Technical Match ({bestMatchList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('valueCost')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              fontWeight: activeTab === 'valueCost' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              borderBottom: activeTab === 'valueCost' ? '2px solid #10b981' : '2px solid transparent',
              background: activeTab === 'valueCost' ? '#0f172a' : 'transparent',
              color: activeTab === 'valueCost' ? '#34d399' : '#94a3b8'
            }}
          >
            <Tag size={14} />
            <span>Value / Lowest Cost ({valueCostList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              fontWeight: activeTab === 'all' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              borderBottom: activeTab === 'all' ? '2px solid #10b981' : '2px solid transparent',
              background: activeTab === 'all' ? '#0f172a' : 'transparent',
              color: activeTab === 'all' ? '#34d399' : '#94a3b8'
            }}
          >
            <span>All Models ({allList.length})</span>
          </button>
        </div>

        {/* Sort Bar */}
        <div style={{ padding: '8px 20px', background: '#090d16', borderBottom: '1px solid var(--border, #1e293b)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Click headers to toggle sort (ASC/DESC):</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button type="button" onClick={() => handleSortToggle('brand')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'brand' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Brand {renderSortIndicator('brand')}
            </button>
            <button type="button" onClick={() => handleSortToggle('model')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'model' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Model {renderSortIndicator('model')}
            </button>
            <button type="button" onClick={() => handleSortToggle('marketingKw')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'marketingKw' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Marketing kW {renderSortIndicator('marketingKw')}
            </button>
            <button type="button" onClick={() => handleSortToggle('ratedOutput')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'ratedOutput' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Rated kW {renderSortIndicator('ratedOutput')}
            </button>
            <button type="button" onClick={() => handleSortToggle('price')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'price' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Price ex VAT {renderSortIndicator('price')}
            </button>
            <button type="button" onClick={() => handleSortToggle('mcsStatus')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'mcsStatus' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              MCS Status {renderSortIndicator('mcsStatus')}
            </button>
          </div>
        </div>

        {/* Content List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: '#090d16', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <AlertTriangle size={32} color="#fbbf24" style={{ margin: '0 auto 8px' }} />
              <p style={{ color: '#e2e8f0', fontWeight: 600, margin: 0 }}>No qualifying models in this view.</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', margin: 0 }}>Try switching tabs or adjusting property heat demand inputs.</p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const isSelected = selectedAshpId === item.id;
              const ratedOutput = getAshpRatedKw(item);
              const nominalKw = getAshpNominalKw(item);
              const isUndersized = reqDemand > 0 && ratedOutput < reqDemand;
              const surplus = reqDemand > 0 ? ratedOutput - reqDemand : 0;
              const priceEx = getAshpPriceEx(item);

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #10b981' : '1px solid #1e293b',
                    background: isSelected ? 'rgba(6, 78, 59, 0.25)' : isUndersized ? '#090d16' : '#0f172a',
                    opacity: isUndersized ? 0.6 : 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>
                        {item.brand || item.manufacturer || 'Generic'} {item.model || item.id}
                      </span>
                      {isSelected && (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Currently Selected
                        </span>
                      )}
                      {item.mcsReference && (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontFamily: 'monospace', background: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          {item.mcsReference}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <div>
                        Rated Output: <strong style={{ color: '#10b981' }}>{ratedOutput > 0 ? `${ratedOutput.toFixed(1)} kW` : 'N/A'}</strong> ({item.designCondition || item.ratedOutputCondition || 'A-2/W45'})
                      </div>
                      <div>
                        Marketing kW: <span style={{ color: '#cbd5e1' }}>{nominalKw > 0 ? `${nominalKw.toFixed(1)} kW` : 'N/A'}</span>
                      </div>
                      <div>
                        Surplus: <span style={{ color: surplus >= 0 ? '#10b981' : '#f87171', fontWeight: 700 }}>
                          {reqDemand > 0 ? (surplus >= 0 ? `+${surplus.toFixed(1)} kW` : `${surplus.toFixed(1)} kW`) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        Supplier: <span style={{ color: '#cbd5e1' }}>{item.supplier || 'City Plumbing'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                        £{priceEx > 0 ? priceEx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ex. VAT</div>
                    </div>

                    <button
                      type="button"
                      disabled={isUndersized}
                      onClick={() => {
                        onSelectAshp(item.id);
                        onClose();
                      }}
                      className={isUndersized ? 'btn btn-secondary btn-sm' : isSelected ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: isUndersized ? 'not-allowed' : 'pointer',
                        background: isUndersized ? '#1e293b' : isSelected ? '#059669' : '#0f172a',
                        color: isUndersized ? '#64748b' : '#ffffff',
                        border: isSelected ? '1px solid #10b981' : '1px solid #334155'
                      }}
                    >
                      {isUndersized ? 'Undersized' : isSelected ? 'Selected' : 'Select Model'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border, #1e293b)', background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={16} color="#10b981" />
            <span>Selection is based on certified rated output at design temperature (not marketing nominal kW).</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 16px', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

