import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Zap, Award, Tag, Info, AlertTriangle } from 'lucide-react';
import { Badge } from './Badge.js';

export interface SuitableAshpItem {
  id: string;
  brand: string;
  manufacturer: string;
  productFamily: string;
  model: string;
  sku: string | null;
  nominalCapacity: number;
  ratedOutputAtDesign: number;
  designCondition: string;
  mcsStatus: string;
  mcsReference: string | null;
  priceExVat: number;
  supplier: string;
}

export interface SuitableAshpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredHeatDemandKw: number;
  selectedAshpId?: string | null;
  onSelectAshp: (productId: string) => void;
  categorizedAshps?: {
    preferred: SuitableAshpItem[];
    bestMatch: SuitableAshpItem[];
    valueCost: SuitableAshpItem[];
    alternatives: SuitableAshpItem[];
    allQualifying: SuitableAshpItem[];
  };
  allAshps?: SuitableAshpItem[];
}

export const SuitableAshpsModal: React.FC<SuitableAshpsModalProps> = ({
  isOpen,
  onClose,
  requiredHeatDemandKw,
  selectedAshpId,
  onSelectAshp,
  categorizedAshps,
  allAshps = []
}) => {
  const [activeTab, setActiveTab] = useState<'preferred' | 'bestMatch' | 'valueCost' | 'all'>('preferred');

  if (!isOpen) return null;

  const rawQualifying = (categorizedAshps?.allQualifying || allAshps)
    .filter(p => p.ratedOutputAtDesign >= requiredHeatDemandKw && p.mcsStatus !== 'UNVERIFIED');

  const preferredBrands = ['daikin', 'vaillant', 'mitsubishi', 'viessmann', 'baxi', 'grant'];

  const preferredList = (categorizedAshps?.preferred?.length ? categorizedAshps.preferred : rawQualifying)
    .filter(p => p.ratedOutputAtDesign >= requiredHeatDemandKw && p.mcsStatus !== 'UNVERIFIED' && preferredBrands.some(b => (p.brand || p.manufacturer || '').toLowerCase().includes(b)))
    .sort((a, b) => (a.ratedOutputAtDesign - requiredHeatDemandKw) - (b.ratedOutputAtDesign - requiredHeatDemandKw));

  const bestMatchList = (categorizedAshps?.bestMatch?.length ? categorizedAshps.bestMatch : rawQualifying)
    .filter(p => p.ratedOutputAtDesign >= requiredHeatDemandKw && p.mcsStatus !== 'UNVERIFIED')
    .sort((a, b) => (a.ratedOutputAtDesign - requiredHeatDemandKw) - (b.ratedOutputAtDesign - requiredHeatDemandKw));

  const valueCostList = (categorizedAshps?.valueCost?.length ? categorizedAshps.valueCost : rawQualifying)
    .filter(p => p.ratedOutputAtDesign >= requiredHeatDemandKw && p.mcsStatus !== 'UNVERIFIED')
    .sort((a, b) => a.priceExVat - b.priceExVat);

  const allList = [...rawQualifying].sort((a, b) => (a.ratedOutputAtDesign - requiredHeatDemandKw) - (b.ratedOutputAtDesign - requiredHeatDemandKw));

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Technically Suitable Verified Heat Pumps</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Required Output: <span className="font-semibold text-emerald-400">≥ {requiredHeatDemandKw.toFixed(1)} kW</span> at design condition | All models verified
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-slate-300 font-medium">No qualifying models in this category.</p>
              <p className="text-sm text-slate-500 mt-1">Try switching to the "All Models" tab to view available alternatives.</p>
            </div>
          ) : (
            activeItems.map((item) => {
              const isSelected = selectedAshpId === item.id;
              const isUndersized = item.ratedOutputAtDesign < requiredHeatDemandKw;
              const surplus = item.ratedOutputAtDesign - requiredHeatDemandKw;

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
                      <span className="font-bold text-white text-base">{item.brand} {item.model}</span>
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
                        Rated Output: <span className="font-bold text-emerald-400">{item.ratedOutputAtDesign} kW</span> ({item.designCondition})
                      </div>
                      <div>
                        Marketing kW: <span className="text-slate-300">{item.nominalCapacity} kW</span>
                      </div>
                      <div>
                        Surplus: <span className={surplus >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {surplus >= 0 ? `+${surplus.toFixed(1)} kW` : `${surplus.toFixed(1)} kW`}
                        </span>
                      </div>
                      <div>
                        Supplier: <span className="text-slate-300">{item.supplier}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">£{item.priceExVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
