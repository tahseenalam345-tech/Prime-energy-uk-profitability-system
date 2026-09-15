import React, { useState } from 'react';
import { Plus, Trash2, Edit3, RotateCcw, X, AlertCircle, CheckCircle2, History } from 'lucide-react';

export interface CostLineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitPriceExVat: number;
  totalPriceExVat: number;
  isOverridden?: boolean;
  originalTotal?: number;
  originalPriceExVat?: number;
  isCustom?: boolean;
  isDeleted?: boolean;
}

export interface CustomLineItemInput {
  id?: string;
  category?: string;
  description: string;
  quantity: number;
  unitPriceExVat: number;
  total?: number;
  totalPriceExVat?: number;
}

interface CostCompositionTableProps {
  title?: string;
  subtitle?: string;
  lineItems: CostLineItem[];
  totalJobCost: number;
  costOverrides: Record<string, number>;
  deletedLineIds: string[];
  descriptionOverrides: Record<string, string>;
  customLineItems: CustomLineItemInput[];
  auditTrail?: Array<{ lineItem: string; originalCost: number; overriddenCost: number; changedAt: string }>;
  onUpdateCost: (idOrCategory: string, newCost: number) => void;
  onResetCost: (idOrCategory: string) => void;
  onDeleteLine: (line: CostLineItem) => void;
  onRestoreLine: (idOrCategory: string) => void;
  onAddCustomLine: (item: CustomLineItemInput) => void;
  onUpdateLineDetails: (id: string, newDescription: string, newQty: number, newUnitPrice: number) => void;
  onDeleteCustomLine: (idOrIndex: string | number) => void;
}

