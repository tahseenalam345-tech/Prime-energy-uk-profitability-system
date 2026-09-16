import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator, AlertTriangle, ShieldCheck, CheckCircle2,
  Info, Save, ArrowRight, HelpCircle, FileCheck, Search,
  ExternalLink, RotateCcw, Plus, Trash2, Edit3, X, SlidersHorizontal, Lock,
  RefreshCw, History
} from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.js';
import { CalculationResult, RuleEvidence, User } from '../types.js';
import { RuleEvidenceModal } from '../components/RuleEvidenceModal.js';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect.js';
import { CostCompositionTable, CustomLineItemInput } from '../components/CostCompositionTable.js';
import { SuitableAshpsModal } from '../components/SuitableAshpsModal.js';
import { SuitableCylindersModal } from '../components/SuitableCylindersModal.js';

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
  { value: 'Combi', label: 'Combi', sublabel: 'Existing combi boiler' },
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
  { value: 'Microbore 10mm or less', label: 'Microbore 10mm or less', sublabel: 'Triggers Full Re-pipe (£1,800)', badge: 'Re-pipe Req.' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Commercial Risk Warning' },
];

const previousGovernmentGrantOptions: SelectOption[] = [
  { value: 'None', label: 'None', sublabel: 'Fully BUS eligible', badge: 'BUS Eligible' },
  { value: 'BUS', label: 'Previous BUS Claimed', sublabel: 'Disqualifies from BUS grant', badge: 'Disqualified' },
  { value: 'RHI', label: 'Previous Domestic RHI Claimed', sublabel: 'Disqualifies from BUS grant', badge: 'Disqualified' },
  { value: 'Unknown', label: 'Unknown', sublabel: 'Uncertainty Flag' },
];

const dominantRadiatorTypeOptions: SelectOption[] = [
  { value: 'K1', label: 'Mostly K1 / Type 11', sublabel: 'Single panel, single convector' },
  { value: 'P_PLUS', label: 'Mostly P+ / Type 21', sublabel: 'Double panel, single convector' },
  { value: 'K2', label: 'Mostly K2 / Type 22', sublabel: 'Double panel, double convector' },
  { value: 'MIXED_UNKNOWN', label: 'Mixed / Don\'t know', sublabel: 'Combination or unverified' },
];

interface NewLeadViewProps {
  onQuoteSaved?: (quoteId: string) => void;
  currentUserId: string;
  currentUser?: User | null;
}

