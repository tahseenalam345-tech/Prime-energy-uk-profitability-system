import React, { useMemo } from 'react';
import { SearchableSelect, SelectOption } from './SearchableSelect.js';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export interface CompactRadiatorSelectorProps {
  catalog: any[];
  selectedType: string;
  selectedHeight: number | string;
  selectedLength: number | string;
  onChangeType: (type: string) => void;
  onChangeHeight: (height: number | '') => void;
  onChangeLength: (length: number | '') => void;
  compact?: boolean;
}

export const CompactRadiatorSelector: React.FC<CompactRadiatorSelectorProps> = ({
  catalog,
  selectedType,
  selectedHeight,
  selectedLength,
  onChangeType,
  onChangeHeight,
  onChangeLength,
  compact = true
}) => {
  // Types options
  const typeOptions: SelectOption[] = useMemo(() => [
    { value: 'K1', label: 'K1 (Single Convector)', badge: '70 sizes' },
    { value: 'P+', label: 'P+ (Double Panel Plus)', badge: '60 sizes' },
    { value: 'K2', label: 'K2 (Double Convector)', badge: '69 sizes' }
  ], []);

  // Filter valid heights based on selected type (e.g. P+ has NO 900mm)
  const heightOptions: SelectOption[] = useMemo(() => {
    if (!selectedType) {
      return [
        { value: 300, label: '300 mm' },
        { value: 450, label: '450 mm' },
        { value: 600, label: '600 mm' },
        { value: 700, label: '700 mm' },
        { value: 900, label: '900 mm' }
      ];
    }
    const matching = catalog.filter(r => r.radiator_type === selectedType || r.type === selectedType);
    const uniqueHeights = Array.from(new Set(matching.map(r => r.height_mm))).sort((a, b) => a - b);
    return uniqueHeights.map(h => ({
      value: h,
      label: `${h} mm`,
      badge: selectedType === 'P+' && h === 900 ? 'Excluded' : undefined
    }));
  }, [catalog, selectedType]);

  // Filter valid lengths based on selected type and height
  const lengthOptions: SelectOption[] = useMemo(() => {
    if (!selectedType || !selectedHeight) {
      return [];
    }
    const matching = catalog.filter(
      r => (r.radiator_type === selectedType || r.type === selectedType) &&
           Number(r.height_mm) === Number(selectedHeight)
    );
    const uniqueLengths = Array.from(new Set(matching.map(r => r.length_mm))).sort((a, b) => a - b);
    return uniqueLengths.map(l => {
      const item = matching.find(r => r.length_mm === l);
      const price = item?.normalized_ex_vat_price !== undefined && item?.normalized_ex_vat_price !== null
        ? `£${item.normalized_ex_vat_price.toFixed(2)} ex VAT`
        : '';
      return {
        value: l,
        label: `${l} mm`,
        sublabel: item?.product_name,
        badge: price
      };
    });
  }, [catalog, selectedType, selectedHeight]);

  // Currently selected full radiator item
  const activeRadiator = useMemo(() => {
    if (!selectedType || !selectedHeight || !selectedLength) return null;
    return catalog.find(
      r => (r.radiator_type === selectedType || r.type === selectedType) &&
           Number(r.height_mm) === Number(selectedHeight) &&
           Number(r.length_mm) === Number(selectedLength)
    );
  }, [catalog, selectedType, selectedHeight, selectedLength]);

  return (
    <div className={`compact-radiator-selector ${compact ? 'compact-layout' : ''}`}>
      <div className="radiator-selector-grid">
        {/* Type selector */}
        <div className="radiator-field">
          <label className="field-sublabel">Radiator Type</label>
          <SearchableSelect
            options={typeOptions}
            value={selectedType}
            onChange={(val) => {
              onChangeType(val);
              // Auto-reset height/length if invalid for new type
              if (val === 'P+' && Number(selectedHeight) === 900) {
                onChangeHeight('');
                onChangeLength('');
              }
            }}
            placeholder="Select type..."
            searchPlaceholder="Search type (K1, P+, K2)..."
            compact={compact}
          />
        </div>

        {/* Height selector */}
        <div className="radiator-field">
          <label className="field-sublabel">Height</label>
          <SearchableSelect
            options={heightOptions}
            value={selectedHeight}
            onChange={(val) => {
              onChangeHeight(val ? Number(val) : '');
              onChangeLength(''); // Reset length when height changes
            }}
            placeholder="Select height..."
            searchPlaceholder="Search height (300, 450, 600...)..."
            disabled={!selectedType}
            compact={compact}
          />
        </div>

        {/* Length selector */}
        <div className="radiator-field">
          <label className="field-sublabel">Length</label>
          <SearchableSelect
            options={lengthOptions}
            value={selectedLength}
            onChange={(val) => onChangeLength(val ? Number(val) : '')}
            placeholder={!selectedHeight ? 'Select height first' : 'Select length...'}
            searchPlaceholder="Search length (400, 500, 1000...)..."
            disabled={!selectedHeight || lengthOptions.length === 0}
            compact={compact}
          />
        </div>
      </div>

      {/* Selected Radiator Preview Ribbon */}
      {activeRadiator && (
        <div className="radiator-preview-ribbon">
          <div className="preview-left">
            <CheckCircle2 size={15} className="text-success" />
            <span className="preview-name">{activeRadiator.product_name}</span>
            <span className="preview-sku">SKU: {activeRadiator.sku || 'N/A'}</span>
          </div>
          <div className="preview-right">
            {activeRadiator.heat_output_watts && (
              <span className="preview-watts">{activeRadiator.heat_output_watts} W ({activeRadiator.source_btu || Math.round(activeRadiator.heat_output_watts * 3.412)} BTU)</span>
            )}
            <span className="preview-price">
              £{Number(activeRadiator.normalized_ex_vat_price || activeRadiator.price_ex_vat || 0).toFixed(2)} <span className="price-basis">ex VAT</span>
            </span>
            {activeRadiator.commercial_review_required === 1 && (
              <span className="badge-warning-compact" title={activeRadiator.commercial_review_reason || 'Commercial sign-off required'}>
                <AlertTriangle size={12} /> Review Required
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