export const CostCompositionTable: React.FC<CostCompositionTableProps> = ({
  title = 'Commercial Cost Composition (ex VAT)',
  subtitle = 'Every cost field is manually editable. Edit amounts directly, edit line descriptions, delete lines, or add custom lines.',
  lineItems,
  totalJobCost,
  costOverrides,
  deletedLineIds,
  descriptionOverrides,
  customLineItems,
  auditTrail,
  onUpdateCost,
  onResetCost,
  onDeleteLine,
  onRestoreLine,
  onAddCustomLine,
  onUpdateLineDetails,
  onDeleteCustomLine
}) => {
  // Modal states
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newCustomDesc, setNewCustomDesc] = useState('');
  const [newCustomCategory, setNewCustomCategory] = useState('Custom Works');
  const [newCustomQty, setNewCustomQty] = useState<number | ''>(1);
  const [newCustomUnitPrice, setNewCustomUnitPrice] = useState<number | ''>('');

  const [editingLine, setEditingLine] = useState<CostLineItem | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editQty, setEditQty] = useState<number>(1);
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0);

  // Active (non-deleted) items vs deleted items
  const activeItems = lineItems.filter(item => !item.isDeleted && !deletedLineIds.includes(item.id) && !deletedLineIds.includes(item.category));
  const deletedItems = lineItems.filter(item => item.isDeleted || deletedLineIds.includes(item.id) || deletedLineIds.includes(item.category));

  const handleOpenAddCustom = () => {
    setNewCustomDesc('');
    setNewCustomCategory('Custom Works');
    setNewCustomQty(1);
    setNewCustomUnitPrice('');
    setShowAddCustomModal(true);
  };

  const handleSaveAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomDesc.trim() || newCustomUnitPrice === '') return;
    const qty = (newCustomQty !== '' && Number(newCustomQty) > 0) ? Number(newCustomQty) : 1;
    const unitPrice = Number(newCustomUnitPrice);
    const total = Math.round(qty * unitPrice * 100) / 100;
    const newItem: CustomLineItemInput = {
      id: `line_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: newCustomCategory.trim() || 'Custom Works',
      description: newCustomDesc.trim(),
      quantity: qty,
      unitPriceExVat: unitPrice,
      totalPriceExVat: total,
      total
    };
    onAddCustomLine(newItem);
    setShowAddCustomModal(false);
  };

  const handleOpenEditModal = (item: CostLineItem) => {
    setEditingLine(item);
    setEditDesc(descriptionOverrides[item.id] || descriptionOverrides[item.category] || item.description);
    setEditQty(item.quantity || 1);
    setEditUnitPrice(item.unitPriceExVat || (item.quantity ? Math.round(item.totalPriceExVat / item.quantity * 100) / 100 : item.totalPriceExVat));
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLine) return;
    onUpdateLineDetails(editingLine.id, editDesc.trim(), editQty, editUnitPrice);
    setEditingLine(null);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 className="card-title" style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-main)' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleOpenAddCustom}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 700 }}
        >
          <Plus size={14} /> Add Custom Line
        </button>
      </div>

      <div className="table-responsive">
        <table className="data-table" style={{ fontSize: '0.8125rem' }}>
          <thead>
            <tr>
              <th>Cost Line Item</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Amount ex VAT (£)</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeItems.map((item, idx) => {
              const isOverridden = item.isOverridden || costOverrides[item.id] !== undefined || costOverrides[item.category] !== undefined;
              const displayDesc = descriptionOverrides[item.id] || descriptionOverrides[item.category] || item.description;
              const defaultCost = item.originalTotal ?? item.originalPriceExVat;

              return (
                <tr key={item.id || idx} style={{ backgroundColor: item.isCustom ? '#f0fdf4' : isOverridden ? '#fffbeb' : undefined }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.category}</span>
                      {item.isCustom ? (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>CUSTOM</span>
                      ) : isOverridden ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>MODIFIED</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {displayDesc}
                    </div>
                    {isOverridden && defaultCost !== undefined && defaultCost !== item.totalPriceExVat && (
                      <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '2px' }}>
                        Default: £{defaultCost.toLocaleString()}
                      </div>
                    )}
                  </td>

                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {item.quantity}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>£</span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        className="form-control font-mono"
                        style={{
                          textAlign: 'right',
                          padding: '4px 8px',
                          fontSize: '0.8125rem',
                          width: '105px',
                          fontWeight: 700,
                          backgroundColor: isOverridden ? '#fef3c7' : undefined,
                          borderColor: isOverridden ? '#f59e0b' : undefined
                        }}
                        value={item.totalPriceExVat}
                        onChange={(e) => onUpdateCost(item.id || item.category, Number(e.target.value))}
                        title="Directly edit cost (ex VAT)"
                      />
                    </div>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                        title="Edit line description & quantity"
                      >
                        <Edit3 size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateCost(item.id || item.category, 0)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                        title="Set cost to £0"
                      >
                        £0
                      </button>

                      {isOverridden && !item.isCustom && (
                        <button
                          type="button"
                          onClick={() => onResetCost(item.id || item.category)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 6px', fontSize: '0.7rem', color: '#059669' }}
                          title="Reset to calculated default"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (item.isCustom) {
                            onDeleteCustomLine(item.id || idx);
                          } else {
                            onDeleteLine(item);
                          }
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 6px', fontSize: '0.7rem', color: '#dc2626' }}
                        title="Delete line item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {activeItems.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                  No active line items. All items have been deleted. Click &quot;Restore&quot; below or &quot;Add Custom Line&quot;.
                </td>
              </tr>
            )}

            {/* Total Row */}
            <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-panel)' }}>
              <td colSpan={2}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>TOTAL ESTIMATED / CONFIRMED JOB COST</strong>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sum of all active materials, equipment, labour & custom lines</div>
              </td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem' }}>
                £{totalJobCost.toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Deleted Items Section (Restorable) */}
      {deletedItems.length > 0 && (
        <div style={{ marginTop: '14px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#991b1b' }}>
              <AlertCircle size={14} /> Deleted / Excluded Standard Lines ({deletedItems.length})
            </div>
            <span style={{ fontSize: '0.7rem', color: '#b91c1c' }}>These items are excluded (£0) from total job cost</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {deletedItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #fca5a5',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#7f1d1d'
                }}
              >
                <span style={{ textDecoration: 'line-through' }}>{item.category}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>(Default: £{(item.originalTotal ?? 0).toLocaleString()})</span>
                <button
                  type="button"
                  onClick={() => onRestoreLine(item.id || item.category)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 6px', fontSize: '0.65rem', color: '#059669', borderColor: '#86efac' }}
                >
                  <RotateCcw size={10} /> Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Audit Trail */}
      {auditTrail && auditTrail.length > 0 && (
        <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            <History size={13} /> Cost Modification Audit Trail:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {auditTrail.slice(-5).map((audit, idx) => (
              <div key={idx} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{audit.lineItem}: £{audit.originalCost.toLocaleString()} → £{audit.overriddenCost.toLocaleString()}</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(audit.changedAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Custom Cost Line */}
      {showAddCustomModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <form onSubmit={handleSaveAddCustom} style={{
            background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '480px', width: '100%',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Add Custom Job Cost Line</h3>
              <button type="button" onClick={() => setShowAddCustomModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Scaffolding / Builders Works / Groundworks"
                  className="form-control"
                  value={newCustomCategory}
                  onChange={(e) => setNewCustomCategory(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Line Description / Specification *</label>
                <input
                  type="text"
                  placeholder="e.g. 2-lift tube & fitting scaffolding for rear elevation access"
                  className="form-control"
                  value={newCustomDesc}
                  onChange={(e) => setNewCustomDesc(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={newCustomQty}
                    onChange={(e) => setNewCustomQty(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Price ex VAT (£) *</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="e.g. 450"
                    className="form-control font-mono"
                    value={newCustomUnitPrice}
                    onChange={(e) => setNewCustomUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-panel)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Computed Subtotal:</span>
                <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                  £{((newCustomQty !== '' && newCustomUnitPrice !== '') ? (Number(newCustomQty) * Number(newCustomUnitPrice)) : 0).toLocaleString()} ex VAT
                </strong>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: 'var(--bg-panel)' }}>
              <button type="button" onClick={() => setShowAddCustomModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Add Cost Line</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Line Item Details */}
      {editingLine && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <form onSubmit={handleSaveEditModal} style={{
            background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '480px', width: '100%',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Edit Line: {editingLine.category}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Modify description, quantity, or unit rate</span>
              </div>
              <button type="button" onClick={() => setEditingLine(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Line Title / Description</label>
                <textarea
                  rows={2}
                  className="form-control"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={editQty}
                    onChange={(e) => setEditQty(Math.max(1, Number(e.target.value)))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Price ex VAT (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className="form-control font-mono"
                    value={editUnitPrice}
                    onChange={(e) => setEditUnitPrice(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-panel)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Computed Line Total:</span>
                <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                  £{(editQty * editUnitPrice).toLocaleString()} ex VAT
                </strong>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: 'var(--bg-panel)' }}>
              <button type="button" onClick={() => setEditingLine(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
