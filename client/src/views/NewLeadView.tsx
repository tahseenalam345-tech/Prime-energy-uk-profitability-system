import React, { useState, useEffect } from 'react';
import {
  Calculator, AlertTriangle, ShieldCheck, CheckCircle2,
  Info, Save, ArrowRight, HelpCircle, FileCheck, Search,
  ExternalLink, RotateCcw, Plus, Trash2, Edit3, X, SlidersHorizontal, Lock
} from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.js';
import { CalculationResult, RuleEvidence, User } from '../types.js';
import { RuleEvidenceModal } from '../components/RuleEvidenceModal.js';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect.js';
import { CostCompositionTable, CustomLineItemInput } from '../components/CostCompositionTable.js';

const countryOptions: SelectOption[] = [
  { value: 'England', label: 'England', sublabel: 'BUS Scope (£7,500 / £9,000)', badge: 'BUS Scope' },
  { value: 'Wales', label: 'Wales', sublabel: 'BUS Scope (£7,500 / £9,000)', badge: 'BUS Scope' },
  { value: 'Scotland', label: 'Scotland', sublabel: 'Out of BUS Scope' },
  { value: 'Northern Ireland', label: 'Northern Ireland', sublabel: 'Out of BUS Scope' },
];

const propertyTypeOptions: SelectOption[] = [
  { value: 'Detached', label: 'Detached', sublabel: '1.15x multiplier' },
  { value: 'Semi detached', label: 'Semi detached', sublabel: '1.00x multiplier' },
  { value: 'End terrace', label: 'End terrace', sublabel: '1.05x multiplier' },
  { value: 'Mid terrace', label: 'Mid terrace', sublabel: '0.90x multiplier' },
  { value: 'Bungalow', label: 'Bungalow', sublabel: '1.10x multiplier' },
  { value: 'Flat', label: 'Flat', sublabel: '0.75x — Manual Review Flag' },
];

const propertyStatusOptions: SelectOption[] = [
  { value: 'Existing property', label: 'Existing property', sublabel: 'BUS Eligible', badge: 'Eligible' },
  { value: 'Developer new-build', label: 'Developer new-build', sublabel: 'BUS Ineligible', badge: 'Ineligible' },
  { value: 'Self-build', label: 'Self-build', sublabel: 'BUS Eligible with evidence', badge: 'Evidence Req.' },
];

