import React, { useState, useEffect } from 'react';
import { Tag, ExternalLink, Edit3, ShieldAlert, CheckCircle2, History, AlertCircle, Building2, Plus, Info } from 'lucide-react';
import { api } from '../services/api.js';
import { User } from '../types.js';

interface PricingViewProps {
  currentUser: User | null;
}

export const PricingView: React.FC<PricingViewProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Edit/Add price modal state
  const [sourceType, setSourceType] = useState('CITY_PLUMBING');
  const [supplier, setSupplier] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [priceExVat, setPriceExVat] = useState<number | ''>('');
  const [priceIncVat, setPriceIncVat] = useState<number | ''>('');
  const [availability, setAvailability] = useState('In stock');
  const [confidence, setConfidence] = useState('MARKET_CONFIRMED');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Price history inspection
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await api.getProductsDetailed({ family: 'ASHP' });
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load pricing', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const openEditModal = async (p: any) => {
    setEditingProduct(p);
    setSourceType(p.source_type || 'CITY_PLUMBING');
    setSupplier(p.supplier || 'City Plumbing');
    setSourceUrl(p.source_url || '');
    setPriceExVat(p.price_ex_vat !== null ? p.price_ex_vat : '');
    setPriceIncVat(p.price_inc_vat !== null ? p.price_inc_vat : '');
    setAvailability(p.availability || 'In stock');
    setConfidence(p.confidence || 'MARKET_CONFIRMED');
    setNotes('');

    // Fetch complete price history
    try {
      const detail = await api.getProduct(p.id);
      setPriceHistory(detail.prices || []);
    } catch (err) {
      setPriceHistory([]);
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSubmitting(true);
    try {
      await api.updateProductPrice(editingProduct.id, {
        sourceType,
        supplier,
        sourceUrl,
        priceExVat: priceExVat === '' ? null : Number(priceExVat),
        priceIncVat: priceIncVat === '' ? null : Number(priceIncVat),
        availability,
        confidence,
        notes,
        userId: currentUser?.id || 'user_admin'
      });
      setEditingProduct(null);
      fetchPricing();
    } catch (err: any) {
      alert('Failed to update price: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (sourceFilter === 'ALL') return true;
    if (sourceFilter === 'CITY_PLUMBING') return p.source_type === 'CITY_PLUMBING' || !p.source_type;
    return p.source_type === sourceFilter;
  });

  const isAdmin = currentUser?.role_name === 'ADMIN';

  return (
    <div className="pricing-view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            Commercial Pricing & Sourcing Governance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            Multi-source trade pricing, retailer market references, and immutable price history preservation.
          </p>
        </div>
      </div>

      {/* Commercial Governance Banner (Requirements 14 & 26) */}
      <div style={{ 
        background: '#f0fdf4', 
        border: '1px solid #bbf7d0', 
        borderRadius: '8px', 
        padding: '14px 18px', 
        marginBottom: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px' 
      }}>
        <Info size={22} color="#16a34a" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
          <strong>Commercial Pricing Separation Notice:</strong> City Plumbing UK selling prices are stored as <strong>MARKET_REFERENCE_PRICE</strong>. They do not automatically establish Prime Energy's internal purchasing cost. The database architecture separates Market Reference, Trade Merchant, and Internal Cost tiers to protect commercial margin calculations.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Price Source:</span>
          <button 
            onClick={() => setSourceFilter('ALL')} 
            className={`tab-btn ${sourceFilter === 'ALL' ? 'active' : ''}`}
            style={{ padding: '5px 12px', fontSize: '0.8rem' }}
          >
            All Sources ({products.length})
          </button>
          <button 
            onClick={() => setSourceFilter('CITY_PLUMBING')} 
            className={`tab-btn ${sourceFilter === 'CITY_PLUMBING' ? 'active' : ''}`}
            style={{ padding: '5px 12px', fontSize: '0.8rem' }}
          >
            City Plumbing UK
          </button>
          <button 
            onClick={() => setSourceFilter('UK_SUPPLIER')} 
            className={`tab-btn ${sourceFilter === 'UK_SUPPLIER' ? 'active' : ''}`}
            style={{ padding: '5px 12px', fontSize: '0.8rem' }}
          >
            Secondary Trade Merchants
          </button>
        </div>
      </div>

      {/* Pricing Data Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>Product & Model</th>
                <th style={{ minWidth: '140px' }}>Source Tier</th>
                <th style={{ minWidth: '160px' }}>Price (ex VAT)</th>
                <th style={{ minWidth: '130px' }}>Availability</th>
                <th style={{ minWidth: '150px' }}>Price Confidence</th>
                <th style={{ minWidth: '150px' }}>Supplier / Merchant</th>
                <th style={{ minWidth: '110px' }}>Date Checked</th>
                <th style={{ minWidth: '100px' }}>Source Link</th>
                {isAdmin && <th style={{ width: '100px' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>Loading pricing catalog...</td></tr>
              ) : filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-neutral" style={{ fontWeight: 700 }}>{p.brand || p.manufacturer}</span>
                      {p.marketing_nominal_kw && <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{p.marketing_nominal_kw} kW</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>{p.model}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>SKU: {p.sku || p.id}</div>
                  </td>

                  <td>
                    <span className={`badge ${p.source_type === 'CITY_PLUMBING' || !p.source_type ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.725rem' }}>
                      {p.source_type === 'CITY_PLUMBING' || !p.source_type ? 'MARKET REFERENCE' : p.source_type}
                    </span>
                  </td>

                  <td>
                    {p.price_ex_vat !== null && p.price_ex_vat !== undefined ? (
                      <div>
                        <div style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                          £{p.price_ex_vat.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {p.price_inc_vat && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            £{p.price_inc_vat.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} inc VAT
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                        PRICE REQUIRED
                      </span>
                    )}
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8rem', color: p.availability === 'In stock' ? '#059669' : '#d97706', fontWeight: 600 }}>
                      {p.availability || 'In stock'}
                    </span>
                  </td>

                  <td>
                    {p.confidence === 'MARKET_CONFIRMED' ? (
                      <span className="badge badge-success"><CheckCircle2 size={12} /> MARKET CONFIRMED</span>
                    ) : p.confidence === 'PROVISIONAL' ? (
                      <span className="badge badge-warning"><History size={12} /> PROVISIONAL</span>
                    ) : (
                      <span className="badge badge-danger"><ShieldAlert size={12} /> PRICE REQUIRED</span>
                    )}
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.supplier || 'City Plumbing'}</div>
                  </td>

                  <td className="font-mono" style={{ fontSize: '0.75rem' }}>
                    {p.date_collected || '2026-09-12'}
                  </td>

                  <td>
                    {p.source_url ? (
                      <a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '0.75rem' }}>
                        Product Page <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Trade Account</span>
                    )}
                  </td>

                  {isAdmin && (
                    <td>
                      <button
                        onClick={() => openEditModal(p)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit3 size={12} /> Edit Price
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRICE UPDATE & SOURCE CREATION MODAL */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Manage Price Sources & History
                </h2>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {editingProduct.brand || editingProduct.manufacturer} {editingProduct.model}
                </div>
              </div>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>

            {/* Existing price records history */}
            {priceHistory.length > 0 && (
              <div style={{ marginBottom: '16px', background: 'var(--bg-panel)', borderRadius: '6px', padding: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Preserved Price History ({priceHistory.length} records):
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {priceHistory.map((ph, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                      <span><strong style={{ color: 'var(--text-main)' }}>{ph.source_type}</strong> ({ph.supplier})</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>
                        {ph.price_ex_vat !== null ? `£${Number(ph.price_ex_vat).toLocaleString()} ex VAT` : 'NULL'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{ph.date_collected} {ph.is_current ? '(Current)' : '(Historical)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleUpdatePrice}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Price Source Tier</label>
                  <select 
                    value={sourceType} 
                    onChange={(e) => setSourceType(e.target.value)} 
                    className="form-control"
                  >
                    <option value="CITY_PLUMBING">CITY_PLUMBING (Market Reference)</option>
                    <option value="UK_SUPPLIER">UK_SUPPLIER (Trade Merchant)</option>
                    <option value="MANUFACTURER">MANUFACTURER (Direct Trade)</option>
                    <option value="INTERNAL">INTERNAL (Contract Cost)</option>
                    <option value="MANUAL">MANUAL (Survey Specific)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Supplier / Merchant Name</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. City Plumbing, Wolseley"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Price Ex VAT (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceExVat}
                    onChange={(e) => setPriceExVat(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Leave blank if NULL"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Price Inc VAT (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceIncVat}
                    onChange={(e) => setPriceIncVat(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Optional / Calculated"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Availability</label>
                  <select 
                    value={availability} 
                    onChange={(e) => setAvailability(e.target.value)} 
                    className="form-control"
                  >
                    <option value="In stock">In stock</option>
                    <option value="Available to order">Available to order</option>
                    <option value="Out of stock">Out of stock</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Confidence</label>
                  <select 
                    value={confidence} 
                    onChange={(e) => setConfidence(e.target.value)} 
                    className="form-control"
                  >
                    <option value="MARKET_CONFIRMED">MARKET_CONFIRMED</option>
                    <option value="PROVISIONAL">PROVISIONAL</option>
                    <option value="PRICE_REQUIRED">PRICE_REQUIRED</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Source URL</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.cityplumbing.co.uk/p/..."
                  className="form-control"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Update Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for price update, merchant quote reference..."
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Recording...' : 'Record Price & Preserve History'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