export const NewLeadView: React.FC<NewLeadViewProps> = ({ onQuoteSaved, currentUserId, currentUser }) => {
  // 1. Form state - Customer & Property (Empty initial state)
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
  const [epcFloorArea, setEpcFloorArea] = useState<string>('');
  const [storeys, setStoreys] = useState<string>('');
  const [annualHeatingKwh, setAnnualHeatingKwh] = useState<string>('');
  const [annualHotWaterKwh, setAnnualHotWaterKwh] = useState<string>('');
  const [epcCertificateNumber, setEpcCertificateNumber] = useState('');

  const [bedrooms, setBedrooms] = useState<string>('');
  const [bathrooms, setBathrooms] = useState<string>('');
  const [wallInsulation, setWallInsulation] = useState('');
  const [roofInsulation, setRoofInsulation] = useState('');
  const [existingHeatingSystem, setExistingHeatingSystem] = useState('');
  const [existingFuelType, setExistingFuelType] = useState('');
  const [boilerType, setBoilerType] = useState('');
  const [onOffGasGrid, setOnOffGasGrid] = useState('');
  const [cylinderSpace, setCylinderSpace] = useState('');
  
  // Requirement 2: Simplified Radiator Inputs (Total count & Dominant type)
  const [existingRadiatorCount, setExistingRadiatorCount] = useState<string>('');
  const [dominantRadiatorType, setDominantRadiatorType] = useState('');

  const [existingPipework, setExistingPipework] = useState('');
  const [previousGovernmentGrant, setPreviousGovernmentGrant] = useState('');
  const [salesNotes, setSalesNotes] = useState('');

  // 2. Draft Autosave & Recovery State
  const [draftStatus, setDraftStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'RESTORED'>('IDLE');

  // 3. Equipment manual override & selection modal states
  const [overrideAshpId, setOverrideAshpId] = useState<string | null>(null);
  const [overrideCylinderId, setOverrideCylinderId] = useState<string | null>(null);
  const [showAshpModal, setShowAshpModal] = useState(false);
  const [showCylinderModal, setShowCylinderModal] = useState(false);
  const [showSuitableAshpsModal, setShowSuitableAshpsModal] = useState(false);
  const [showAshpHelpModal, setShowAshpHelpModal] = useState(false);
  const [showCylinderHelpModal, setShowCylinderHelpModal] = useState(false);

  // 4. Commercial cost overrides, deleted lines, description overrides, and custom line items
  const [costOverrides, setCostOverrides] = useState<Record<string, number>>({});
  const [deletedLineIds, setDeletedLineIds] = useState<string[]>([]);
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({});
  const [customLineItems, setCustomLineItems] = useState<CustomLineItemInput[]>([]);

  // 5. Equipment catalogs for modals (Cached ONCE on mount)
  const [ashpCatalog, setAshpCatalog] = useState<any[]>([]);
  const [cylinderCatalog, setCylinderCatalog] = useState<any[]>([]);
  const [ashpSearchQuery, setAshpSearchQuery] = useState('');
  const [ashpBrandFilter, setAshpBrandFilter] = useState('ALL');
  const [cylinderSearchQuery, setCylinderSearchQuery] = useState('');
  const [cylinderSortField, setCylinderSortField] = useState<'capacity' | 'brand' | 'price'>('capacity');
  const [cylinderSortOrder, setCylinderSortOrder] = useState<'asc' | 'desc'>('asc');

  // 6. Rule Evidence popover state
  const [activeRuleEvidence, setActiveRuleEvidence] = useState<RuleEvidence | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // 7. Calculation output state & Recalculate indicator
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [calcError, setCalcError] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);
  const [savedQuoteRef, setSavedQuoteRef] = useState('');
  const [inputsChanged, setInputsChanged] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Restore Draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('prime_lead_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          if (parsed.customerName) setCustomerName(parsed.customerName);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.leadSource) setLeadSource(parsed.leadSource);
          if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
          if (parsed.postcode) setPostcode(parsed.postcode);
          if (parsed.country) setCountry(parsed.country);
          if (parsed.epcRating) setEpcRating(parsed.epcRating);
          if (parsed.epcFloorArea !== undefined) setEpcFloorArea(parsed.epcFloorArea);
          if (parsed.storeys !== undefined) setStoreys(parsed.storeys);
          if (parsed.annualHeatingKwh !== undefined) setAnnualHeatingKwh(parsed.annualHeatingKwh);
          if (parsed.annualHotWaterKwh !== undefined) setAnnualHotWaterKwh(parsed.annualHotWaterKwh);
          if (parsed.epcCertificateNumber) setEpcCertificateNumber(parsed.epcCertificateNumber);
          if (parsed.propertyType) setPropertyType(parsed.propertyType);
          if (parsed.propertyStatus) setPropertyStatus(parsed.propertyStatus);
          if (parsed.bedrooms !== undefined) setBedrooms(parsed.bedrooms);
          if (parsed.bathrooms !== undefined) setBathrooms(parsed.bathrooms);
          if (parsed.wallInsulation) setWallInsulation(parsed.wallInsulation);
          if (parsed.roofInsulation) setRoofInsulation(parsed.roofInsulation);
          if (parsed.existingHeatingSystem) setExistingHeatingSystem(parsed.existingHeatingSystem);
          if (parsed.existingFuelType) setExistingFuelType(parsed.existingFuelType);
          if (parsed.boilerType) setBoilerType(parsed.boilerType);
          if (parsed.onOffGasGrid) setOnOffGasGrid(parsed.onOffGasGrid);
          if (parsed.cylinderSpace) setCylinderSpace(parsed.cylinderSpace);
          if (parsed.existingRadiatorCount !== undefined) setExistingRadiatorCount(parsed.existingRadiatorCount);
          if (parsed.dominantRadiatorType) setDominantRadiatorType(parsed.dominantRadiatorType);
          if (parsed.existingPipework) setExistingPipework(parsed.existingPipework);
          if (parsed.previousGovernmentGrant) setPreviousGovernmentGrant(parsed.previousGovernmentGrant);
          if (parsed.salesNotes) setSalesNotes(parsed.salesNotes);
          setDraftStatus('RESTORED');
        }
      }
    } catch (err) {
      console.error('Failed to load draft from localStorage', err);
    }
  }, []);

  // Autosave Draft on field changes (debounced 500ms, skip empty initial state)
  useEffect(() => {
    const hasInputs = Boolean(
      customerName || addressLine1 || postcode || epcRating || epcFloorArea ||
      propertyType || bedrooms || bathrooms || salesNotes || existingRadiatorCount
    );

    if (!hasInputs) return;

    setDraftStatus('SAVING');
    const timer = setTimeout(() => {
      try {
        const draftPayload = {
          customerName, email, phone, leadSource, addressLine1, postcode, country, epcRating, epcFloorArea,
          storeys, annualHeatingKwh, annualHotWaterKwh, epcCertificateNumber,
          propertyType, propertyStatus, bedrooms, bathrooms, wallInsulation, roofInsulation,
          existingHeatingSystem, existingFuelType, boilerType, onOffGasGrid, cylinderSpace,
          existingRadiatorCount, dominantRadiatorType, existingPipework, previousGovernmentGrant, salesNotes
        };
        localStorage.setItem('prime_lead_draft', JSON.stringify(draftPayload));
        setDraftStatus('SAVED');
      } catch (err) {
        console.error('Autosave failed', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    customerName, email, phone, leadSource, addressLine1, postcode, country, epcRating, epcFloorArea,
    storeys, annualHeatingKwh, annualHotWaterKwh, epcCertificateNumber,
    propertyType, propertyStatus, bedrooms, bathrooms, wallInsulation, roofInsulation,
    existingHeatingSystem, existingFuelType, boilerType, onOffGasGrid, cylinderSpace,
    existingRadiatorCount, dominantRadiatorType, existingPipework, previousGovernmentGrant, salesNotes
  ]);

  // Permanently Discard Draft
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem('prime_lead_draft');
      setCustomerName('');
      setEmail('');
      setPhone('');
      setLeadSource('');
      setAddressLine1('');
      setPostcode('');
      setCountry('');
      setEpcRating('');
      setEpcFloorArea('');
      setStoreys('');
      setAnnualHeatingKwh('');
      setAnnualHotWaterKwh('');
      setEpcCertificateNumber('');
      setPropertyType('');
      setPropertyStatus('');
      setBedrooms('');
      setBathrooms('');
      setWallInsulation('');
      setRoofInsulation('');
      setExistingHeatingSystem('');
      setExistingFuelType('');
      setBoilerType('');
      setOnOffGasGrid('');
      setCylinderSpace('');
      setExistingRadiatorCount('');
      setDominantRadiatorType('');
      setExistingPipework('');
      setPreviousGovernmentGrant('');
      setSalesNotes('');
      setOverrideAshpId(null);
      setOverrideCylinderId(null);
      setCostOverrides({});
      setDeletedLineIds([]);
      setDescriptionOverrides({});
      setCustomLineItems([]);
      setDraftStatus('IDLE');
      setResult(null);
    } catch (err) {
      console.error('Failed to discard draft', err);
    }
  };

  // Load catalogs ONCE on mount (Requirement 6: Do not refetch on every field change)
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

  // Ultra-fast debounced calculation execution with AbortController stale request cancellation
  const runCalculation = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setCalculating(true);
    setCalcError('');
    try {
      const payload: any = {
        customerName: customerName || undefined,
        addressLine1: addressLine1 || undefined,
        postcode: postcode || undefined,
        country: country || undefined,
        epcRating: epcRating || undefined,
        epcFloorArea: (epcFloorArea !== '' && Number(epcFloorArea) > 0) ? Number(epcFloorArea) : undefined,
        storeys: (storeys !== '' && Number(storeys) > 0) ? Number(storeys) : undefined,
        annualHeatingKwh: annualHeatingKwh !== '' ? Number(annualHeatingKwh) : undefined,
        annualHotWaterKwh: annualHotWaterKwh !== '' ? Number(annualHotWaterKwh) : undefined,
        epcCertificateNumber: epcCertificateNumber || undefined,
        propertyType: propertyType || undefined,
        propertyStatus: propertyStatus || undefined,
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
        dominantRadiatorType: dominantRadiatorType || undefined,
        existingPipework: existingPipework || undefined,
        previousGovernmentGrant: previousGovernmentGrant || undefined,
        salesNotes: salesNotes || undefined,
        overrideAshpId: overrideAshpId || undefined,
        overrideCylinderId: overrideCylinderId || undefined,
        costOverrides: Object.keys(costOverrides).length > 0 ? costOverrides : undefined,
        deletedLineIds: deletedLineIds.length > 0 ? deletedLineIds : undefined,
        descriptionOverrides: Object.keys(descriptionOverrides).length > 0 ? descriptionOverrides : undefined,
        customLineItems: customLineItems.length > 0 ? customLineItems : undefined
      };

      const res = await api.calculateNewLead(payload, controller.signal);
      setResult(res);
      setInputsChanged(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setCalcError(err.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  // 250ms Debounce effect on property input changes for instant responsiveness
  useEffect(() => {
    setInputsChanged(true);
    const timer = setTimeout(() => {
      runCalculation();
    }, 250);
    return () => clearTimeout(timer);
  }, [
    epcFloorArea, epcRating, propertyType, propertyStatus, country,
    bedrooms, bathrooms, wallInsulation, roofInsulation, boilerType,
    cylinderSpace, existingPipework, onOffGasGrid, existingHeatingSystem, existingFuelType,
    previousGovernmentGrant, existingRadiatorCount, dominantRadiatorType,
    annualHeatingKwh, annualHotWaterKwh, overrideAshpId, overrideCylinderId,
    costOverrides, deletedLineIds, descriptionOverrides, customLineItems
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
    if (!result || !result.hasSufficientData) return;
    setSavingQuote(true);
    try {
      const leadRes = await api.createLead({
        customerName: customerName.trim() || 'New Lead Customer',
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        leadSource: leadSource.trim() || 'Website',
        addressLine1: addressLine1.trim() || 'Unspecified Address',
        postcode: postcode.trim() || 'Unspecified',
        country: country || 'England',
        epcRating: epcRating || undefined,
        epcFloorArea: (epcFloorArea !== '' && Number(epcFloorArea) > 0) ? Number(epcFloorArea) : undefined,
        propertyType: propertyType || undefined,
        propertyStatus: propertyStatus || undefined,
        bedrooms: (bedrooms !== '' && Number(bedrooms) > 0) ? Number(bedrooms) : undefined,
        bathrooms: (bathrooms !== '' && Number(bathrooms) > 0) ? Number(bathrooms) : undefined,
        wallInsulation: wallInsulation || undefined,
        roofInsulation: roofInsulation || undefined,
        existingHeatingSystem: existingHeatingSystem || undefined,
        boilerType: boilerType || undefined,
        onOffGasGrid: onOffGasGrid || undefined,
        cylinderSpace: cylinderSpace || undefined,
        existingPipework: existingPipework || undefined,
        previousGovernmentGrant: previousGovernmentGrant || undefined,
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
        snapshotNotes: `New Lead commercial assessment for ${customerName || 'New Lead Customer'} (${addressLine1 || 'Unspecified Address'}, ${postcode || 'Unspecified'}).`
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
  const filteredCylinders = cylinderCatalog
    .filter(c => {
      return !cylinderSearchQuery ||
        (c.model || '').toLowerCase().includes(cylinderSearchQuery.toLowerCase()) ||
        (c.brand || '').toLowerCase().includes(cylinderSearchQuery.toLowerCase()) ||
        (c.manufacturer || '').toLowerCase().includes(cylinderSearchQuery.toLowerCase()) ||
        (c.nominal_litres || '').toString().includes(cylinderSearchQuery);
    })
    .sort((a, b) => {
      let res = 0;
      if (cylinderSortField === 'capacity') {
        res = Number(a.nominal_litres || 0) - Number(b.nominal_litres || 0);
      } else if (cylinderSortField === 'brand') {
        res = (a.brand || a.manufacturer || '').localeCompare(b.brand || b.manufacturer || '');
      } else if (cylinderSortField === 'price') {
        res = Number(a.price_ex_vat || 0) - Number(b.price_ex_vat || 0);
      }
      return cylinderSortOrder === 'asc' ? res : -res;
    });

  const reqCylinderLitres = result?.cylinder?.recommendedVolumeLitres || 200;
  const top3Cylinders = [...cylinderCatalog]
    .sort((a, b) => {
      const litA = Number(a.nominal_litres || 0);
      const litB = Number(b.nominal_litres || 0);
      const diffA = litA >= reqCylinderLitres ? litA - reqCylinderLitres : 1000 + (reqCylinderLitres - litA);
      const diffB = litB >= reqCylinderLitres ? litB - reqCylinderLitres : 1000 + (reqCylinderLitres - litB);
      if (diffA !== diffB) return diffA - diffB;
      return Number(a.price_ex_vat || 0) - Number(b.price_ex_vat || 0);
    })
    .slice(0, 3);

  return (
    <div className="new-lead-view-container">
      {/* Header & Mandatory Disclaimer Banner */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Mode A — New Lead / Pre-Survey Check
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Pre-Survey commercial viability estimate from preliminary property data. Sizing and costs are indicative.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!currentUser && (
              <span className="badge badge-info" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px' }}>
                <Lock size={12} /> Read-only preview — in-memory calculations
              </span>
            )}
            {draftStatus === 'SAVED' && (
              <span className="badge badge-success" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> Draft saved
              </span>
            )}
            {draftStatus === 'SAVING' && (
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={13} className="animate-spin" /> Saving draft...
              </span>
            )}
            {draftStatus === 'RESTORED' && (
              <span className="badge badge-info" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <History size={13} /> Draft restored from session
              </span>
            )}

            {(draftStatus === 'SAVED' || draftStatus === 'RESTORED' || customerName || addressLine1 || epcFloorArea) && (
              <button
                onClick={handleDiscardDraft}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '5px 10px', color: '#ef4444', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Permanently delete this saved draft"
              >
                <Trash2 size={13} /> Discard Draft
              </button>
            )}

            {savedQuoteRef && (
              <div className="badge badge-success" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                <CheckCircle2 size={16} /> Locked Snapshot Saved: {savedQuoteRef}
              </div>
            )}
          </div>
        </div>

        {/* Prominent Mode A Warning Banner (Requirement 12) */}
        <div className="disclaimer-banner" style={{ background: '#fffbe6', border: '1px solid #ffe58f', color: '#873800' }}>
          <Info size={18} />
          <span>
            <strong>PRE-SURVEY ESTIMATE — NOT FINAL MCS HEAT-LOSS DESIGN.</strong> Peak heat loss and equipment sizing are indicative estimates subject to room-by-room BS EN 12831 survey calculation.
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
                  placeholder="Select country..."
                  searchPlaceholder="Search country..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <SearchableSelect
                  options={propertyTypeOptions}
                  value={propertyType}
                  onChange={(val) => setPropertyType(val || '')}
                  placeholder="Select property type..."
                  searchPlaceholder="Search property type..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Property Status</label>
                <SearchableSelect
                  options={propertyStatusOptions}
                  value={propertyStatus}
                  onChange={(val) => setPropertyStatus(val || '')}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">EPC Rating</label>
                <SearchableSelect
                  options={epcRatingOptions}
                  value={epcRating}
                  onChange={(val) => setEpcRating(val || '')}
                  placeholder="Select EPC band..."
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

              {/* EPC Annual Heating Energy kWh/yr */}
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
                  SAP annual space energy consumption. (Not converted into peak kW)
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
                  placeholder="Select bedrooms..."
                  searchPlaceholder="Search bedrooms..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bathrooms / Showers</label>
                <SearchableSelect
                  options={bathroomOptions}
                  value={bathrooms}
                  onChange={(val) => setBathrooms(val !== '' && val !== null && val !== undefined ? Number(val) : '')}
                  placeholder="Select bathrooms..."
                  searchPlaceholder="Search bathrooms..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Wall Insulation</label>
                <SearchableSelect
                  options={wallInsulationOptions}
                  value={wallInsulation}
                  onChange={(val) => setWallInsulation(val || '')}
                  placeholder="Select wall insulation..."
                  searchPlaceholder="Search wall insulation..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Roof / Loft Insulation</label>
                <SearchableSelect
                  options={roofInsulationOptions}
                  value={roofInsulation}
                  onChange={(val) => setRoofInsulation(val || '')}
                  placeholder="Select roof insulation..."
                  searchPlaceholder="Search roof insulation..."
                />
              </div>
            </div>
          </div>

          {/* Existing Heating System & Infrastructure */}
          <div className="card">
            <h2 className="card-title">3. Heating System, Fuel & Infrastructure</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Gas Grid Connection</label>
                <SearchableSelect
                  options={onOffGasGridOptions}
                  value={onOffGasGrid}
                  onChange={(val) => setOnOffGasGrid(val || '')}
                  placeholder="Select grid status..."
                  searchPlaceholder="Search grid status..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Fuel Type</label>
                <SearchableSelect
                  options={existingFuelTypeOptions}
                  value={existingFuelType}
                  onChange={(val) => setExistingFuelType(val || '')}
                  placeholder="Select fuel type..."
                  searchPlaceholder="Search fuel type..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Boiler / Heat Source</label>
                <SearchableSelect
                  options={existingHeatingSystemOptions}
                  value={existingHeatingSystem}
                  onChange={(val) => setExistingHeatingSystem(val || '')}
                  placeholder="Select existing system..."
                  searchPlaceholder="Search system..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Boiler Type</label>
                <SearchableSelect
                  options={boilerTypeOptions}
                  value={boilerType}
                  onChange={(val) => setBoilerType(val || '')}
                  placeholder="Select boiler type..."
                  searchPlaceholder="Search boiler type..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cylinder Physical Space</label>
                <SearchableSelect
                  options={cylinderSpaceOptions}
                  value={cylinderSpace}
                  onChange={(val) => setCylinderSpace(val || '')}
                  placeholder="Select space availability..."
                  searchPlaceholder="Search space..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Existing Pipework</label>
                <SearchableSelect
                  options={existingPipeworkOptions}
                  value={existingPipework}
                  onChange={(val) => setExistingPipework(val || '')}
                  placeholder="Select pipework..."
                  searchPlaceholder="Search pipework..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Previous Government Grant</label>
                <SearchableSelect
                  options={previousGovernmentGrantOptions}
                  value={previousGovernmentGrant}
                  onChange={(val) => setPreviousGovernmentGrant(val || '')}
                  placeholder="Select previous grants..."
                  searchPlaceholder="Search grants..."
                />
              </div>
            </div>

            {/* Requirement 2 & 3: Simplified Radiator Inputs */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                  Existing Radiator Summary
                </label>
                <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                  PRE-SURVEY PLAUSIBILITY INDICATOR
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Used only as a pre-survey emitter capacity plausibility indicator. Does not alter whole-house heat loss calculation.
              </p>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Total Radiators</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="form-control font-mono"
                    placeholder="e.g. 8"
                    value={existingRadiatorCount}
                    onChange={(e) => setExistingRadiatorCount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">What type are most of your existing radiators?</label>
                  <SearchableSelect
                    options={dominantRadiatorTypeOptions}
                    value={dominantRadiatorType}
                    onChange={(val) => setDominantRadiatorType(val || '')}
                    placeholder="Select dominant type..."
                    searchPlaceholder="Search radiator type..."
                  />
                </div>
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
          {/* Requirement 4: Visible Recalculation Loading State */}
          {calculating && (
            <div style={{
              background: '#0f172a', border: '1px solid #38bdf8', color: '#38bdf8',
              padding: '10px 16px', borderRadius: '10px', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: '0 4px 14px rgba(56, 189, 248, 0.15)'
            }}>
              <RefreshCw size={16} className="animate-spin" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Recalculating estimates…</span>
            </div>
          )}

          {/* Requirement 9: Recalculation Notice Banner */}
          {!calculating && inputsChanged && result && result.hasSufficientData && (
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af',
              padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                <RotateCcw size={16} /> ESTIMATE CHANGED — RECALCULATE
              </div>
              <button
                onClick={() => runCalculation()}
                className="btn btn-primary btn-sm"
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                Recalculate Now
              </button>
            </div>
          )}

          {/* Requirements 1 & 11: Empty Initial State */}
          {!result || !result.hasSufficientData ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-panel)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                border: '1px solid var(--border)'
              }}>
                <Calculator size={28} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Awaiting Property Data
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 20px', lineHeight: '1.5' }}>
                Enter floor area (m²) or select property archetype and bedrooms on the left to calculate heat demand estimates, suitable ASHPs, cylinder recommendations, and commercial viability.
              </p>
              <div className="badge badge-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                No default heat pump, cylinder, or fake prices preselected
              </div>
            </div>
          ) : (
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

                {/* Requirement 3: 7% Prime Energy Target Margin Designation */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Default Target Margin: 7%</span>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem', textTransform: 'none' }}>
                    PRIME ENERGY COMMERCIAL SETTING — NOT MCS / OFGEM / GOVERNMENT RULE
                  </span>
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

                {/* Requirement 9: Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={() => runCalculation()}
                    disabled={calculating}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem' }}
                  >
                    <RotateCcw size={15} /> {calculating ? 'Recalculating...' : 'RECALCULATE ESTIMATE'}
                  </button>

                  {(!currentUser || (currentUser.role_name || currentUser.role) === 'READ_ONLY') ? (
                    <button
                      type="button"
                      onClick={() => alert('Login required: Saving quote snapshots requires a logged-in account with write permissions (Sales, Estimator, Surveyor, or Admin). Please click Login in the navigation bar.')}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem' }}
                      title="Log in to enable saving quotes"
                    >
                      <Lock size={15} /> SAVE QUOTE (Login Req.)
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveQuote}
                      disabled={savingQuote || !!savedQuoteRef}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem' }}
                    >
                      <Save size={15} />
                      {savingQuote ? 'Saving...' : savedQuoteRef ? 'Saved' : 'SAVE QUOTE'}
                    </button>
                  )}
                </div>
              </div>

              {/* FINAL MODE A OUTPUT — PRE-SURVEY ESTIMATE */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Calculator size={18} color="var(--primary)" /> Technical Sizing & Emitter Check
                  </h3>
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                    PRE-SURVEY ESTIMATE — NOT FINAL MCS HEAT-LOSS DESIGN
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
                  {/* 1. Preliminary Estimated Heat Demand */}
                  <div style={{ padding: '10px 12px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>1. Preliminary Estimated Heat Demand</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Preliminary estimated heat demand — not an MCS/BS EN 12831 heat-load calculation.
                        </div>
                      </div>
                      <strong style={{ color: 'var(--text-main)', fontSize: '1.05rem' }}>{result.heatDemand?.displayRange}</strong>
                    </div>
                  </div>

                  {/* 2. Estimated Existing Radiator Emitter Capacity */}
                  <div style={{ padding: '10px 12px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>2. Estimated Existing Emitter Capacity</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {result.emitterCapacity?.disclaimer || "Estimated existing radiator emitter capacity — pre-survey indicator only. Not an MCS heat-loss calculation, not BS EN 12831 design heat loss and not final heat-pump sizing."}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600, marginTop: '4px' }}>
                          Δt30 = 55°C flow / 45°C return / 20°C room.
                        </div>
                      </div>
                      <strong style={{ color: 'var(--text-main)', fontSize: '1.05rem' }}>
                        {result.emitterCapacity?.estimatedOutputKwAt30Display || result.emitterCapacity?.estimatedOutputKwAt50Display || 'Not calculated'}
                      </strong>
                    </div>
                  </div>

                  {/* 3. Emitter Plausibility Check */}
                  <div style={{
                    padding: '10px 12px',
                    background: result.emitterCapacity?.plausibilityCheck?.comparisonResult === 'High emitter capacity' || result.emitterCapacity?.plausibilityCheck?.comparisonResult === 'Plausible match' ? '#f0fdf4' : '#fffbe6',
                    borderRadius: '6px',
                    border: `1px solid ${result.emitterCapacity?.plausibilityCheck?.comparisonResult === 'High emitter capacity' || result.emitterCapacity?.plausibilityCheck?.comparisonResult === 'Plausible match' ? '#bbf7d0' : '#ffe58f'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: result.emitterCapacity?.plausibilityCheck?.warningMessage ? '6px' : 0 }}>
                      <span style={{ fontWeight: 600, color: result.emitterCapacity?.plausibilityCheck?.comparisonResult === 'High emitter capacity' || result.emitterCapacity?.plausibilityCheck?.comparisonResult === 'Plausible match' ? '#15803d' : '#873800' }}>
                        3. Emitter Plausibility Screen
                      </span>
                      <span className={`badge ${result.emitterCapacity?.plausibilityCheck?.comparisonResult === 'High emitter capacity' || result.emitterCapacity?.plausibilityCheck?.comparisonResult === 'Plausible match' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                        {result.emitterCapacity?.plausibilityCheck?.comparisonResult || 'Unknown'}
                      </span>
                    </div>
                    {result.emitterCapacity?.plausibilityCheck?.warningMessage && (
                      <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} color="#d97706" />
                        {result.emitterCapacity.plausibilityCheck.warningMessage}
                      </div>
                    )}
                  </div>

                  {/* 4. Recommended ASHP */}
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: result.ashp?.isManualOverride ? '#fefce8' : 'var(--bg-panel)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          4. Recommended ASHP
                        </span>
                        {result.ashp?.isManualOverride ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>MANUAL OVERRIDE</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>RECOMMENDED</span>
                        )}
                        <span
                          title="Recommended from the preliminary heat-demand estimate, product performance at the design condition, system requirements and Prime rules. Final MCS sizing requires the completed survey heat-loss calculation."
                          style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <HelpCircle size={14} color="var(--primary)" />
                        </span>
                      </div>
                      <button
                        onClick={() => setShowAshpHelpModal(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '2px' }}
                        title="How ASHP recommendation & sizing work"
                      >
                        <HelpCircle size={16} />
                      </button>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {(() => {
                        const activeAshp = result.ashp?.selectedProduct || result.ashp?.recommendedProduct;
                        if (!activeAshp) return 'No ASHP Model Selected';
                        const ratedKw = Number(activeAshp.ratedOutputAtDesign ?? activeAshp.ratedOutputKw ?? 0);
                        return `${activeAshp.brand || activeAshp.manufacturer} ${activeAshp.model} — ${ratedKw > 0 ? ratedKw.toFixed(1) : 'N/A'} kW`;
                      })()}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', flexWrap: 'wrap' }}>
                      {(() => {
                        const activeAshp = result.ashp?.selectedProduct || result.ashp?.recommendedProduct;
                        const nomKw = Number(activeAshp?.nominalCapacity ?? activeAshp?.marketingNominalKw ?? activeAshp?.nominalKw ?? 0);
                        const ratedKw = Number(activeAshp?.ratedOutputAtDesign ?? activeAshp?.ratedOutputKw ?? 0);
                        const condStr = activeAshp?.designCondition || activeAshp?.ratedOutputCondition || 'A-2/W45';
                        const priceEx = Number(activeAshp?.priceExVat ?? 0);
                        return (
                          <>
                            <span>Marketing: <strong>{nomKw > 0 ? `${nomKw.toFixed(1)} kW` : 'N/A'}</strong></span>
                            <span>Rated Design Output: <strong style={{ color: '#059669' }}>{ratedKw > 0 ? `${ratedKw.toFixed(1)} kW` : 'N/A'}</strong> (@ {condStr})</span>
                            <span>Price: <strong>£{priceEx > 0 ? priceEx.toLocaleString() : 'N/A'} ex VAT</strong></span>
                          </>
                        );
                      })()}
                    </div>

                    {result.ashp?.isManualOverride && result.ashp?.recommendedProduct && (
                      <div style={{ fontSize: '0.75rem', color: '#854d0e', marginBottom: '8px', padding: '4px 8px', background: '#fef9c3', borderRadius: '4px' }}>
                        <strong>Auto-Recommended:</strong> {result.ashp.recommendedProduct.brand} {result.ashp.recommendedProduct.model} ({(result.ashp.recommendedProduct.ratedOutputAtDesign || result.ashp.recommendedProduct.ratedOutputKw || 0).toFixed(1)} kW @ {result.ashp.recommendedProduct.designCondition || 'A-2/W45'})
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        onClick={() => setShowSuitableAshpsModal(true)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Search size={14} /> VIEW ALL SUITABLE MODELS
                      </button>

                      <button
                        onClick={() => setShowAshpModal(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      >
                        Full Catalog Search
                      </button>

                      {result.ashp?.isManualOverride && (
                        <button
                          onClick={() => setOverrideAshpId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '5px 10px', color: '#059669' }}
                        >
                          <RotateCcw size={12} /> Use Recommended
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 5. Recommended Cylinder */}
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: result.cylinder?.isManualOverride ? '#fefce8' : 'var(--bg-panel)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          5. Recommended Cylinder
                        </span>
                        {result.cylinder?.isManualOverride ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>MANUAL OVERRIDE</span>
                        ) : result.cylinder?.recommendedProduct ? (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>RECOMMENDED</span>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>NOT REQUIRED</span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowCylinderHelpModal(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '2px' }}
                        title="How cylinder recommendation works"
                      >
                        <HelpCircle size={16} />
                      </button>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {(() => {
                        const activeCyl = result.cylinder?.selectedProduct || result.cylinder?.recommendedProduct;
                        const vol = Number(activeCyl?.volumeLitres ?? activeCyl?.nominal_litres ?? activeCyl?.capacityLitres ?? result.cylinder?.recommendedVolumeLitres ?? 200);
                        if (activeCyl) {
                          return `${activeCyl.brand} ${activeCyl.model} — ${vol} L`;
                        }
                        return `${vol} L Unvented Cylinder (based on DHW rules)`;
                      })()}
                    </div>

                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', alignItems: 'center' }}>
                      {(() => {
                        const activeCyl = result.cylinder?.selectedProduct || result.cylinder?.recommendedProduct;
                        const vol = Number(activeCyl?.volumeLitres ?? activeCyl?.nominal_litres ?? activeCyl?.capacityLitres ?? result.cylinder?.recommendedVolumeLitres ?? 200);
                        const price = Number(result.costBreakdown?.cylinderCost ?? activeCyl?.priceExVat ?? 0);
                        return (
                          <>
                            <span>Capacity: <strong style={{ color: '#0369a1', fontSize: '1rem', fontWeight: 800 }}>{vol} L</strong></span>
                            <span>Price: <strong>£{price.toLocaleString()} ex VAT</strong></span>
                          </>
                        );
                      })()}
                    </div>

                    {result.cylinder?.isManualOverride && result.cylinder?.recommendedProduct && (
                      <div style={{ fontSize: '0.75rem', color: '#854d0e', marginBottom: '8px', padding: '6px 10px', background: '#fef9c3', borderRadius: '6px', border: '1px solid #fef08a' }}>
                        <div>Recommended: <strong>{result.cylinder.recommendedProduct.volumeLitres || 200} L</strong> ({result.cylinder.recommendedProduct.brand} {result.cylinder.recommendedProduct.model})</div>
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

              {/* Requirement 8: Commercial Cost Composition Table */}
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

              {/* Requirement 10: Automatic Pre-Survey Summary Note */}
              {result.autoNote && (
                <div className="card">
                  <h3 className="card-title" style={{ fontSize: '0.95rem' }}>
                    Automatic Pre-Survey Summary Note
                  </h3>
                  <textarea
                    readOnly
                    className="form-control font-mono"
                    rows={6}
                    style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-panel)', color: 'var(--text-main)', lineHeight: '1.5' }}
                    value={result.autoNote}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Factual summary generated strictly from supplied parameters.
                  </div>
                </div>
              )}

              {/* Assumptions & Data Gaps */}
              {result.assumptionsAndDataGaps && result.assumptionsAndDataGaps.length > 0 && (
                <div className="card">
                  <h3 className="card-title" style={{ fontSize: '0.95rem' }}>
                    <AlertTriangle size={16} color="#d97706" /> Assumptions & Data Gaps
                  </h3>
                  <ul style={{ paddingLeft: '18px', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.assumptionsAndDataGaps.map((gap, idx) => (
                      <li key={idx}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Requirement 4: Categorized Suitable ASHPs Modal */}
      {showSuitableAshpsModal && (
        <SuitableAshpsModal
          isOpen={showSuitableAshpsModal}
          onClose={() => setShowSuitableAshpsModal(false)}
          requiredHeatDemandKw={result?.heatDemand?.maxDemandKw || result?.summary?.designHeatLossKw || 6.0}
          estimatedHeatDemandKw={result?.heatDemand?.maxDemandKw || 6.0}
          selectedAshpId={overrideAshpId || result?.ashp?.selectedProduct?.id || result?.ashp?.recommendedProduct?.id}
          onSelectAshp={(ashpId) => {
            setOverrideAshpId(ashpId);
            setShowSuitableAshpsModal(false);
          }}
          top3Recommended={result?.ashp?.top3Recommended}
          categorizedAshps={result?.ashp?.categorizedSuitableAshps}
          allAshps={result?.ashp?.allAshpProducts || (ashpProducts as any)}
        />
      )}

      {/* Requirement 5: ASHP Help Modal */}
      {showAshpHelpModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '650px', width: '100%',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Mode A — Air Source Heat Pump Sizing Guide
              </h3>
              <button onClick={() => setShowAshpHelpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto', fontSize: '0.875rem', lineHeight: '1.6' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginTop: 0 }}>Which Mode A inputs affect the estimate?</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                The Mode A pre-survey heat loss estimate is derived from supplied property parameters:
                EPC floor area (m²), property archetype multiplier (e.g. Detached 1.15x vs Flat 0.75x), and insulation heuristics (EPC rating or wall/loft insulation status).
              </p>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>How estimated kW is calculated</h4>
              <p style={{ background: 'var(--bg-panel)', padding: '10px 14px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                Estimated Heat Loss (kW) = (Floor Area m² × Archetype Multiplier × Heat Loss Density W/m²) / 1000
              </p>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>Rated Output vs Marketing kW</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Marketing badges (e.g. "9 kW") state output under standard mild conditions (+7°C air / 35°C water).
                Heat pump output drops at lower winter temperatures. Prime Energy sizes heat pumps based on <strong>certified MCS rated output at winter design conditions</strong> (e.g. -2°C outdoor air, 45°C flow), not marketing badges.
              </p>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>Design Condition Comparison</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                A unit marketed as 9 kW may deliver only 6.2 kW at -3°C design outdoor temperature. Prime Energy ensures the certified rated output at design condition equals or exceeds estimated peak heat loss.
              </p>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>Why a final MCS survey is required</h4>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                <strong>PRE-SURVEY ESTIMATE — NOT FINAL MCS HEAT-LOSS DESIGN.</strong><br />
                Mode A provides an initial commercial pre-assessment. A room-by-room BS EN 12831 survey (Mode B) is mandatory to establish true fabric heat loss, radiator sizing, and flow pipe velocities prior to installation.
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-panel)' }}>
              <button onClick={() => setShowAshpHelpModal(false)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 6: Cylinder Help Modal */}
      {showCylinderHelpModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '650px', width: '100%',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Mode A — Hot Water Cylinder Recommendation Guide
              </h3>
              <button onClick={() => setShowCylinderHelpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto', fontSize: '0.875rem', lineHeight: '1.6' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginTop: 0 }}>Cylinder Sizing & Technical Requirements</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Hot water cylinders are recommended based on property occupancy, bath/shower counts, and heat pump compatibility.
              </p>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>Sizing Factors Considered</h4>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                <li><strong>Bedrooms & Bathrooms:</strong> Determines peak domestic hot water (DHW) storage requirement (e.g. 1-2 bed / 1 bath = 180-200L, 3-4 bed / 2 bath = 250-300L).</li>
                <li><strong>Cylinder Space:</strong> Confirms whether an airing cupboard or dedicated plant space is available.</li>
                <li><strong>Heat Pump Coil Surface Area:</strong> Heat pump cylinders require high-efficiency coils (typically &ge; 2.5m² or corrugated coils) to ensure efficient heat transfer at lower flow temperatures.</li>
                <li><strong>Prime Energy DHW Sizing Rules:</strong> Sized conservatively according to BS 6700 / CIBSE guidelines.</li>
              </ul>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', marginTop: '16px' }}>
                <strong>Technical Note:</strong> Bedroom count alone is used as a preliminary indicator. Final technical sizing requires survey verification of bathroom flow rates and customer hot water usage patterns.
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-panel)' }}>
              <button onClick={() => setShowCylinderHelpModal(false)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Full ASHP Catalog Search Modal */}
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

      {/* Standard Cylinder Selection Modal */}
      {showCylinderModal && (
        <SuitableCylindersModal
          isOpen={showCylinderModal}
          onClose={() => setShowCylinderModal(false)}
          requiredVolumeLitres={result?.cylinder?.recommendedVolumeLitres || reqCylinderLitres || 200}
          selectedCylinderId={overrideCylinderId || result?.cylinder?.selectedProduct?.id || result?.cylinder?.recommendedProduct?.id}
          onSelectCylinder={(cylId) => {
            setOverrideCylinderId(cylId);
            setShowCylinderModal(false);
          }}
          top3Recommended={result?.cylinder?.top3Recommended}
          allCylinders={result?.cylinder?.allCylinders || (cylinderProducts as any)}
        />
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
