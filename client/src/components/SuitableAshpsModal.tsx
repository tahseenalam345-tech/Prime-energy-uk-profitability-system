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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Technically Suitable Verified Heat Pumps</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Required Output: <span className="font-semibold text-emerald-400">≥ {reqDemand > 0 ? reqDemand.toFixed(1) : 'N/A'} kW</span> at design condition | Certified MCS Catalog
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top 3 Recommended Banner */}
        {top3Recommended.length > 0 && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center space-x-2 mb-2.5">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">Top 3 Recommended for Current Job</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-amber-400">#{idx + 1} {label}</span>
                      {isSelected && <span className="text-emerald-400 font-bold">Selected</span>}
                    </div>
                    <div className="font-semibold text-white text-sm truncate">{rec.brand || rec.manufacturer} {rec.model}</div>
                    {reason && <div className="text-xs text-slate-400 mt-0.5 truncate">{reason}</div>}
                    <div className="flex justify-between items-center text-xs mt-1 text-slate-400">
                      <span>Rated: <strong className="text-emerald-400">{rated > 0 ? `${rated.toFixed(1)} kW` : 'N/A'}</strong></span>
                      <span className="font-bold text-slate-200">£{price > 0 ? price.toLocaleString() : 'N/A'} ex VAT</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-3 space-x-2">
          <button
            onClick={() => setActiveTab('preferred')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all border-b-2 ${
              activeTab === 'preferred'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Prime Preferred ({preferredList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bestMatch')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all border-b-2 ${
              activeTab === 'bestMatch'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Best Technical Match ({bestMatchList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('valueCost')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all border-b-2 ${
              activeTab === 'valueCost'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Value / Lowest Cost ({valueCostList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all border-b-2 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <span>All Models ({allList.length})</span>
          </button>
        </div>

        {/* Sort Bar */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <span>Click headers to toggle sort (ASC/DESC):</span>
          <div className="flex items-center space-x-4">
            <button onClick={() => handleSortToggle('brand')} className="hover:text-white font-medium flex items-center">
              Brand {renderSortIndicator('brand')}
            </button>
            <button onClick={() => handleSortToggle('model')} className="hover:text-white font-medium flex items-center">
              Model {renderSortIndicator('model')}
            </button>
            <button onClick={() => handleSortToggle('marketingKw')} className="hover:text-white font-medium flex items-center">
              Marketing kW {renderSortIndicator('marketingKw')}
            </button>
            <button onClick={() => handleSortToggle('ratedOutput')} className="hover:text-white font-medium flex items-center">
              Rated kW {renderSortIndicator('ratedOutput')}
            </button>
            <button onClick={() => handleSortToggle('price')} className="hover:text-white font-medium flex items-center">
              Price ex VAT {renderSortIndicator('price')}
            </button>
            <button onClick={() => handleSortToggle('mcsStatus')} className="hover:text-white font-medium flex items-center">
              MCS Status {renderSortIndicator('mcsStatus')}
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {sortedItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-slate-300 font-medium">No qualifying models in this view.</p>
              <p className="text-sm text-slate-500 mt-1">Try switching tabs or adjusting property heat demand inputs.</p>
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
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/40'
                      : isUndersized
                      ? 'bg-slate-950/40 border-slate-800 opacity-60'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-white text-base">{item.brand || item.manufacturer || 'Generic'} {item.model || item.id}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Currently Selected
                        </span>
                      )}
                      {item.mcsReference && (
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {item.mcsReference}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <div>
                        Rated Output: <span className="font-bold text-emerald-400">{ratedOutput > 0 ? `${ratedOutput.toFixed(1)} kW` : 'N/A'}</span> ({item.designCondition || item.ratedOutputCondition || 'A-2/W45'})
                      </div>
                      <div>
                        Marketing kW: <span className="text-slate-300">{nominalKw > 0 ? `${nominalKw.toFixed(1)} kW` : 'N/A'}</span>
                      </div>
                      <div>
                        Surplus: <span className={surplus >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {reqDemand > 0 ? (surplus >= 0 ? `+${surplus.toFixed(1)} kW` : `${surplus.toFixed(1)} kW`) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        Supplier: <span className="text-slate-300">{item.supplier || 'City Plumbing'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">£{priceEx > 0 ? priceEx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</div>
                      <div className="text-xs text-slate-400">ex. VAT</div>
                    </div>

                    <button
                      disabled={isUndersized}
                      onClick={() => {
                        onSelectAshp(item.id);
                        onClose();
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        isUndersized
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950'
                          : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500'
                      }`}
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
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-emerald-400" />
            <span>Selection is based on certified rated output at design temperature (not marketing nominal kW).</span>
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