const epcRatingOptions: SelectOption[] = [
  { value: 'A', label: 'Band A', sublabel: '30 W/m² - Heuristic', badge: '30 W/m²' },
  { value: 'B', label: 'Band B', sublabel: '30 W/m² - Heuristic', badge: '30 W/m²' },
  { value: 'C', label: 'Band C', sublabel: '40 W/m² - Heuristic', badge: '40 W/m²' },
  { value: 'D', label: 'Band D', sublabel: '55 W/m² - Heuristic', badge: '55 W/m²' },
  { value: 'E', label: 'Band E', sublabel: '70 W/m² - Heuristic', badge: '70 W/m²' },
  { value: 'F', label: 'Band F', sublabel: '90 W/m² - Heuristic', badge: '90 W/m²' },
  { value: 'G', label: 'Band G', sublabel: '90 W/m² - Heuristic', badge: '90 W/m²' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Insulation Fallback' },
];

const bedroomOptions: SelectOption[] = [
  { value: 1, label: '1 Bedroom' },
  { value: 2, label: '2 Bedrooms' },
  { value: 3, label: '3 Bedrooms' },
  { value: 4, label: '4 Bedrooms' },
  { value: 5, label: '5+ Bedrooms' },
];

const bathroomOptions: SelectOption[] = [
  { value: 1, label: '1 Bathroom' },
  { value: 2, label: '2 Bathrooms' },
  { value: 3, label: '3+ Bathrooms' },
];

const wallInsulationOptions: SelectOption[] = [
  { value: 'Insulated', label: 'Insulated', sublabel: 'Cavity / External / Internal' },
  { value: 'Uninsulated', label: 'Uninsulated', sublabel: 'Solid wall / uninsulated cavity' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Heuristic conservative assumption' },
];

const roofInsulationOptions: SelectOption[] = [
  { value: 'Insulated', label: 'Insulated', sublabel: '≥200mm loft insulation' },
  { value: 'Uninsulated', label: 'Uninsulated', sublabel: '<100mm or no loft insulation' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Heuristic conservative assumption' },
];

const onOffGasGridOptions: SelectOption[] = [
  { value: 'On gas grid', label: 'On gas grid', sublabel: 'Standard £7,500 BUS Grant', badge: '£7,500' },
  { value: 'Off gas grid', label: 'Off gas grid', sublabel: 'Eligible for £9,000 Uplift (oil/LPG)', badge: '£9,000 Uplift' },
];

const existingFuelTypeOptions: SelectOption[] = [
  { value: 'Mains Gas', label: 'Mains Gas', sublabel: 'Standard £7,500 BUS' },
  { value: 'Heating Oil', label: 'Heating Oil', sublabel: 'Eligible for £9,000 off-gas uplift', badge: '£9k eligible' },
  { value: 'Bulk LPG', label: 'Bulk LPG', sublabel: 'Eligible for £9,000 off-gas uplift', badge: '£9k eligible' },
  { value: 'Electricity', label: 'Electricity', sublabel: 'Standard £7,500 BUS' },
  { value: 'Solid Fuel', label: 'Solid Fuel', sublabel: 'Standard £7,500 BUS' },
];

const existingHeatingSystemOptions: SelectOption[] = [
  { value: 'Gas Central Heating', label: 'Gas Central Heating' },
  { value: 'Oil Boiler', label: 'Oil Boiler', sublabel: 'Qualifies for £9,000 off-gas uplift', badge: '£9k eligible' },
  { value: 'LPG Boiler', label: 'LPG Boiler', sublabel: 'Qualifies for £9,000 off-gas uplift', badge: '£9k eligible' },
  { value: 'Electric Storage Heaters', label: 'Electric Storage Heaters' },
  { value: 'Direct Electric', label: 'Direct Electric' },
];

const boilerTypeOptions: SelectOption[] = [
  { value: 'Combi', label: 'Combi', sublabel: 'Requires Cylinder & Conversion', badge: 'Conversion Req.' },
  { value: 'System', label: 'System', sublabel: 'Existing cylinder present' },
  { value: 'Regular', label: 'Regular / Conventional', sublabel: 'Cold water tank + cylinder' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Manual survey check' },
];

const cylinderSpaceOptions: SelectOption[] = [
  { value: 'Yes', label: 'Yes', sublabel: 'Airing cupboard / dedicated space available', badge: 'Confirmed' },
  { value: 'No', label: 'No', sublabel: 'POTENTIALLY NON-VIABLE', badge: 'Blocker Risk' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Manual Review Required' },
];

const existingPipeworkOptions: SelectOption[] = [
  { value: 'Standard 15mm+', label: 'Standard 15mm+', sublabel: 'Suitable for heat pump flows' },
  { value: 'Microbore 10mm or less', label: 'Microbore 10mm or less', sublabel: 'Triggers Full Re-pipe (£1,200+)', badge: 'Re-pipe Req.' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Commercial Risk Warning' },
];

const previousGovernmentGrantOptions: SelectOption[] = [
  { value: 'None', label: 'None', sublabel: 'Fully BUS eligible', badge: 'BUS Eligible' },
  { value: 'BUS', label: 'Previous BUS Claimed', sublabel: 'Disqualifies from BUS grant', badge: 'Disqualified' },
  { value: 'RHI', label: 'Previous Domestic RHI Claimed', sublabel: 'Disqualifies from BUS grant', badge: 'Disqualified' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Uncertainty Flag' },
];

interface NewLeadViewProps {
  onQuoteSaved?: (quoteId: string) => void;
  currentUserId: string;
  currentUser?: User | null;
}

export const NewLeadView: React.FC<NewLeadViewProps> = ({ onQuoteSaved, currentUserId, currentUser }) => {
  // 1. Form state - Customer & Property (Empty by default)
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadSource, setLeadSource] = useState('');

  const [addressLine1, setAddressLine1] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyStatus, setPropertyStatus] = useState('');
  const [epcRating, setEpcRating] = useState('');
  const [epcFloorArea, setEpcFloorArea] = useState<number | ''>('');
  const [storeys, setStoreys] = useState<number | ''>('');
  const [annualHeatingKwh, setAnnualHeatingKwh] = useState<number | ''>('');
  const [annualHotWaterKwh, setAnnualHotWaterKwh] = useState<number | ''>('');
  const [epcCertificateNumber, setEpcCertificateNumber] = useState('');

  const [bedrooms, setBedrooms] = useState<number | ''>('');
  const [bathrooms, setBathrooms] = useState<number | ''>('');
  const [wallInsulation, setWallInsulation] = useState('');
  const [roofInsulation, setRoofInsulation] = useState('');
  const [existingHeatingSystem, setExistingHeatingSystem] = useState('');
  const [existingFuelType, setExistingFuelType] = useState('');
  const [boilerType, setBoilerType] = useState('');
  const [onOffGasGrid, setOnOffGasGrid] = useState('');
  const [cylinderSpace, setCylinderSpace] = useState('');
  const [existingRadiatorCount, setExistingRadiatorCount] = useState<number | ''>('');
  const [existingPipework, setExistingPipework] = useState('');
  const [previousGovernmentGrant, setPreviousGovernmentGrant] = useState('');
  const [fuseBoardCondition, setFuseBoardCondition] = useState('');
  const [conservationArea, setConservationArea] = useState('');
  const [boundaryPlanningRisk, setBoundaryPlanningRisk] = useState('');
  const [listedBuilding, setListedBuilding] = useState('');
  const [salesNotes, setSalesNotes] = useState('');

  // 2. Equipment manual override states
  const [overrideAshpId, setOverrideAshpId] = useState<string | null>(null);
  const [overrideCylinderId, setOverrideCylinderId] = useState<string | null>(null);
  const [showAshpModal, setShowAshpModal] = useState(false);
  const [showCylinderModal, setShowCylinderModal] = useState(false);

  // 3. Commercial cost overrides, deleted lines, description overrides, and custom line items
  const [costOverrides, setCostOverrides] = useState<Record<string, number>>({});
  const [deletedLineIds, setDeletedLineIds] = useState<string[]>([]);
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({});
  const [customLineItems, setCustomLineItems] = useState<CustomLineItemInput[]>([]);

  // 4. Equipment catalogs for modals
  const [ashpCatalog, setAshpCatalog] = useState<any[]>([]);
  const [cylinderCatalog, setCylinderCatalog] = useState<any[]>([]);
  const [ashpSearchQuery, setAshpSearchQuery] = useState('');
  const [ashpBrandFilter, setAshpBrandFilter] = useState('ALL');
  const [cylinderSearchQuery, setCylinderSearchQuery] = useState('');

  // 5. Rule Evidence popover state
  const [activeRuleEvidence, setActiveRuleEvidence] = useState<RuleEvidence | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // 6. Calculation output state
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [calcError, setCalcError] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);
  const [savedQuoteRef, setSavedQuoteRef] = useState('');

  // Load catalogs on mount
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [ashpRes, cylRes] = await Promise.all([
          api.getProductsDetailed({ family: 'ASHP' }),
          api.getCylinders()
        ]);
        setAshpCatalog(ashpRes.products || []);
        setCylinderCatalog(cylRes.cylinders || []);
      } catch (err) {
        console.error('Failed to load equipment catalogs', err);
      }
    }
    loadCatalogs();
  }, []);

  // Auto-run calculation when primary inputs change
  const runCalculation = async () => {
    setCalculating(true);
    setCalcError('');
    try {
      const payload: any = {
        customerName: customerName || undefined,
        addressLine1: addressLine1 || undefined,
        postcode: postcode || undefined,
        country: country || 'England',
        epcRating: epcRating || undefined,
        epcFloorArea: (epcFloorArea !== '' && Number(epcFloorArea) > 0) ? Number(epcFloorArea) : 100,
        storeys: (storeys !== '' && Number(storeys) > 0) ? Number(storeys) : undefined,
        annualHeatingKwh: annualHeatingKwh !== '' ? Number(annualHeatingKwh) : undefined,
        annualHotWaterKwh: annualHotWaterKwh !== '' ? Number(annualHotWaterKwh) : undefined,
        epcCertificateNumber: epcCertificateNumber || undefined,
        propertyType: propertyType || 'Semi detached',
        propertyStatus: propertyStatus || 'Existing Home',
        bedrooms: (bedrooms !== '' && Number(bedrooms) > 0) ? Number(bedrooms) : undefined,
        bathrooms: (bathrooms !== '' && Number(bathrooms) > 0) ? Number(bathrooms) : undefined,
        wallInsulation: wallInsulation || undefined,
        roofInsulation: roofInsulation || undefined,
        existingHeatingSystem: existingHeatingSystem || undefined,
        existingFuelType: existingFuelType || undefined,
        boilerType: boilerType || undefined,
        onOffGasGrid: onOffGasGrid || undefined,
        cylinderSpace: cylinderSpace || undefined,
        existingRadiatorCount: (existingRadiatorCount !== '' && Number(existingRadiatorCount) > 0) ? Number(existingRadiatorCount) : undefined,
        existingPipework: existingPipework || undefined,
        previousGovernmentGrant: previousGovernmentGrant || undefined,
        fuseBoardCondition: fuseBoardCondition || undefined,
        conservationArea: conservationArea || undefined,
        boundaryPlanningRisk: boundaryPlanningRisk || undefined,
        listedBuilding: listedBuilding || undefined,
        salesNotes: salesNotes || undefined,
        overrideAshpId: overrideAshpId || undefined,
        overrideCylinderId: overrideCylinderId || undefined,
        costOverrides: Object.keys(costOverrides).length > 0 ? costOverrides : undefined,
        deletedLineIds: deletedLineIds.length > 0 ? deletedLineIds : undefined,
        descriptionOverrides: Object.keys(descriptionOverrides).length > 0 ? descriptionOverrides : undefined,
        customLineItems: customLineItems.length > 0 ? customLineItems : undefined
      };

      const res = await api.calculateNewLead(payload);
      setResult(res);
    } catch (err: any) {
      setCalcError(err.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [
    epcFloorArea, epcRating, propertyType, propertyStatus, country,
    bedrooms, bathrooms, wallInsulation, roofInsulation, boilerType,
    cylinderSpace, existingPipework, onOffGasGrid, existingHeatingSystem, existingFuelType,
    previousGovernmentGrant, existingRadiatorCount, annualHeatingKwh, annualHotWaterKwh,
    overrideAshpId, overrideCylinderId, costOverrides, deletedLineIds, descriptionOverrides, customLineItems
  ]);

  const handleOpenRuleEvidence = async (ruleId: string) => {
    try {
      const res = await api.getRuleEvidence({ search: ruleId });
      if (res.rules && res.rules.length > 0) {
        setActiveRuleEvidence(res.rules[0]);
        setShowEvidenceModal(true);
      }
    } catch (err) {
      console.error('Failed to load rule evidence', err);
    }
  };

  const handleUpdateCostValue = (idOrCategory: string, value: number) => {
    setCostOverrides(prev => ({
      ...prev,
      [idOrCategory]: value
    }));
    setDeletedLineIds(prev => prev.filter(id => id !== idOrCategory));
  };

  const handleResetCost = (idOrCategory: string) => {
    setCostOverrides(prev => {
      const next = { ...prev };
      delete next[idOrCategory];
      return next;
    });
    setDeletedLineIds(prev => prev.filter(id => id !== idOrCategory));
  };

  const handleDeleteLine = (item: any) => {
    const key = item.id || item.category;
    setDeletedLineIds(prev => Array.from(new Set([...prev, key, item.category])));
    setCostOverrides(prev => ({
      ...prev,
      [key]: 0,
      [item.category]: 0
    }));
  };

  const handleRestoreLine = (idOrCategory: string) => {
    setDeletedLineIds(prev => prev.filter(id => id !== idOrCategory));
    setCostOverrides(prev => {
      const next = { ...prev };
      delete next[idOrCategory];
      return next;
    });
  };

  const handleAddCustomLine = (item: CustomLineItemInput) => {
    setCustomLineItems(prev => [...prev, item]);
  };

  const handleDeleteCustomLine = (idOrIndex: string | number) => {
    setCustomLineItems(prev => prev.filter((item, idx) => item.id !== idOrIndex && idx !== idOrIndex));
  };

  const handleUpdateLineDetails = (id: string, newDesc: string, newQty: number, newUnitPrice: number) => {
    setDescriptionOverrides(prev => ({
      ...prev,
      [id]: newDesc
    }));
    const isCustom = customLineItems.some(c => c.id === id);
    if (isCustom) {
      setCustomLineItems(prev => prev.map(c => c.id === id ? {
        ...c,
        description: newDesc,
        quantity: newQty,
        unitPriceExVat: newUnitPrice,
        total: Math.round(newQty * newUnitPrice * 100) / 100,
        totalPriceExVat: Math.round(newQty * newUnitPrice * 100) / 100
      } : c));
    } else {
      const total = Math.round(newQty * newUnitPrice * 100) / 100;
      setCostOverrides(prev => ({
        ...prev,
        [id]: total
      }));
    }
  };

  const handleSaveQuote = async () => {
    if (!result) return;
    setSavingQuote(true);
    try {
      const leadRes = await api.createLead({
        customerName: customerName.trim() || 'New Lead Customer',
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        leadSource: leadSource.trim() || 'Website',
        addressLine1: addressLine1.trim() || '1 Unspecified Street',
        postcode: postcode.trim() || 'SW1A 1AA',
        country: country || 'England',
        epcRating: epcRating || 'D',
        epcFloorArea: (epcFloorArea !== '' && Number(epcFloorArea) > 0) ? Number(epcFloorArea) : 100,
        propertyType: propertyType || 'Semi detached',
        propertyStatus: propertyStatus || 'Existing Home',
        bedrooms: (bedrooms !== '' && Number(bedrooms) > 0) ? Number(bedrooms) : 3,
        bathrooms: (bathrooms !== '' && Number(bathrooms) > 0) ? Number(bathrooms) : 1,
        wallInsulation: wallInsulation || 'Cavity filled',
        roofInsulation: roofInsulation || '200mm+',
        existingHeatingSystem: existingHeatingSystem || 'Gas Central Heating',
        boilerType: boilerType || 'Combi',
        onOffGasGrid: onOffGasGrid || 'On gas grid',
        cylinderSpace: cylinderSpace || 'Yes',
        existingRadiatorCount: (existingRadiatorCount !== '' && Number(existingRadiatorCount) > 0) ? Number(existingRadiatorCount) : 10,
        existingPipework: existingPipework || 'Standard 15mm+',
        previousGovernmentGrant: previousGovernmentGrant || 'None',
        salesNotes: salesNotes || ''
      });

      const leadId = leadRes?.id || leadRes?.lead?.id;
      if (!leadId) {
        throw new Error(leadRes?.error || 'Lead creation failed: Missing lead ID in server response.');
      }

      const quoteRes = await api.saveQuoteSnapshot({
        leadId,
        mode: 'NEW_LEAD',
        createdBy: currentUserId,
        calculationResult: result,
        snapshotNotes: `New Lead commercial assessment for ${customerName || 'New Lead Customer'} (${addressLine1 || 'Unspecified Address'}, ${postcode || 'SW1A 1AA'}).`
      });

      if (!quoteRes || !quoteRes.quoteId || !quoteRes.quoteReference) {
        throw new Error(quoteRes?.error || 'Failed to save quote snapshot: Server returned invalid quote response.');
      }

      setSavedQuoteRef(quoteRes.quoteReference);
      if (onQuoteSaved) {
        onQuoteSaved(quoteRes.quoteId);
      }
    } catch (err: any) {
      alert('Failed to save quote snapshot: ' + err.message);
    } finally {
      setSavingQuote(false);
    }
  };

  // Filtered ASHPs for selection modal
  const filteredAshps = ashpCatalog.filter(p => {
    const matchesSearch = !ashpSearchQuery || 
      p.model.toLowerCase().includes(ashpSearchQuery.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(ashpSearchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(ashpSearchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(ashpSearchQuery.toLowerCase()));
    const matchesBrand = ashpBrandFilter === 'ALL' || (p.brand || p.manufacturer) === ashpBrandFilter;
    return matchesSearch && matchesBrand;
  });

  const ashpBrands = Array.from(new Set(ashpCatalog.map(p => p.brand || p.manufacturer))).filter(Boolean);

  // Filtered Cylinders for selection modal
  const filteredCylinders = cylinderCatalog.filter(c => {
    return !cylinderSearchQuery ||
      c.model.toLowerCase().includes(cylinderSearchQuery.toLowerCase()) ||
      c.brand.toLowerCase().includes(cylinderSearchQuery.toLowerCase()) ||
      c.manufacturer.toLowerCase().includes(cylinderSearchQuery.toLowerCase()) ||
      c.nominal_litres.toString().includes(cylinderSearchQuery);
  });

  return (
    <div className="new-lead-view-container">
      {/* Header & Mandatory Disclaimer Banner */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Mode A — New Lead / Pre-Survey Check
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Pre-Survey commercial viability estimate from preliminary property data. Sizing and costs are indicative.
            </p>
          </div>
          {savedQuoteRef && (
            <div className="badge badge-success" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
              <CheckCircle2 size={16} /> Locked Snapshot Saved: {savedQuoteRef}
            </div>
          )}
        </div>

        <div className="disclaimer-banner">
          <Info size={18} />
          <span>
            <strong>MANDATORY NOTICE:</strong> Pre-Survey Estimate — not an MCS final design. Peak heat loss and equipment sizing are indicative estimates subject to room-by-room BS EN 12831 survey calculation.
          </span>
        </div>
      </div>

      {calcError && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          {calcError}
        </div>
      )}

      {/* Main Grid: Inputs (Left) and Live Viability Output (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: GUIDED PROPERTY FORM */}
        <div>
          {/* Customer & Lead Info */}
          <div className="card">
            <h2 className="card-title">1. Customer & Lead Origin</h2>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  className="form-control"
                  placeholder="e.g. Arthur Pendelton"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <input
                  className="form-control"
                  placeholder="e.g. Website Form, Phone, Referral"
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. customer@example.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 07700 900123"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Property Dimensions & Archetype */}
          <div className="card">
            <h2 className="card-title">2. Property Architecture & Fabric</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Address Line 1</label>
                <input
                  className="form-control"
                  placeholder="e.g. 14 Meadow Lane"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Postcode</label>
                <input
                  className="form-control font-mono"
                  placeholder="e.g. LS6 2NW"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Country (BUS Scope)</label>
                <SearchableSelect
                  options={countryOptions}
                  value={country}
                  onChange={(val) => setCountry(val || '')}
                  placeholder="Select country (optional)..."
                  searchPlaceholder="Search country..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <SearchableSelect
                  options={propertyTypeOptions}
                  value={propertyType}
                  onChange={(val) => setPropertyType(val || '')}
                  placeholder="Select property type (optional)..."
                  searchPlaceholder="Search property type..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Property Status</label>
                <SearchableSelect
                  options={propertyStatusOptions}
                  value={propertyStatus}
                  onChange={(val) => setPropertyStatus(val || '')}
                  placeholder="Select status (optional)..."
                  searchPlaceholder="Search status..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">EPC Rating</label>
                <SearchableSelect
                  options={epcRatingOptions}
                  value={epcRating}
                  onChange={(val) => setEpcRating(val || '')}
                  placeholder="Select EPC band (optional)..."
                  searchPlaceholder="Search EPC band..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">EPC Floor Area (m²)</label>
                <input
                  type="number"
                  min="0"
                  max="600"
                  className="form-control font-mono"
                  placeholder="e.g. 120"
                  value={epcFloorArea}
                  onChange={(e) => setEpcFloorArea(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Storeys</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="form-control"
                  placeholder="e.g. 2"
                  value={storeys}
                  onChange={(e) => setStoreys(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              {/* Requirement 7: EPC Annual Heating Energy kWh/yr */}
              <div className="form-group">
                <label className="form-label">Annual space heating energy (EPC) (kWh/year)</label>
                <input
                  type="number"
                  placeholder="e.g. 14120"
                  className="form-control font-mono"
                  value={annualHeatingKwh}
                  onChange={(e) => setAnnualHeatingKwh(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  SAP annual space energy consumption. (Distinct from peak design heat loss kW)
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Annual water heating energy (EPC) (kWh/year)</label>
                <input
                  type="number"
                  placeholder="e.g. 1814"
                  className="form-control font-mono"
                  value={annualHotWaterKwh}
                  onChange={(e) => setAnnualHotWaterKwh(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bedrooms</label>
                <SearchableSelect
                  options={bedroomOptions}
                  value={bedrooms}
                  onChange={(val) => setBedrooms(val !== '' && val !== null && val !== undefined ? Number(val) : '')}
                  placeholder="Select bedrooms (optional)..."
                  searchPlaceholder="Search bedrooms..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bathrooms / Showers</label>
                <SearchableSelect
                  options={bathroomOptions}
                  value={bathrooms}
                  onChange={(val) => setBathrooms(val !== '' && val !== null && val !== undefined ? Number(val) : '')}
                  placeholder="Select bathrooms (optional)..."
                  searchPlaceholder="Search bathrooms..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Wall Insulation</label>
                <SearchableSelect
                  options={wallInsulationOptions}
                  value={wallInsulation}
                  onChange={(val) => setWallInsulation(val || '')}
                  placeholder="Select wall insulation (optional)..."
                  searchPlaceholder="Search wall insulation..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Roof / Loft Insulation</label>
                <SearchableSelect
                  options={roofInsulationOptions}
                  value={roofInsulation}
                  onChange={(val) => setRoofInsulation(val || '')}
                  placeholder="Select roof insulation (optional)..."
                  searchPlaceholder="Search roof insulation..."
                />
              </div>
            </div>
          </div>

          {/* Existing Heating System & Commercial Risks */}
          <div className="card">
            <h2 className="card-title">3. Heating System, Fuel & Infrastructure</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Gas Grid Connection</label>
                <SearchableSelect
                  options={onOffGasGridOptions}
                  value={onOffGasGrid}
                  onChange={(val) => setOnOffGasGrid(val || '')}
                  placeholder="Select grid status (optional)..."
                  searchPlaceholder="Search grid status..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Fuel Type</label>
                <SearchableSelect
                  options={existingFuelTypeOptions}
                  value={existingFuelType}
                  onChange={(val) => setExistingFuelType(val || '')}
                  placeholder="Select fuel type (optional)..."
                  searchPlaceholder="Search fuel type..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Boiler / Heat Source</label>
                <SearchableSelect
                  options={existingHeatingSystemOptions}
                  value={existingHeatingSystem}
                  onChange={(val) => setExistingHeatingSystem(val || '')}
                  placeholder="Select existing system (optional)..."
                  searchPlaceholder="Search system..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Boiler Type</label>
                <SearchableSelect
                  options={boilerTypeOptions}
                  value={boilerType}
                  onChange={(val) => setBoilerType(val || '')}
                  placeholder="Select boiler type (optional)..."
                  searchPlaceholder="Search boiler type..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cylinder Physical Space</label>
                <SearchableSelect
                  options={cylinderSpaceOptions}
                  value={cylinderSpace}
                  onChange={(val) => setCylinderSpace(val || '')}
                  placeholder="Select space availability (optional)..."
                  searchPlaceholder="Search space..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Pipework</label>
                <SearchableSelect
                  options={existingPipeworkOptions}
                  value={existingPipework}
                  onChange={(val) => setExistingPipework(val || '')}
                  placeholder="Select pipework (optional)..."
                  searchPlaceholder="Search pipework..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Radiator Count</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  className="form-control"
                  placeholder="e.g. 10"
                  value={existingRadiatorCount}
                  onChange={(e) => setExistingRadiatorCount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Previous Government Grant</label>
                <SearchableSelect
                  options={previousGovernmentGrantOptions}
                  value={previousGovernmentGrant}
                  onChange={(val) => setPreviousGovernmentGrant(val || '')}
                  placeholder="Select previous grants (optional)..."
                  searchPlaceholder="Search grants..."
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Sales Notes & Site Specific Observations</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Customer prefers outdoor unit on south wall; access through side gate."
                value={salesNotes}
                onChange={(e) => setSalesNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME COMMERCIAL VIABILITY SUMMARY */}
        <div>
          {result && (
            <div>
              {/* Executive Commercial Decision Card */}
              <div className="card" style={{ borderLeft: `6px solid ${result.rating.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Commercial Recommendation
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-main)' }}>
                      {result.recommendation.headline}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="rating-pill" style={{ backgroundColor: result.rating.color }}>
                      {result.rating.finalGrade}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <Badge type="recommendation" value={result.recommendation.status} />
                  <Badge type="bus" value={result.bus.status} />
                  <Badge type="confidence" value={result.confidence?.level || 'MEDIUM'} />
                </div>

                {result.rating.isDowngraded && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '14px' }}>
                    <strong>Rating Cap Applied:</strong> {result.rating.downgradeReasons.join(' ')}
                  </div>
                )}

                {/* Primary Financial Breakdown */}
                <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Job Cost (ex VAT)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>£{result.commercials.totalJobCost.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>
                          {result.commercials.busGrant === 0
                            ? 'BUS Grant (Ineligible)'
                            : result.bus.conditionalUpliftAvailable
                            ? 'Potential Grant (Conditional)'
                            : 'Estimated Grant (Standard)'}
                        </span>
                        <button
                          onClick={() => handleOpenRuleEvidence(result.bus.ruleEvidenceId || 'BUS_ASHP_STANDARD_GRANT')}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex' }}
                          title="View Authoritative BUS Rule Evidence"
                        >
                          <HelpCircle size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: result.bus.conditionalUpliftAvailable ? '#b45309' : '#059669' }}>
                        £{result.commercials.busGrant.toLocaleString()}
                      </div>
                      {result.bus.conditionalUpliftAvailable ? (
                        <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>
                          Potential £9,000 Uplift (Subject to Survey & Decommissioning Proof)
                        </div>
                      ) : result.commercials.busGrant > 0 ? (
                        <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                          Estimated Grant: £7,500 (GOV.UK Statutory Voucher)
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>
                          Ineligible for BUS grant funding
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Contribution</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>
                        £{result.commercials.customerContribution.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Gross Margin %</span>
                        <button
                          onClick={() => handleOpenRuleEvidence('COMMERCIAL_TRUE_MARGIN_FORMULA')}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex' }}
                          title="View Golden Margin Formula Evidence"
                        >
                          <HelpCircle size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: result.rating.color }}>
                        {result.commercials.grossMarginPercent}%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span>Required Revenue: <strong>£{result.commercials.requiredRevenue.toLocaleString()}</strong></span>
                    <span>Gross Profit: <strong>£{result.commercials.grossProfit.toLocaleString()}</strong></span>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  {(!currentUser || currentUser.role_name === 'READ_ONLY') ? (
                    <button
                      type="button"
                      onClick={() => alert('Login required: Saving quote snapshots requires a logged-in account with write permissions (Sales, Estimator, Surveyor, or Admin). Please click Login in the navigation bar.')}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      title="Log in to enable saving quotes"
                    >
                      <Lock size={16} /> Save Quote & Lock Snapshot (Login Required)
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveQuote}
                      disabled={savingQuote || !!savedQuoteRef}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                    >
                      <Save size={16} />
                      {savingQuote ? 'Locking Snapshot...' : savedQuoteRef ? 'Snapshot Locked & Saved' : 'Save Quote & Lock Snapshot'}
                    </button>
                  )}
                </div>
              </div>

              {/* Indicative System Sizing & Equipment Selection (Requirements 10 & 11) */}
              <div className="card">
                <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calculator size={18} color="var(--primary)" /> Equipment Selection & Overrides
                  </span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
                  {/* Heat Demand */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pre-survey estimated design demand:</span>
                        <button
                          onClick={() => handleOpenRuleEvidence('EPC_HEURISTIC_PRE_SURVEY_W_M2')}
                          style={{ background: 'none', border: 'none', marginLeft: '6px', cursor: 'pointer', color: 'var(--primary)' }}
                          title="View Heuristic Baseline Evidence"
                        >
                          <HelpCircle size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Design heat loss (kW) — not annual energy kWh/year</div>
                    </div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>{result.heatDemand?.displayRange}</strong>
                  </div>

                  {/* ASHP Selection Box */}
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: result.ashp?.isManualOverride ? '#fefce8' : 'var(--bg-panel)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Air Source Heat Pump
                        </span>
                        {result.ashp?.isManualOverride ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>MANUAL OVERRIDE</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>RECOMMENDED</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleOpenRuleEvidence('ASHP_DESIGN_SIZING_STANDARD')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                        title="View MCS Sizing Standard"
                      >
                        <HelpCircle size={13} />
                      </button>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {result.ashp?.selectedProduct?.brand || result.ashp?.recommendedProduct?.brand} {result.ashp?.selectedProduct?.model || result.ashp?.recommendedProduct?.model}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>Nominal: <strong>{result.ashp?.selectedProduct?.nominalKw || result.ashp?.recommendedProduct?.nominalKw} kW</strong></span>
                      <span>Rated: <strong style={{ color: '#059669' }}>{result.ashp?.selectedProduct?.ratedOutputKw || result.ashp?.recommendedProduct?.ratedOutputKw} kW</strong> (@ {result.ashp?.selectedProduct?.ratedOutputCondition || result.ashp?.recommendedProduct?.ratedOutputCondition})</span>
                      <span>Price: <strong>£{(result.ashp?.selectedProduct?.priceExVat || result.ashp?.recommendedProduct?.priceExVat || 0).toLocaleString()} ex VAT</strong></span>
                    </div>

                    {result.ashp?.isManualOverride && result.ashp?.recommendedProduct && (
                      <div style={{ fontSize: '0.75rem', color: '#854d0e', marginBottom: '8px', padding: '4px 8px', background: '#fef9c3', borderRadius: '4px' }}>
                        <strong>Auto-Recommended:</strong> {result.ashp.recommendedProduct.brand} {result.ashp.recommendedProduct.model} ({result.ashp.recommendedProduct.ratedOutputKw} kW @ {result.ashp.recommendedProduct.ratedOutputCondition})
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setShowAshpModal(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        Choose Different ASHP
                      </button>
                      {result.ashp?.isManualOverride && (
                        <button
                          onClick={() => setOverrideAshpId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#059669' }}
                        >
                          <RotateCcw size={12} /> Use Recommended
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cylinder Selection Box */}
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: result.cylinder?.isManualOverride ? '#fefce8' : 'var(--bg-panel)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Hot Water Storage Cylinder
                        </span>
                        {result.cylinder?.isManualOverride ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>MANUAL OVERRIDE</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>RECOMMENDED</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleOpenRuleEvidence('CYLINDER_SIZING_HEURISTIC')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                        title="View BS 6700 Cylinder Sizing Heuristic"
                      >
                        <HelpCircle size={13} />
                      </button>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {result.cylinder?.selectedProduct ? (
                        `${result.cylinder.selectedProduct.volumeLitres} L — ${result.cylinder.selectedProduct.brand} ${result.cylinder.selectedProduct.model}`
                      ) : (
                        result.cylinder?.displayCapacity || '200 L Unvented Cylinder'
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', alignItems: 'center' }}>
                      <span>Capacity: <strong style={{ color: '#0369a1', fontSize: '1rem', fontWeight: 800 }}>{result.cylinder?.selectedProduct?.volumeLitres || 200} L</strong></span>
                      <span>Price: <strong>£{(result.costBreakdown.cylinderCost || 0).toLocaleString()} ex VAT</strong></span>
                    </div>

                    {result.cylinder?.isManualOverride && result.cylinder?.recommendedProduct && (
                      <div style={{ fontSize: '0.75rem', color: '#854d0e', marginBottom: '8px', padding: '6px 10px', background: '#fef9c3', borderRadius: '6px', border: '1px solid #fef08a' }}>
                        <div style={{ fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.7rem', color: '#b45309' }}>
                          Manual Override
                        </div>
                        <div>Recommended: <strong>{result.cylinder.recommendedProduct.volumeLitres} L</strong> ({result.cylinder.recommendedProduct.brand} {result.cylinder.recommendedProduct.model})</div>
                        <div>Selected: <strong>{result.cylinder.selectedProduct?.volumeLitres || 200} L</strong> ({result.cylinder.selectedProduct?.brand} {result.cylinder.selectedProduct?.model})</div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setShowCylinderModal(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        Choose Different Cylinder
                      </button>
                      {result.cylinder?.isManualOverride && (
                        <button
                          onClick={() => setOverrideCylinderId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#059669' }}
                        >
                          <RotateCcw size={12} /> Use Recommended
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement 14: Fully Editable Commercial Cost Composition */}
              <CostCompositionTable
                title="Commercial Cost Composition (ex VAT)"
                subtitle="Every cost field is manually editable. Edit amounts directly, edit descriptions, delete lines, or add custom lines."
                lineItems={(result.lineItems || []) as any}
                totalJobCost={result.costBreakdown.totalJobCost}
                costOverrides={costOverrides}
                deletedLineIds={deletedLineIds}
                descriptionOverrides={descriptionOverrides}
                customLineItems={customLineItems}
                auditTrail={result.costAuditTrail}
                onUpdateCost={handleUpdateCostValue}
                onResetCost={handleResetCost}
                onDeleteLine={handleDeleteLine}
                onRestoreLine={handleRestoreLine}
                onAddCustomLine={handleAddCustomLine}
                onUpdateLineDetails={handleUpdateLineDetails}
                onDeleteCustomLine={handleDeleteCustomLine}
              />

              {/* Assumptions & Data Gaps */}
              <div className="card">
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>
                  <AlertTriangle size={16} color="#d97706" /> Assumptions & Data Gaps
                </h3>
                <ul style={{ paddingLeft: '18px', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.assumptionsAndDataGaps?.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ASHP Selection Modal */}
      {showAshpModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '850px', width: '100%',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Select Air Source Heat Pump</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choose any verified unit from the catalog (Manual Override)</span>
              </div>
              <button onClick={() => setShowAshpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', background: 'var(--bg-card)' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search model, brand, SKU..."
                  className="form-control"
                  style={{ paddingLeft: '32px' }}
                  value={ashpSearchQuery}
                  onChange={(e) => setAshpSearchQuery(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              <div style={{ width: '220px' }}>
                <SearchableSelect
                  options={[{ value: 'ALL', label: `All Brands (${ashpBrands.length})` }, ...ashpBrands.map(b => ({ value: b, label: b }))]}
                  value={ashpBrandFilter}
                  onChange={(val) => setAshpBrandFilter(val || 'ALL')}
                  placeholder="Filter brand..."
                  searchPlaceholder="Search brand..."
                  compact
                  clearable={false}
                />
              </div>
            </div>

            <div style={{ maxHeight: '55vh', overflowY: 'auto', padding: '12px' }}>
              <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Brand & Model</th>
                    <th>Marketing kW</th>
                    <th>Rated Output kW</th>
                    <th>MCS / PEL</th>
                    <th>Price (ex VAT)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAshps.slice(0, 30).map(p => {
                    const isSelected = overrideAshpId === p.id || (!overrideAshpId && result?.ashp?.recommendedProduct?.id === p.id);
                    return (
                      <tr key={p.id} style={{ backgroundColor: isSelected ? 'var(--primary-light)' : undefined }}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.brand || p.manufacturer} {p.model}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {p.sku || 'N/A'}</div>
                        </td>
                        <td>{p.nominal_capacity_kw || p.marketing_kw} kW</td>
                        <td>
                          <strong style={{ color: 'var(--primary)' }}>{p.rated_output_kw || p.nominal_capacity_kw} kW</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{p.rated_output_condition || '-2°C / 45°C'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.7rem' }}>
                            {p.mcs_status === 'MCS_CERTIFIED' ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>MCS Certified</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>{p.mcs_status || 'Unverified'}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          £{(p.price_ex_vat || 0).toLocaleString()}
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setOverrideAshpId(p.id);
                              setShowAshpModal(false);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-panel)' }}>
              <button onClick={() => setShowAshpModal(false)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Cylinder Selection Modal */}
      {showCylinderModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '750px', width: '100%',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Select Hot Water Cylinder</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choose any suitable capacity cylinder from the catalog</span>
              </div>
              <button onClick={() => setShowCylinderModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <input
                type="text"
                placeholder="Search by litres, model, or brand..."
                className="form-control"
                value={cylinderSearchQuery}
                onChange={(e) => setCylinderSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '12px' }}>
              <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Capacity</th>
                    <th>Brand & Model</th>
                    <th>Supplier</th>
                    <th>Price (ex VAT)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCylinders.map(c => {
                    const isSelected = overrideCylinderId === c.id || (!overrideCylinderId && result?.cylinder?.recommendedProduct?.id === c.id);
                    return (
                      <tr key={c.id} style={{ backgroundColor: isSelected ? 'var(--primary-light)' : undefined }}>
                        <td>
                          <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{c.nominal_litres}L</strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.brand} {c.model}</div>
                          {c.sku && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {c.sku}</div>}
                        </td>
                        <td>{c.supplier || 'City Plumbing'}</td>
                        <td style={{ fontWeight: 700 }}>
                          £{(c.price_ex_vat || 0).toLocaleString()}
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setOverrideCylinderId(c.id);
                              setShowCylinderModal(false);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-panel)' }}>
              <button onClick={() => setShowCylinderModal(false)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Authoritative Rule Evidence Modal */}
      <RuleEvidenceModal
        rule={activeRuleEvidence}
        isOpen={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
      />
    </div>
  );
};
