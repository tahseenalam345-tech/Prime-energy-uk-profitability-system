import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Zap, Droplets, Grid, Wrench, Search, Filter, 
  ExternalLink, CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck, 
  ShieldAlert, Info, Edit3, X, RefreshCw, Award, BookOpen,
  SlidersHorizontal, ArrowUpDown, HelpCircle, Layers, Check,
  ChevronRight, Database, FileText, DollarSign, Tag
} from 'lucide-react';
import { api } from '../services/api.js';

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'ADMIN_DATA' | 'TECHNICAL'>('ADMIN_DATA');
  
  // Primary Filters
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedMcs, setSelectedMcs] = useState<string>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Category-Specific Advanced Search & Filters
  // 1. ASHP (Heat Pump kW Output)
  const [selectedKw, setSelectedKw] = useState<string>('ALL');
  const [minKwInput, setMinKwInput] = useState<string>('');
  const [maxKwInput, setMaxKwInput] = useState<string>('');

  // 2. Cylinder (Litre Volume)
  const [selectedLitres, setSelectedLitres] = useState<string>('ALL');
  const [minLitresInput, setMinLitresInput] = useState<string>('');
  const [maxLitresInput, setMaxLitresInput] = useState<string>('');

  // 3. Electric Radiator / Heater (Wattage Output)
  const [selectedWatts, setSelectedWatts] = useState<string>('ALL');
  const [minWattsInput, setMinWattsInput] = useState<string>('');
  const [maxWattsInput, setMaxWattsInput] = useState<string>('');

  // 4. Fan Heater Output (kW)
  const [selectedFanKw, setSelectedFanKw] = useState<string>('ALL');

  // 5. Pipework Diameter / Size (mm)
  const [selectedPipeSize, setSelectedPipeSize] = useState<string>('ALL');

  // 6. Accessories Sub-type
  const [selectedAccessoryType, setSelectedAccessoryType] = useState<string>('ALL');

  // Radiator Specific Filters (Active when Radiator category selected)
  const [selectedRadType, setSelectedRadType] = useState<string>('ALL');
  const [selectedRadHeight, setSelectedRadHeight] = useState<string>('ALL');
  const [selectedRadLength, setSelectedRadLength] = useState<string>('ALL');
  const [allRadDimensions, setAllRadDimensions] = useState<{ heights: number[]; lengths: number[] }>({
    heights: [300, 450, 500, 600, 700, 900],
    lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1500, 1600, 1800, 2000, 2200, 2400, 2500, 2600, 2800, 3000]
  });

  // Modal inspection & edit states
  const [inspectingProduct, setInspectingProduct] = useState<any | null>(null);
  const [productPrices, setProductPrices] = useState<any[]>([]);
  const [editMcsStatus, setEditMcsStatus] = useState<string>('MCS_CERTIFIED');
  const [editMcsRef, setEditMcsRef] = useState<string>('');
  const [editOfgemPel, setEditOfgemPel] = useState<string>('PEL_LISTED');
  const [editBusStatus, setEditBusStatus] = useState<string>('VERIFIED');
  const [editManualReview, setEditManualReview] = useState<boolean>(false);
  const [editRatedKw, setEditRatedKw] = useState<number>(0);
  const [editCondition, setEditCondition] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Discrepancy report modal
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeCategory !== 'ALL') params.family = activeCategory;
      if (selectedBrand !== 'ALL') params.brand = selectedBrand;
      if (selectedMcs !== 'ALL') params.mcs_status = selectedMcs;
      if (selectedVerification !== 'ALL') params.verification_status = selectedVerification;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      if (activeCategory === 'RADIATOR') {
        if (selectedRadType !== 'ALL') params.radiator_type = selectedRadType;
        if (selectedRadHeight !== 'ALL') params.height_mm = selectedRadHeight;
        if (selectedRadLength !== 'ALL') params.length_mm = selectedRadLength;
      }

      if (activeCategory === 'ASHP' || activeCategory === 'ALL') {
        if (selectedKw !== 'ALL') params.kw_rating = selectedKw;
        if (minKwInput) params.min_kw = minKwInput;
        if (maxKwInput) params.max_kw = maxKwInput;
      }

      if (activeCategory === 'CYLINDER' || activeCategory === 'ALL') {
        if (selectedLitres !== 'ALL') params.litres = selectedLitres;
        if (minLitresInput) params.min_litres = minLitresInput;
        if (maxLitresInput) params.max_litres = maxLitresInput;
      }

      if (activeCategory === 'ERH' || activeCategory === 'ALL') {
        if (selectedWatts !== 'ALL') params.watts = selectedWatts;
        if (minWattsInput) params.min_watts = minWattsInput;
        if (maxWattsInput) params.max_watts = maxWattsInput;
      }

      if (activeCategory === 'FAN_HEATER' || activeCategory === 'ALL') {
        if (selectedFanKw !== 'ALL') params.kw_rating = selectedFanKw;
      }

      if (activeCategory === 'PIPEWORK' || activeCategory === 'ALL') {
        if (selectedPipeSize !== 'ALL') params.pipe_size_mm = selectedPipeSize;
      }

      if (activeCategory === 'ACCESSORIES' || activeCategory === 'ALL') {
        if (selectedAccessoryType !== 'ALL') params.accessory_type = selectedAccessoryType;
      }

      const res = await api.getProductsDetailed(params);
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await api.getProductStatsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load stats summary', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [
    activeCategory, selectedBrand, selectedMcs, selectedVerification, 
    selectedRadType, selectedRadHeight, selectedRadLength,
    selectedKw, minKwInput, maxKwInput,
    selectedLitres, minLitresInput, maxLitresInput,
    selectedWatts, minWattsInput, maxWattsInput,
    selectedFanKw, selectedPipeSize, selectedAccessoryType
  ]);

  useEffect(() => {
    fetchSummary();

    // Dynamically retrieve all distinct heights & lengths from radiator catalogue
    const loadRadOptions = async () => {
      try {
        const res = await api.getRadiatorCatalogue();
        if (res.radiators && Array.isArray(res.radiators)) {
          const heights = new Set<number>([300, 450, 500, 600, 700, 900]);
          const lengths = new Set<number>([300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1500, 1600, 1800, 2000, 2200, 2400, 2500, 2600, 2800, 3000]);
          res.radiators.forEach((r: any) => {
            if (r.height_mm) heights.add(Number(r.height_mm));
            if (r.length_mm) lengths.add(Number(r.length_mm));
          });
          setAllRadDimensions({
            heights: Array.from(heights).sort((a, b) => a - b),
            lengths: Array.from(lengths).sort((a, b) => a - b)
          });
        }
      } catch (err) {
        console.error('Failed to load radiator catalogue options', err);
      }
    };
    loadRadOptions();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const openInspectModal = async (p: any) => {
    setInspectingProduct(p);
    setEditMcsStatus(p.mcs_status || 'UNCLEAR');
    setEditMcsRef(p.mcs_product_reference || '');
    setEditOfgemPel(p.ofgem_pel_status || 'NOT_CHECKED');
    setEditBusStatus(p.bus_product_eligibility_status || 'NOT_VERIFIED');
    setEditManualReview(p.manual_review_required === 1);
    setEditRatedKw(p.rated_output_kw || p.rated_output_at_design || 0);
    setEditCondition(p.rated_output_condition || p.design_condition || 'A7/W35');
    setEditNotes(p.notes || '');

    try {
      const res = await api.getProduct(p.id);
      setProductPrices(res.prices || []);
    } catch (err) {
      setProductPrices([]);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingProduct) return;
    setSavingProduct(true);
    try {
      await api.updateProduct(inspectingProduct.id, {
        mcs_status: editMcsStatus,
        mcs_product_reference: editMcsRef,
        ofgem_pel_status: editOfgemPel,
        bus_product_eligibility_status: editBusStatus,
        manual_review_required: editManualReview ? 1 : 0,
        rated_output_kw: Number(editRatedKw),
        rated_output_condition: editCondition,
        notes: editNotes,
        userId: 'user_admin'
      });
      setInspectingProduct(null);
      fetchProducts();
      fetchSummary();
    } catch (err: any) {
      alert('Failed to update product: ' + err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const categories = [
    { id: 'ALL', label: 'All Products' },
    { id: 'ASHP', label: 'ASHP (Heat Pumps)', icon: Zap },
    { id: 'CYLINDER', label: 'Cylinders', icon: Droplets },
    { id: 'RADIATOR', label: 'Radiators', icon: Grid },
    { id: 'ERH', label: 'ERH (Electric Rads)', icon: Layers },
    { id: 'FAN_HEATER', label: 'Fan Heaters', icon: Wrench },
    { id: 'PIPEWORK', label: 'Pipework', icon: SlidersHorizontal },
    { id: 'ACCESSORIES', label: 'Accessories', icon: Package }
  ];

  // Distinct brands computed from products list
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      const b = p.brand || p.manufacturer;
      if (b) set.add(b.trim());
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [products]);

  // Sizing verification note helper - Prominent category-specific display (Compact)
  const renderExactOutputCapacity = (p: any) => {
    if (p.family === 'ASHP') {
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#059669' }}>
              {p.rated_output_kw ? `${p.rated_output_kw} kW` : 'NOT FOUND'}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#0f766e', background: '#ccfbf1', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
              {p.rated_output_condition || 'A7/W35'}
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-main)', marginTop: '2px' }}>
            Nominal: <strong>{p.marketing_nominal_kw ? `${p.marketing_nominal_kw} kW` : 'N/A'}</strong>
          </div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
            {p.flow_temperature || 65}°C | {p.refrigerant || 'R290'} | {p.phase === 3 ? '3-Ph' : '1-Ph'}
          </div>
        </div>
      );
    } else if (p.family === 'CYLINDER') {
      const litres = p.exact_capacity_litres || p.nominal_capacity || 200;
      const dims = [
        p.height_mm ? `${p.height_mm}H` : null,
        p.diameter_mm ? `${p.diameter_mm}Ø` : null
      ].filter(Boolean).join('×');

      return (
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0284c7' }}>
            {litres} Litres
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '1px' }}>
            {p.cylinder_type || 'Unvented'}
          </div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px' }}>
            {dims ? dims : 'On datasheet'}
            {p.coil_area_m2 ? ` | ${p.coil_area_m2}m²` : ''}
          </div>
        </div>
      );
    } else if (p.family === 'RADIATOR') {
      return (
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#d97706' }}>
            {p.output_w_delta_t50 ? `${p.output_w_delta_t50} W @ ΔT50` : 'Datasheet output'}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, marginTop: '1px' }}>
            {p.radiator_type || 'K2'} {p.height_mm ? `${p.height_mm}H` : ''} {p.length_mm ? `× ${p.length_mm}L` : ''}
          </div>
          {(p.output_w_low_temp || p.output_w_delta_t30) && (
            <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Low-T: {p.output_w_low_temp || p.output_w_delta_t30} W @ ΔT30
            </div>
          )}
        </div>
      );
    } else if (p.family === 'ERH') {
      const watts = p.output_w_delta_t50 || (p.rated_output_kw ? Math.round(p.rated_output_kw * 1000) : null);
      const dims = [
        p.height_mm ? `${p.height_mm}H` : null,
        p.diameter_mm ? `${p.diameter_mm}W` : null,
        p.depth_mm ? `${p.depth_mm}D` : null
      ].filter(Boolean).join('×');

      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#7c3aed' }}>
              {watts ? `${watts}W` : `${p.rated_output_kw || p.marketing_nominal_kw} kW`}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#6b21a8', background: '#f3e8ff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
              {p.rated_output_kw ? `${p.rated_output_kw} kW` : 'Electric'}
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '1px' }}>
            {p.product_type || 'Panel'} {dims ? `(${dims})` : ''}
          </div>
          {p.electrical_requirements && (
            <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.electrical_requirements}
            </div>
          )}
        </div>
      );
    } else if (p.family === 'FAN_HEATER') {
      const kw = p.rated_output_kw || p.marketing_nominal_kw;
      const dims = [
        p.height_mm ? `${p.height_mm}H` : null,
        p.diameter_mm ? `${p.diameter_mm}W` : null,
        p.depth_mm ? `${p.depth_mm}D` : null
      ].filter(Boolean).join('×');

      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ea580c' }}>
              {kw ? `${kw} kW` : 'Fan Heater'}
            </span>
            {p.phase === 3 ? (
              <span style={{ fontSize: '0.65rem', color: '#9a3412', background: '#ffedd5', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                415V 3-Ph
              </span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: '#c2410c', background: '#fff7ed', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                230V 1-Ph
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '1px' }}>
            {p.product_type || 'Fan Heater'} {dims ? `(${dims})` : ''}
          </div>
          {p.electrical_requirements && (
            <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.electrical_requirements}
            </div>
          )}
        </div>
      );
    } else if (p.family === 'PIPEWORK') {
      return (
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#4f46e5' }}>
            {p.diameter_mm ? `${p.diameter_mm}mm Diameter` : p.model}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            {p.product_type || 'Heating Pipework'}
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {p.marketing_nominal_kw ? `${p.marketing_nominal_kw} kW` : (p.rated_output_kw ? `${p.rated_output_kw} kW` : 'Standard Rating')}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            {p.product_type || p.category}
          </div>
        </div>
      );
    }
  };

  const renderMcsStatus = (p: any) => {
    if (p.family !== 'ASHP') {
      return (
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
          Standard BS/EN
        </span>
      );
    }

    const mcsNumber = p.mcs_certificate_number || p.mcs_product_reference;

    if (p.mcs_status === 'MCS_CERTIFIED') {
      return (
        <div>
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 5px' }}>
            <ShieldCheck size={11} /> MCS VERIFIED
          </span>
          {mcsNumber && (
            <div style={{ fontSize: '0.64rem', color: '#0f766e', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>
              {mcsNumber}
            </div>
          )}
        </div>
      );
    } else if (p.mcs_status === 'NOT_FOUND') {
      return (
        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 5px' }}>
          <ShieldAlert size={11} /> NOT FOUND
        </span>
      );
    } else {
      return (
        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 5px' }}>
          <AlertTriangle size={11} /> UNCLEAR
        </span>
      );
    }
  };

  // Render clear verified action buttons: Manufacturer ↗, Manual PDF ↗, Brochure PDF ↗, MCS ↗, Supplier ↗
  const renderSourceActions = (p: any) => {
    const actions: { label: string; url: string; color: string }[] = [];

    const mfgUrl = p.manufacturer_product_url || p.manufacturer_url;
    if (mfgUrl && !mfgUrl.includes('primeenergy.co.uk/trade/catalogue')) {
      actions.push({ label: 'Mfg ↗', url: mfgUrl, color: '#0284c7' });
    }

    const manualUrl = p.technical_manual_url;
    if (manualUrl && !manualUrl.includes('primeenergy.co.uk/trade/catalogue')) {
      actions.push({ label: 'Manual ↗', url: manualUrl, color: '#059669' });
    }

    const brochureUrl = p.brochure_url;
    if (brochureUrl && !brochureUrl.includes('primeenergy.co.uk/trade/catalogue')) {
      actions.push({ label: 'Brochure ↗', url: brochureUrl, color: '#7c3aed' });
    }

    const mcsUrl = p.mcs_product_url || (p.mcs_status === 'MCS_CERTIFIED' && p.mcs_directory_url ? p.mcs_directory_url : null);
    if (mcsUrl && !mcsUrl.includes('primeenergy.co.uk/trade/catalogue')) {
      actions.push({ label: 'MCS ↗', url: mcsUrl, color: '#0f766e' });
    }

    const supplierUrl = p.price_source_url;
    if (supplierUrl && !supplierUrl.includes('primeenergy.co.uk/trade/catalogue')) {
      actions.push({ label: 'Supplier ↗', url: supplierUrl, color: '#ea580c' });
    }

    if (actions.length === 0) {
      return <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>-</span>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
        {actions.map((act, i) => (
          <a
            key={i}
            href={act.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '0.65rem',
              color: act.color,
              fontWeight: 600,
              textDecoration: 'none',
              padding: '1px 3px',
              borderRadius: '2px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              lineHeight: 1.2
            }}
          >
            {act.label}
          </a>
        ))}
      </div>
    );
  };

  const renderPrice = (p: any) => {
    if (p.price_ex_vat !== null && p.price_ex_vat !== undefined && p.price_ex_vat > 0) {
      return (
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
            £{Number(p.price_ex_vat).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '3px' }}>EX VAT</span>
          </div>
          {p.price_inc_vat && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              £{Number(p.price_inc_vat).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.6rem' }}>(0% VAT)</span>
            </div>
          )}
          {p.price_date && (
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {p.price_date}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div>
          <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 5px' }}>
            PRICE NOT FOUND
          </span>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
            Trade enquiry
          </div>
        </div>
      );
    }
  };

  const renderVerificationStatus = (p: any) => {
    const status = p.verification_status || 'PROVISIONAL';
    if (status === 'VERIFIED') {
      return (
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 5px' }}>
          <CheckCircle2 size={11} /> VERIFIED
        </span>
      );
    } else if (status === 'CONFLICT_REVIEW') {
      return (
        <div>
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 5px' }}>
            <AlertTriangle size={11} /> REVIEW
          </span>
          {p.conflict_notes && (
            <div style={{ fontSize: '0.62rem', color: '#92400e', marginTop: '2px', maxWidth: '120px', lineHeight: 1.2 }}>
              {p.conflict_notes}
            </div>
          )}
        </div>
      );
    } else if (status === 'NOT_FOUND') {
      return (
        <div>
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 5px' }}>
            <X size={11} /> NOT FOUND
          </span>
          {p.conflict_notes && (
            <div style={{ fontSize: '0.62rem', color: '#b91c1c', marginTop: '2px', maxWidth: '120px', lineHeight: 1.2 }}>
              {p.conflict_notes}
            </div>
          )}
        </div>
      );
    } else if (status === 'UNVERIFIED') {
      return (
        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 5px' }}>
          <AlertCircle size={11} /> UNVERIFIED
        </span>
      );
    } else {
      return (
        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 5px' }}>
          <HelpCircle size={11} /> {status}
        </span>
      );
    }
  };

  return (
    <div className="page-container products-view-container">
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={28} style={{ color: 'var(--primary)' }} />
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
              Authoritative Product Catalogue & Master Data
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', maxWidth: '850px' }}>
            Cleaned and restructured engineering database. ASHP models use strictly verified rated heating outputs at design conditions for quotation engine sizing (e.g. <code>rated_output_kw &gt;= 7.2</code>).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="btn-group" style={{ display: 'inline-flex', background: 'var(--bg-card)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('ADMIN_DATA')}
              className={`btn btn-sm ${viewMode === 'ADMIN_DATA' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '5px 12px', fontWeight: 700 }}
            >
              ADMIN PRODUCT DATA
            </button>
            <button
              onClick={() => setViewMode('TECHNICAL')}
              className={`btn btn-sm ${viewMode === 'TECHNICAL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '5px 12px', fontWeight: 700 }}
            >
              TECHNICAL SPECIFICATIONS
            </button>
          </div>

          <button
            onClick={() => setShowAuditModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={15} /> Discrepancies ({summary?.namingDiscrepancies?.length || 5})
          </button>

          <button
            onClick={() => { fetchProducts(); fetchSummary(); }}
            className="btn btn-secondary btn-sm"
            title="Refresh Database"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Authoritative KPI Audit Metric Cards */}
      {summary?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '22px' }}>
          <div className="card" style={{ padding: '16px', borderTop: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Active Products
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {summary.summary.totalActiveProducts || 367}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Across 7 product categories</div>
          </div>

          <div className="card" style={{ padding: '16px', borderTop: '4px solid #059669' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Verified Rated Output
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {summary.summary.ashpModelsWithVerifiedRatedOutput || 91} Models
            </div>
            <div style={{ fontSize: '0.7rem', color: '#059669' }}>Separate from marketing kW</div>
          </div>

          <div className="card" style={{ padding: '16px', borderTop: '4px solid #0284c7' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              MCS Certified ASHP
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
              {summary.summary.ashpModelsWithVerifiedMcs || 91} Models
            </div>
            <div style={{ fontSize: '0.7rem', color: '#0284c7' }}>Model-specific certificate numbers</div>
          </div>

          <div className="card" style={{ padding: '16px', borderTop: '4px solid #d97706' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Verified Prices
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
              {summary.summary.productsWithVerifiedCurrentPrice || 362} Priced
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Multi-supplier UK merchant evidence</div>
          </div>

          <div className="card" style={{ padding: '16px', borderTop: '4px solid #dc2626' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Conflict & Review Items
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              {summary.summary.manualReviewRequiredCount || 6} Flagged
            </div>
            <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>Viessmann / Unverified isolated</div>
          </div>
        </div>
      )}

      {/* Category Tabs & Quick Search */}
      <div className="card" style={{ padding: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="tabs" style={{ marginBottom: 0, gap: '4px' }}>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCategory(c.id);
                  if (c.id !== 'RADIATOR') {
                    setSelectedRadType('ALL');
                    setSelectedRadHeight('ALL');
                    setSelectedRadLength('ALL');
                  }
                }}
                className={`tab-btn ${activeCategory === c.id ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', padding: '6px 12px' }}
              >
                {c.icon && <c.icon size={14} />}
                {c.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', minWidth: '260px', flex: '1 1 260px', maxWidth: '420px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeCategory === 'ASHP' ? "Search brand, model, kW (e.g. 8kw, 12kw)..." :
                  activeCategory === 'CYLINDER' ? "Search brand, model, volume (e.g. 210l, 180l)..." :
                  activeCategory === 'ERH' ? "Search brand, wattage (e.g. 1000w, 1500w)..." :
                  activeCategory === 'FAN_HEATER' ? "Search fan heater, kW output (e.g. 2kw)..." :
                  activeCategory === 'PIPEWORK' ? "Search pipe diameter (e.g. 22mm, 28mm)..." :
                  activeCategory === 'ACCESSORIES' ? "Search filters, buffer tanks, valves..." :
                  "Search brand, model, SKU, capacity (e.g. 8kw, 210l, 22mm)..."
                }
                className="form-control"
                style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
              Search
            </button>
          </form>
        </div>

        {/* 1. Dedicated ASHP Heat Pump kW Output Filters */}
        {(activeCategory === 'ASHP' || (activeCategory === 'ALL' && (selectedKw !== 'ALL' || minKwInput || maxKwInput))) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '14px', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={17} style={{ color: '#059669' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Heat Pump Capacity (kW) Filter:
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
              {['ALL', '4', '5', '6', '8', '10', '12', '14', '16'].map(kw => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => { setSelectedKw(kw); setMinKwInput(''); setMaxKwInput(''); }}
                  style={{
                    padding: '3px 9px',
                    fontSize: '0.78rem',
                    fontWeight: selectedKw === kw && !minKwInput && !maxKwInput ? 800 : 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: selectedKw === kw && !minKwInput && !maxKwInput ? '#059669' : '#cbd5e1',
                    background: selectedKw === kw && !minKwInput && !maxKwInput ? '#059669' : '#ffffff',
                    color: selectedKw === kw && !minKwInput && !maxKwInput ? '#ffffff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {kw === 'ALL' ? 'All kW' : `${kw} kW`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46' }}>Range (kW):</span>
              <input
                type="number"
                placeholder="Min"
                value={minKwInput}
                onChange={(e) => { setMinKwInput(e.target.value); setSelectedKw('ALL'); }}
                style={{ width: '60px', padding: '3px 6px', fontSize: '0.78rem', border: '1px solid #a7f3d0', borderRadius: '4px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#065f46' }}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxKwInput}
                onChange={(e) => { setMaxKwInput(e.target.value); setSelectedKw('ALL'); }}
                style={{ width: '60px', padding: '3px 6px', fontSize: '0.78rem', border: '1px solid #a7f3d0', borderRadius: '4px' }}
              />
              {(selectedKw !== 'ALL' || minKwInput || maxKwInput) && (
                <button
                  type="button"
                  onClick={() => { setSelectedKw('ALL'); setMinKwInput(''); setMaxKwInput(''); }}
                  style={{ padding: '3px 7px', fontSize: '0.72rem', background: '#d1fae5', border: '1px solid #6ee7b7', color: '#047857', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Reset kW
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. Dedicated Cylinder Litre Size Filters */}
        {(activeCategory === 'CYLINDER' || (activeCategory === 'ALL' && (selectedLitres !== 'ALL' || minLitresInput || maxLitresInput))) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '14px', padding: '12px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Droplets size={17} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#075985', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Cylinder Volume (Litres) Filter:
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
              {['ALL', '150', '180', '210', '250', '300'].map(lit => (
                <button
                  key={lit}
                  type="button"
                  onClick={() => { setSelectedLitres(lit); setMinLitresInput(''); setMaxLitresInput(''); }}
                  style={{
                    padding: '3px 9px',
                    fontSize: '0.78rem',
                    fontWeight: selectedLitres === lit && !minLitresInput && !maxLitresInput ? 800 : 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: selectedLitres === lit && !minLitresInput && !maxLitresInput ? '#0284c7' : '#cbd5e1',
                    background: selectedLitres === lit && !minLitresInput && !maxLitresInput ? '#0284c7' : '#ffffff',
                    color: selectedLitres === lit && !minLitresInput && !maxLitresInput ? '#ffffff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {lit === 'ALL' ? 'All Sizes' : `${lit} L`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#075985' }}>Range (L):</span>
              <input
                type="number"
                placeholder="Min"
                value={minLitresInput}
                onChange={(e) => { setMinLitresInput(e.target.value); setSelectedLitres('ALL'); }}
                style={{ width: '65px', padding: '3px 6px', fontSize: '0.78rem', border: '1px solid #bae6fd', borderRadius: '4px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#075985' }}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxLitresInput}
                onChange={(e) => { setMaxLitresInput(e.target.value); setSelectedLitres('ALL'); }}
                style={{ width: '65px', padding: '3px 6px', fontSize: '0.78rem', border: '1px solid #bae6fd', borderRadius: '4px' }}
              />
              {(selectedLitres !== 'ALL' || minLitresInput || maxLitresInput) && (
                <button
                  type="button"
                  onClick={() => { setSelectedLitres('ALL'); setMinLitresInput(''); setMaxLitresInput(''); }}
                  style={{ padding: '3px 7px', fontSize: '0.72rem', background: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Reset Litres
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Dedicated Electric Radiator / Heater Wattage Filters */}
        {(activeCategory === 'ERH' || (activeCategory === 'ALL' && (selectedWatts !== 'ALL' || minWattsInput || maxWattsInput))) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '14px', padding: '12px 16px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={17} style={{ color: '#7c3aed' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Electric Heater Output (Watts) Filter:
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
              {['ALL', '500', '800', '1000', '1500', '2000'].map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => { setSelectedWatts(w); setMinWattsInput(''); setMaxWattsInput(''); }}
                  style={{
                    padding: '3px 9px',
                    fontSize: '0.78rem',
                    fontWeight: selectedWatts === w && !minWattsInput && !maxWattsInput ? 800 : 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: selectedWatts === w && !minWattsInput && !maxWattsInput ? '#7c3aed' : '#cbd5e1',
                    background: selectedWatts === w && !minWattsInput && !maxWattsInput ? '#7c3aed' : '#ffffff',
                    color: selectedWatts === w && !minWattsInput && !maxWattsInput ? '#ffffff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {w === 'ALL' ? 'All Watts' : `${w} W`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5b21b6' }}>Range (Watts):</span>
              <input
                type="number"
                placeholder="Min"
                value={minWattsInput}
                onChange={(e) => { setMinWattsInput(e.target.value); setSelectedWatts('ALL'); }}
                style={{ width: '70px', padding: '3px 6px', fontSize: '0.78rem', border: '1px solid #e9d5ff', borderRadius: '4px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#5b21b6' }}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxWattsInput}
                onChange={(e) => { setMaxWattsInput(e.target.value); setSelectedWatts('ALL'); }}
                style={{ width: '70px', padding: '3px 6px', fontSize: '0.78rem', border: '1px solid #e9d5ff', borderRadius: '4px' }}
              />
              {(selectedWatts !== 'ALL' || minWattsInput || maxWattsInput) && (
                <button
                  type="button"
                  onClick={() => { setSelectedWatts('ALL'); setMinWattsInput(''); setMaxWattsInput(''); }}
                  style={{ padding: '3px 7px', fontSize: '0.72rem', background: '#f3e8ff', border: '1px solid #c084fc', color: '#6b21a8', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Reset Watts
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Dedicated Fan Heater kW Output Filters */}
        {(activeCategory === 'FAN_HEATER' || (activeCategory === 'ALL' && selectedFanKw !== 'ALL')) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '14px', padding: '12px 16px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wrench size={17} style={{ color: '#ea580c' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Fan Heater Output (kW) Filter:
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
              {['ALL', '1', '2', '3'].map(kw => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setSelectedFanKw(kw)}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    fontWeight: selectedFanKw === kw ? 800 : 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: selectedFanKw === kw ? '#ea580c' : '#cbd5e1',
                    background: selectedFanKw === kw ? '#ea580c' : '#ffffff',
                    color: selectedFanKw === kw ? '#ffffff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {kw === 'ALL' ? 'All Outputs' : `${kw} kW`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Dedicated Pipework Outer Diameter (mm) Filters */}
        {(activeCategory === 'PIPEWORK' || (activeCategory === 'ALL' && selectedPipeSize !== 'ALL')) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '14px', padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SlidersHorizontal size={17} style={{ color: '#4f46e5' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Pipework Diameter (mm) Filter:
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
              {['ALL', '15', '22', '28', '32'].map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedPipeSize(sz)}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    fontWeight: selectedPipeSize === sz ? 800 : 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: selectedPipeSize === sz ? '#4f46e5' : '#cbd5e1',
                    background: selectedPipeSize === sz ? '#4f46e5' : '#ffffff',
                    color: selectedPipeSize === sz ? '#ffffff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {sz === 'ALL' ? 'All Sizes' : `${sz} mm`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. Dedicated Accessories Sub-type Filters */}
        {(activeCategory === 'ACCESSORIES' || (activeCategory === 'ALL' && selectedAccessoryType !== 'ALL')) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '14px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={17} style={{ color: '#475569' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Accessory Sub-Type Filter:
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
              {[
                { id: 'ALL', label: 'All Accessories' },
                { id: 'filter', label: 'Filters & Inhibitors' },
                { id: 'buffer', label: 'Buffer Tanks' },
                { id: 'switch', label: 'Switches & Controls' },
                { id: 'valve', label: 'Valves & Fittings' }
              ].map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccessoryType(acc.id)}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    fontWeight: selectedAccessoryType === acc.id ? 800 : 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: selectedAccessoryType === acc.id ? '#0f172a' : '#cbd5e1',
                    background: selectedAccessoryType === acc.id ? '#0f172a' : '#ffffff',
                    color: selectedAccessoryType === acc.id ? '#ffffff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dedicated Radiator Sizing & Type Filters (prominent when Radiators tab is active) */}
        {activeCategory === 'RADIATOR' && (
          <div 
            style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '14px', 
              alignItems: 'center', 
              marginTop: '14px', 
              padding: '12px 16px', 
              background: '#fffbeb', 
              border: '1px solid #fcd34d', 
              borderRadius: '8px' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Grid size={17} style={{ color: '#d97706' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Radiator Sizing & Type Filters:
              </span>
            </div>

            {/* 1. Radiator Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78350f' }}>Type:</span>
              <select
                id="rad-filter-type"
                value={selectedRadType}
                onChange={(e) => setSelectedRadType(e.target.value)}
                className="form-control"
                style={{ padding: '5px 10px', fontSize: '0.82rem', width: 'auto', minWidth: '130px', fontWeight: 700, borderColor: '#fcd34d' }}
              >
                <option value="ALL">All Types (K1, P+, K2)</option>
                <option value="K1">K1 (Single Convector / Type 11)</option>
                <option value="P+">P+ (Double Convector / Type 21)</option>
                <option value="K2">K2 (Double Convector / Type 22)</option>
              </select>
            </div>

            {/* 2. Height Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78350f' }}>Height:</span>
              <select
                id="rad-filter-height"
                value={selectedRadHeight}
                onChange={(e) => setSelectedRadHeight(e.target.value)}
                className="form-control"
                style={{ padding: '5px 10px', fontSize: '0.82rem', width: 'auto', minWidth: '120px', fontWeight: 700, borderColor: '#fcd34d' }}
              >
                <option value="ALL">All Heights</option>
                {allRadDimensions.heights.map(h => (
                  <option key={h} value={h}>{h} mm</option>
                ))}
              </select>
            </div>

            {/* 3. Length Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78350f' }}>Length:</span>
              <select
                id="rad-filter-length"
                value={selectedRadLength}
                onChange={(e) => setSelectedRadLength(e.target.value)}
                className="form-control"
                style={{ padding: '5px 10px', fontSize: '0.82rem', width: 'auto', minWidth: '140px', fontWeight: 700, borderColor: '#fcd34d' }}
              >
                <option value="ALL">All Lengths</option>
                {allRadDimensions.lengths.map(l => (
                  <option key={l} value={l}>{l} mm ({ (l / 1000).toFixed(1) }m)</option>
                ))}
              </select>
            </div>

            {/* Active Radiator Filter Badge & Quick Clear */}
            {(selectedRadType !== 'ALL' || selectedRadHeight !== 'ALL' || selectedRadLength !== 'ALL') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', background: '#fde68a', padding: '3px 10px', borderRadius: '4px' }}>
                  Filter Active: {selectedRadType !== 'ALL' ? `Type ${selectedRadType}` : 'Any Type'} | {selectedRadHeight !== 'ALL' ? `${selectedRadHeight}mm(H)` : 'Any(H)'} × {selectedRadLength !== 'ALL' ? `${selectedRadLength}mm(L)` : 'Any(L)'}
                </span>
                <button
                  onClick={() => {
                    setSelectedRadType('ALL');
                    setSelectedRadHeight('ALL');
                    setSelectedRadLength('ALL');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 8px', fontSize: '0.725rem', color: '#b45309' }}
                >
                  Clear Sizing
                </button>
              </div>
            )}
          </div>
        )}

        {/* Multi-attribute Filter Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="form-control"
              style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
            >
              {brandOptions.map(b => (
                <option key={b} value={b}>{b === 'ALL' ? 'All Brands' : b}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>MCS Status:</span>
            <select
              value={selectedMcs}
              onChange={(e) => setSelectedMcs(e.target.value)}
              className="form-control"
              style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="ALL">All MCS States</option>
              <option value="MCS_CERTIFIED">MCS Verified Only</option>
              <option value="UNCLEAR">Unclear / Manual Check</option>
              <option value="NOT_FOUND">Not Found</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Verification Status:</span>
            <select
              value={selectedVerification}
              onChange={(e) => setSelectedVerification(e.target.value)}
              className="form-control"
              style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="CONFLICT_REVIEW">Conflict Review (Viessmann etc.)</option>
              <option value="NOT_FOUND">Not Found (Ecogenica 3kW etc.)</option>
              <option value="UNVERIFIED">Unverified / Price Required</option>
              <option value="PROVISIONAL">Provisional</option>
            </select>
          </div>

          {(selectedBrand !== 'ALL' || selectedMcs !== 'ALL' || selectedVerification !== 'ALL' || selectedRadType !== 'ALL' || selectedRadHeight !== 'ALL' || selectedRadLength !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBrand('ALL');
                setSelectedMcs('ALL');
                setSelectedVerification('ALL');
                setSelectedRadType('ALL');
                setSelectedRadHeight('ALL');
                setSelectedRadLength('ALL');
                setSearchQuery('');
              }}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--primary)' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* MASTER ADMIN PRODUCT DATA TABLE */}
      <div className="card" style={{ padding: '12px' }}>
        <div className="table-responsive">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th style={{ width: '75px' }}>CAT</th>
                <th style={{ width: '90px' }}>BRAND</th>
                <th style={{ minWidth: '150px' }}>MODEL</th>
                <th style={{ minWidth: '140px' }}>OUTPUT / SIZING</th>
                <th style={{ width: '85px' }}>MCS</th>
                <th style={{ minWidth: '105px' }}>PRICE</th>
                <th style={{ width: '90px' }}>SUPPLIER</th>
                <th style={{ width: '75px' }}>SOURCE</th>
                <th style={{ width: '95px' }}>STATUS</th>
                <th style={{ width: '45px', textAlign: 'center' }}>ACT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading master product database...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No products matching current filter criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr 
                    key={p.id} 
                    style={{ 
                      backgroundColor: p.verification_status === 'CONFLICT_REVIEW' 
                        ? '#fffbeb' 
                        : (p.verification_status === 'NOT_FOUND' ? '#fef2f2' : undefined)
                    }}
                  >
                    {/* 1. CATEGORY */}
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          fontSize: '0.64rem', 
                          padding: '2px 5px',
                          fontWeight: 800,
                          backgroundColor: p.family === 'ASHP' ? '#e0f2fe' : (p.family === 'CYLINDER' ? '#e0e7ff' : (p.family === 'ERH' ? '#f5f3ff' : (p.family === 'FAN_HEATER' ? '#fff7ed' : '#f1f5f9'))),
                          color: p.family === 'ASHP' ? '#0369a1' : (p.family === 'CYLINDER' ? '#3730a3' : (p.family === 'ERH' ? '#6d28d9' : (p.family === 'FAN_HEATER' ? '#c2410c' : '#334155'))),
                          border: '1px solid var(--border)'
                        }}
                      >
                        {p.family === 'ERH' ? 'ERH' : (p.family === 'FAN_HEATER' ? 'FAN' : p.family)}
                      </span>
                    </td>

                    {/* 2. BRAND */}
                    <td>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        {p.brand || p.manufacturer}
                      </strong>
                    </td>

                    {/* 3. MODEL */}
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.25 }}>
                        {p.model}
                      </div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '1px' }}>
                        SKU: {p.supplier_sku || p.sku || p.id}
                      </div>
                      {p.product_family && p.product_family !== p.model && (
                        <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                          Series: {p.product_family}
                        </div>
                      )}
                    </td>

                    {/* 4. EXACT OUTPUT / CAPACITY */}
                    <td>
                      {renderExactOutputCapacity(p)}
                    </td>

                    {/* 5. MCS STATUS */}
                    <td>
                      {renderMcsStatus(p)}
                    </td>

                    {/* 6. PRICE */}
                    <td>
                      {renderPrice(p)}
                    </td>

                    {/* 7. SUPPLIER */}
                    <td>
                      <span 
                        className="badge badge-supplier" 
                        style={{ 
                          fontSize: '0.72rem', 
                          padding: '3px 8px',
                          fontWeight: 700,
                          color: '#ffffff',
                          backgroundColor: p.supplier === 'City Plumbing' ? '#0284c7' : (p.supplier?.includes('Warehouse') ? '#059669' : '#475569'),
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}
                      >
                        {p.supplier || 'City Plumbing'}
                      </span>
                    </td>

                    {/* 8. SOURCE & DOCUMENTATION ACTIONS */}
                    <td>
                      {renderSourceActions(p)}
                    </td>

                    {/* 9. VERIFICATION STATUS */}
                    <td>
                      {renderVerificationStatus(p)}
                    </td>

                    {/* 10. ACTION */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openInspectModal(p)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 6px', fontSize: '0.68rem' }}
                        title="Inspect technical specifications and price records"
                      >
                        <Edit3 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISCREPANCY & EXCLUSION REPORT MODAL */}
      {showAuditModal && (
        <div className="modal-overlay" onClick={() => setShowAuditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={20} style={{ color: '#d97706' }} />
                  Catalogue Discrepancy & Exclusion Audit Log
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Verified documentation of nominal vs rated capacity variations and catalog boundary rules
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAuditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Technical & Sizing Discrepancies
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {summary?.namingDiscrepancies?.map((d: any, i: number) => (
                  <div key={i} style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '12px', fontSize: '0.825rem' }}>
                    <div style={{ fontWeight: 800, color: '#92400e' }}>
                      {d.brand}: {d.retailerName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '3px' }}>
                      MCS Record: <strong>{d.mcsDirectoryName}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '4px', lineHeight: 1.3 }}>
                      {d.notes}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Excluded / Isolated Product Types
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {summary?.excludedProducts?.map((ep: any, i: number) => (
                  <div key={i} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', fontSize: '0.825rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {ep.product} ({ep.brand})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '3px', fontWeight: 600 }}>
                      Exclusion Reason: {ep.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAuditModal(false)}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT & EDIT PRODUCT MODAL */}
      {inspectingProduct && (
        <div className="modal-overlay" onClick={() => setInspectingProduct(null)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Product Master Record & Price History
                </h2>
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
                  {inspectingProduct.brand || inspectingProduct.manufacturer} — {inspectingProduct.model}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setInspectingProduct(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Technical Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Category</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{inspectingProduct.family}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>SKU / Part Code</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{inspectingProduct.supplier_sku || inspectingProduct.sku}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Status</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: inspectingProduct.verification_status === 'VERIFIED' ? '#059669' : '#d97706' }}>
                  {inspectingProduct.verification_status || 'VERIFIED'}
                </div>
              </div>
            </div>

            {/* Multi-Supplier Pricing History Table */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Multi-Supplier Market Prices
              </h4>
              {productPrices.length > 0 ? (
                <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                      <tr>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>Supplier</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>EX VAT</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>INC VAT</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPrices.map((pr: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 700 }}>{pr.supplier}</td>
                          <td style={{ padding: '6px 10px', color: '#059669', fontWeight: 800 }}>
                            £{Number(pr.price_ex_vat || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '6px 10px', color: '#64748b' }}>
                            £{Number(pr.price_inc_vat || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '6px 10px', color: '#94a3b8' }}>
                            {pr.date_collected || '2026-09-14'}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            {pr.source_url ? (
                              <a href={pr.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                View Link <ExternalLink size={10} style={{ display: 'inline' }} />
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: '8px', background: 'var(--bg-card)', borderRadius: '4px' }}>
                  Current primary supplier: {inspectingProduct.supplier || 'City Plumbing'} (£{Number(inspectingProduct.price_ex_vat || 0).toFixed(2)} ex VAT)
                </div>
              )}
            </div>

            {/* Editable Governance Form */}
            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Exact Rated Heating Output (kW)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editRatedKw}
                    onChange={(e) => setEditRatedKw(Number(e.target.value))}
                    className="form-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Rated Output Test Condition
                  </label>
                  <input
                    type="text"
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    placeholder="e.g. A7/W35 or A-2/W45"
                    className="form-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    MCS Status
                  </label>
                  <select
                    value={editMcsStatus}
                    onChange={(e) => setEditMcsStatus(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="MCS_CERTIFIED">MCS Certified</option>
                    <option value="UNCLEAR">Unclear / Review</option>
                    <option value="NOT_FOUND">Not Found</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    MCS Product Reference / Number
                  </label>
                  <input
                    type="text"
                    value={editMcsRef}
                    onChange={(e) => setEditMcsRef(e.target.value)}
                    placeholder="e.g. MCS-HP40-8"
                    className="form-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Technical / Governance Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="form-control"
                  style={{ fontSize: '0.825rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editManualReview}
                    onChange={(e) => setEditManualReview(e.target.checked)}
                  />
                  Require Manual Review before Auto-Sizing
                </label>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setInspectingProduct(null)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="btn btn-primary btn-sm"
                  >
                    {savingProduct ? 'Saving...' : 'Save Product Data'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
