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

  // Deduplicate cylinders list
  const seenKeys = new Set<string>();
  const deduplicatedCylinders: SuitableCylinderItem[] = [];

  for (const item of allCylinders) {
    const vol = Number(item.volumeLitres ?? item.nominal_litres ?? item.capacityLitres ?? 0);
    const key = (item.sku || `${item.brand}_${item.model}_${vol}`).toLowerCase().trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicatedCylinders.push(item);
    }
  }

  // Filter based on search query
  const filteredItems = deduplicatedCylinders.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const brand = (item.brand || item.manufacturer || '').toLowerCase();
    const model = (item.model || '').toLowerCase();
    const vol = String(item.volumeLitres || item.nominal_litres || '');
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
      const volA = Number(a.volumeLitres ?? a.nominal_litres ?? a.capacityLitres ?? 0);
      const volB = Number(b.volumeLitres ?? b.nominal_litres ?? b.capacityLitres ?? 0);
      result = volA - volB;
    } else if (sortField === 'brand') {
      const brandA = (a.brand || a.manufacturer || '').toLowerCase();
      const brandB = (b.brand || b.manufacturer || '').toLowerCase();
      result = brandA.localeCompare(brandB);
    } else if (sortField === 'price') {
      const priceA = Number(a.priceExVat ?? 0);
      const priceB = Number(b.priceExVat ?? 0);
      result = priceA - priceB;
    } else if (sortField === 'supplier') {
      const suppA = (a.supplier || '').toLowerCase();
      const suppB = (b.supplier || '').toLowerCase();
      result = suppA.localeCompare(suppB);
    }
    return sortOrder === 'asc' ? result : -result;
  });

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-500 ml-1 inline" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400 ml-1 inline" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400 ml-1 inline" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Select Hot Water Storage Cylinder</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Required Minimum Capacity: <span className="font-semibold text-emerald-400">{targetVol} L</span> (CIBSE / BS 6700 Rule)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top 3 Recommended Cylinders Banner */}
        {top3Recommended.length > 0 && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center space-x-2 mb-2.5">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">Top 3 Recommended Cylinders for Current Job</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-amber-400">#{option.rank} {option.label}</span>
                      {isSelected && <span className="text-emerald-400 font-bold">Selected</span>}
                    </div>
                    <div className="font-semibold text-white text-sm truncate">{vol} L — {rec.brand || rec.manufacturer} {rec.model}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{option.reason}</div>
                    <div className="flex justify-between items-center text-xs mt-2 text-slate-400">
                      <span>Capacity: <strong className="text-sky-400">{vol} L</strong></span>
                      <span className="font-bold text-slate-200">£{price > 0 ? price.toLocaleString() : 'N/A'} ex VAT</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search cylinder by capacity (150L, 210L...), brand, or model..."
            className="w-full max-w-md px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="text-xs text-slate-400">Showing {sortedItems.length} verified models</span>
        </div>

        {/* Sort Bar */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Click column headers to sort numerically:</span>
          <div className="flex items-center space-x-4">
            <button onClick={() => handleSortToggle('capacity')} className="hover:text-white font-medium flex items-center">
              Capacity (Litres) {renderSortIndicator('capacity')}
            </button>
            <button onClick={() => handleSortToggle('brand')} className="hover:text-white font-medium flex items-center">
              Brand & Model {renderSortIndicator('brand')}
            </button>
            <button onClick={() => handleSortToggle('supplier')} className="hover:text-white font-medium flex items-center">
              Supplier {renderSortIndicator('supplier')}
            </button>
            <button onClick={() => handleSortToggle('price')} className="hover:text-white font-medium flex items-center">
              Price ex VAT {renderSortIndicator('price')}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {sortedItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-slate-300 font-medium">No cylinder models match query '{searchQuery}'.</p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const isSelected = selectedCylinderId === item.id;
              const vol = Number(item.volumeLitres ?? item.nominal_litres ?? item.capacityLitres ?? 0);
              const priceEx = Number(item.priceExVat ?? 0);
              const isBelowRequirement = vol < targetVol;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/40'
                      : isBelowRequirement
                      ? 'bg-slate-950/40 border-slate-800 opacity-70'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-sky-400 text-base">{vol > 0 ? `${vol} L` : 'N/A'}</span>
                      <span className="font-bold text-white text-base">{item.brand || item.manufacturer} {item.model}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Currently Selected
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <div>Capacity: <strong className="text-sky-300">{vol} Litres</strong></div>
                      <div>Supplier: <span className="text-slate-300">{item.supplier || 'City Plumbing'}</span></div>
                      <div>Dimensions: <span className="text-slate-400">{item.dimensions || 'Unvented Stainless Steel'}</span></div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">£{priceEx > 0 ? priceEx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</div>
                      <div className="text-xs text-slate-400">ex. VAT</div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectCylinder(item.id);
                        onClose();
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950'
                          : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500'
                      }`}
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
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-emerald-400" />
            <span>Cylinder sizing is derived from property occupancy rules (CIBSE / BS 6700).</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
