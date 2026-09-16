import React, { useState } from 'react';
import { X, CheckCircle2, Award, Tag, Info, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck } from 'lucide-react';

export interface SuitableCylinderItem {
  id: string;
  brand?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  sku?: string | null;
  volumeLitres?: number | null;
  nominal_litres?: number | null;
  capacityLitres?: number | null;
  priceExVat?: number | null;
  supplier?: string | null;
  dimensions?: string | null;
}

export interface SuitableCylinderOption {
  product: SuitableCylinderItem;
  rank: number;
  label: string;
  reason: string;
}

export interface SuitableCylindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredVolumeLitres?: number;
  selectedCylinderId?: string | null;
  onSelectCylinder: (productId: string) => void;
  top3Recommended?: SuitableCylinderOption[];
  allCylinders?: SuitableCylinderItem[];
}

type SortField = 'capacity' | 'brand' | 'price' | 'supplier';

export const SuitableCylindersModal: React.FC<SuitableCylindersModalProps> = ({
  isOpen,
  onClose,
  requiredVolumeLitres = 200,
  selectedCylinderId,
  onSelectCylinder,
  top3Recommended = [],
  allCylinders = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('capacity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  if (!isOpen) return null;

  const targetVol = Number(requiredVolumeLitres || 200);

  const getCylVolume = (item: any) =>
    Number(item.volumeLitres ?? item.nominal_litres ?? item.capacityLitres ?? item.capacity_litres ?? 200);

  const getCylPriceEx = (item: any) =>
    Number(item.priceExVat ?? item.price_ex_vat ?? 0);

  const getCylBrand = (item: any) =>
    (item.brand || item.manufacturer || 'Generic').toString();

  const getCylModel = (item: any) =>
    (item.model || '').toString();

  const getCylSupplier = (item: any) =>
    (item.supplier || 'City Plumbing').toString();

  // Deduplicate cylinders list
  const seenKeys = new Set<string>();
  const deduplicatedCylinders: SuitableCylinderItem[] = [];

  for (const item of allCylinders) {
    const vol = getCylVolume(item);
    const brand = getCylBrand(item);
    const model = getCylModel(item);
    const key = (item.sku || `${brand}_${model}_${vol}`).toLowerCase().trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicatedCylinders.push(item);
    }
  }

  // Filter based on search query
  const filteredItems = deduplicatedCylinders.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const brand = getCylBrand(item).toLowerCase();
    const model = getCylModel(item).toLowerCase();
    const vol = String(getCylVolume(item));
    return brand.includes(q) || model.includes(q) || vol.includes(q);
  });

  // Handle header sort toggling
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Perform numeric / string sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    let result = 0;
    if (sortField === 'capacity') {
      const volA = getCylVolume(a);
      const volB = getCylVolume(b);
      result = volA - volB;
    } else if (sortField === 'brand') {
      const brandA = getCylBrand(a).toLowerCase();
      const brandB = getCylBrand(b).toLowerCase();
      result = brandA.localeCompare(brandB);
    } else if (sortField === 'price') {
      const priceA = getCylPriceEx(a);
      const priceB = getCylPriceEx(b);
      result = priceA - priceB;
    } else if (sortField === 'supplier') {
      const suppA = getCylSupplier(a).toLowerCase();
      const suppB = getCylSupplier(b).toLowerCase();
      result = suppA.localeCompare(suppB);
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
              <ShieldCheck size={20} color="#10b981" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #ffffff)' }}>
                Select Hot Water Storage Cylinder
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px', margin: 0 }}>
              Required Minimum Capacity: <strong style={{ color: '#10b981' }}>{targetVol} L</strong> (CIBSE / BS 6700 Rule)
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

        {/* Top 3 Recommended Cylinders Banner */}
        {top3Recommended.length > 0 && (
          <div style={{ padding: '14px 20px', background: '#090d16', borderBottom: '1px solid var(--border, #1e293b)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Award size={16} color="#fbbf24" />
              <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fcd34d', margin: 0 }}>
                Top 3 Recommended Cylinders for Current Job
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {top3Recommended.map((option) => {
                const rec = option.product;
                const vol = Number(rec.volumeLitres ?? rec.nominal_litres ?? 200);
                const price = Number(rec.priceExVat ?? 0);
                const isSelected = selectedCylinderId === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => {
                      onSelectCylinder(rec.id);
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
                      <span style={{ fontWeight: 800, color: '#fbbf24' }}>#{option.rank} {option.label}</span>
                      {isSelected && <span style={{ color: '#34d399', fontWeight: 800 }}>Selected</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {vol} L — {rec.brand || rec.manufacturer} {rec.model}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{option.reason}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '8px', color: '#cbd5e1' }}>
                      <span>Capacity: <strong style={{ color: '#38bdf8' }}>{vol} L</strong></span>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>£{price > 0 ? price.toLocaleString() : 'N/A'} ex VAT</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div style={{ padding: '12px 20px', background: '#090d16', borderBottom: '1px solid var(--border, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <input
            type="text"
            placeholder="Search cylinder by capacity (150L, 210L...), brand, or model..."
            className="form-control"
            style={{ maxWidth: '420px', width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Showing {sortedItems.length} verified models</span>
        </div>

        {/* Sort Bar */}
        <div style={{ padding: '8px 20px', background: '#090d16', borderBottom: '1px solid var(--border, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Click column headers to sort numerically:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button type="button" onClick={() => handleSortToggle('capacity')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'capacity' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Capacity (Litres) {renderSortIndicator('capacity')}
            </button>
            <button type="button" onClick={() => handleSortToggle('brand')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'brand' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Brand & Model {renderSortIndicator('brand')}
            </button>
            <button type="button" onClick={() => handleSortToggle('supplier')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'supplier' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Supplier {renderSortIndicator('supplier')}
            </button>
            <button type="button" onClick={() => handleSortToggle('price')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortField === 'price' ? '#ffffff' : '#94a3b8', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              Price ex VAT {renderSortIndicator('price')}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: '#090d16', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <AlertTriangle size={32} color="#fbbf24" style={{ margin: '0 auto 8px' }} />
              <p style={{ color: '#e2e8f0', fontWeight: 600, margin: 0 }}>No cylinder models match query '{searchQuery}'.</p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const isSelected = selectedCylinderId === item.id;
              const vol = getCylVolume(item);
              const priceEx = getCylPriceEx(item);
              const isBelowRequirement = vol < targetVol;

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #10b981' : '1px solid #1e293b',
                    background: isSelected ? 'rgba(6, 78, 59, 0.25)' : isBelowRequirement ? '#090d16' : '#0f172a',
                    opacity: isBelowRequirement ? 0.7 : 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1rem' }}>{vol > 0 ? `${vol} L` : 'N/A'}</span>
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>{item.brand || item.manufacturer} {item.model}</span>
                      {isSelected && (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Currently Selected
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <div>Capacity: <strong style={{ color: '#7dd3fc' }}>{vol} Litres</strong></div>
                      <div>Supplier: <span style={{ color: '#cbd5e1' }}>{item.supplier || 'City Plumbing'}</span></div>
                      <div>Dimensions: <span style={{ color: '#94a3b8' }}>{item.dimensions || 'Unvented Stainless Steel'}</span></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>£{priceEx > 0 ? priceEx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ex. VAT</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectCylinder(item.id);
                        onClose();
                      }}
                      className={isSelected ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isSelected ? '#059669' : '#0f172a',
                        color: '#ffffff',
                        border: isSelected ? '1px solid #10b981' : '1px solid #334155'
                      }}
                    >
                      {isSelected ? 'Selected' : 'Select Cylinder'}
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
            <span>Cylinder sizing is derived from property occupancy rules (CIBSE / BS 6700).</span>
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

