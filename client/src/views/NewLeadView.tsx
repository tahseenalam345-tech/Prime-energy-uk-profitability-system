import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator, AlertTriangle, ShieldCheck, CheckCircle2,
  Info, Save, ArrowRight, HelpCircle, FileCheck, Search,
  ExternalLink, RotateCcw, Plus, Trash2, Edit3, X, SlidersHorizontal, Lock,
  RefreshCw, History, FileText, Download, Eye
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

const leadSourceOptions: SelectOption[] = [
  { value: 'GOV.UK EPC Import', label: 'GOV.UK EPC Import', badge: 'EPC Import' },
  { value: 'Meta Ads', label: 'Meta Ads (Facebook / Instagram)' },
  { value: 'Google Ads', label: 'Google Ads / Search' },
  { value: 'Lead Gen Agency', label: 'Lead Gen Agency (LeadGen)' },
  { value: 'Phone Inquiry', label: 'Phone Inquiry' },
  { value: 'Customer Referral', label: 'Customer Referral' },
  { value: 'Website Form', label: 'Website Form' },
  { value: 'Other', label: 'Other' },
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
  const [ashpCatalogSortField, setAshpCatalogSortField] = useState<'brand' | 'marketing' | 'rated' | 'mcs' | 'price'>('rated');
  const [ashpCatalogSortOrder, setAshpCatalogSortOrder] = useState<'asc' | 'desc'>('asc');
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
  const [savedQuoteRef, setSavedQuoteRef] = useState<string | null>(null);

  // 6. Quotation Generation State (Mode A)
  const [generatingQuotation, setGeneratingQuotation] = useState(false);
  const [quotationResult, setQuotationResult] = useState<{
    quoteId: string;
    quoteReference: string;
    pdfUrl: string;
    docxUrl: string;
    validUntil: string;
    generatedAt: string;
  } | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [inputsChanged, setInputsChanged] = useState(false);

  // 7. GOV.UK EPC Import State & Provenance Tracking
  const [epcSearchPostcode, setEpcSearchPostcode] = useState('');
  const [epcSearching, setEpcSearching] = useState(false);
  const [epcSearchResults, setEpcSearchResults] = useState<any[]>([]);
  const [epcSearchNotice, setEpcSearchNotice] = useState('');
  const [epcSearchError, setEpcSearchError] = useState('');
  const [selectedEpcRecord, setSelectedEpcRecord] = useState<any | null>(null);
  const [epcImportMeta, setEpcImportMeta] = useState<{
    imported: boolean;
    reference: string;
    importedAt: string;
    certificateDate: string;
    selectedAddress: string;
    importedValues: Record<string, any>;
    manualEdits: Record<string, boolean>;
  }>({
    imported: false,
    reference: '',
    importedAt: '',
    certificateDate: '',
    selectedAddress: '',
    importedValues: {},
    manualEdits: {}
  });

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

  // Search EPC by postcode (GOV.UK EPC Data Service)
  const handleSearchEpc = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryPc = epcSearchPostcode || postcode;
    if (!queryPc || queryPc.trim().length < 3) {
      setEpcSearchError('Please enter a valid UK postcode to search EPC records.');
      return;
    }

    setEpcSearching(true);
    setEpcSearchError('');
    setEpcSearchNotice('');
    setEpcSearchResults([]);
    setSelectedEpcRecord(null);

    try {
      const res = await api.searchEpc(queryPc.trim());
      if (res.results && res.results.length > 0) {
        setEpcSearchResults(res.results);
        setSelectedEpcRecord(res.results[0]);
        if (res.notice) setEpcSearchNotice(res.notice);
      } else {
        setEpcSearchError(`No domestic EPC records found on GOV.UK for postcode ${queryPc.toUpperCase()}.`);
      }
    } catch (err: any) {
      setEpcSearchError('Failed to query GOV.UK EPC database: ' + (err.message || err));
    } finally {
      setEpcSearching(false);
    }
  };

  // Import selected EPC record into Mode A fields
  const handleImportEpc = async () => {
    if (!selectedEpcRecord) return;
    try {
      const res = await api.mapEpcRecord(selectedEpcRecord);
      if (res.mappedData) {
        const m = res.mappedData;
        const newImportedValues: Record<string, any> = {};

        if (m.addressLine1) { setAddressLine1(m.addressLine1); newImportedValues.addressLine1 = m.addressLine1; }
        if (m.postcode) { setPostcode(m.postcode); newImportedValues.postcode = m.postcode; }
        if (m.epcRating) { setEpcRating(m.epcRating); newImportedValues.epcRating = m.epcRating; }
        if (m.epcFloorArea !== undefined) { setEpcFloorArea(String(m.epcFloorArea)); newImportedValues.epcFloorArea = String(m.epcFloorArea); }
        if (m.propertyType) { setPropertyType(m.propertyType); newImportedValues.propertyType = m.propertyType; }
        if (m.bedrooms !== undefined) { setBedrooms(String(m.bedrooms)); newImportedValues.bedrooms = String(m.bedrooms); }
        if (m.wallInsulation) { setWallInsulation(m.wallInsulation); newImportedValues.wallInsulation = m.wallInsulation; }
        if (m.roofInsulation) { setRoofInsulation(m.roofInsulation); newImportedValues.roofInsulation = m.roofInsulation; }
        if (m.existingHeatingSystem) { setExistingHeatingSystem(m.existingHeatingSystem); newImportedValues.existingHeatingSystem = m.existingHeatingSystem; }
        if (m.existingFuelType) { setExistingFuelType(m.existingFuelType); newImportedValues.existingFuelType = m.existingFuelType; }
        if (m.onOffGasGrid) { setOnOffGasGrid(m.onOffGasGrid); newImportedValues.onOffGasGrid = m.onOffGasGrid; }
        if (m.annualHeatingKwh !== undefined) { setAnnualHeatingKwh(String(m.annualHeatingKwh)); newImportedValues.annualHeatingKwh = String(m.annualHeatingKwh); }
        if (m.annualHotWaterKwh !== undefined) { setAnnualHotWaterKwh(String(m.annualHotWaterKwh)); newImportedValues.annualHotWaterKwh = String(m.annualHotWaterKwh); }
        if (m.epcReference) { setEpcCertificateNumber(m.epcReference); newImportedValues.epcCertificateNumber = m.epcReference; }

        // Intelligent Automated Defaults on EPC Import:
        // 1. Property Status -> 'Existing property'
        setPropertyStatus('Existing property');

        // 2. Country -> Check postcode / address, default to 'England'
        const pc = (m.postcode || postcode || '').toUpperCase();
        let guessedCountry = 'England';
        if (/^(CF|LD|LL|NP|SA)\d/i.test(pc) || (m.selectedAddress || '').toLowerCase().includes('wales')) {
          guessedCountry = 'Wales';
        } else if (/^(AB|DD|DG|EH|FK|G|HS|IV|KA|KW|KY|PA|PH|TD|ZE)\d/i.test(pc) || (m.selectedAddress || '').toLowerCase().includes('scotland')) {
          guessedCountry = 'Scotland';
        }
        setCountry(guessedCountry);

        // 3. Storeys -> 1 if Bungalow, otherwise 2
        if (m.propertyType === 'Bungalow') {
          setStoreys('1');
        } else if (!storeys) {
          setStoreys('2');
        }

        // 4. Bathrooms -> Intelligent floor area / bedroom heuristic
        const area = m.epcFloorArea || (m.bedrooms ? m.bedrooms * 30 : 100);
        const beds = m.bedrooms || 3;
        if (area > 180 || beds >= 4) {
          setBathrooms(3);
        } else if (area >= 90 || beds >= 3) {
          setBathrooms(2);
        } else {
          setBathrooms(1);
        }

        // 5. Lead Source -> 'GOV.UK EPC Import' if empty
        if (!leadSource) {
          setLeadSource('GOV.UK EPC Import');
        }

        // 6. Boiler Type heuristic from heating system string
        const heatingText = String(m.existingHeatingSystem || '').toLowerCase();
        if (heatingText.includes('combi')) setBoilerType('Combi');
        else if (heatingText.includes('system')) setBoilerType('System');
        else if (heatingText.includes('boiler') || heatingText.includes('radiator')) setBoilerType('Regular');

        setEpcImportMeta({
          imported: true,
          reference: m.epcReference,
          importedAt: new Date().toLocaleDateString('en-GB'),
          certificateDate: m.certificateDate || '',
          selectedAddress: m.selectedAddress || selectedEpcRecord.address,
          importedValues: newImportedValues,
          manualEdits: {}
        });

        // Clear search input & close search results table box after successful import
        setEpcSearchPostcode('');
        setEpcSearchResults([]);
        setSelectedEpcRecord(null);
      }
    } catch (err: any) {
      alert('Failed to import EPC record: ' + err.message);
    }
  };

  // Re-import / reset imported EPC values
  const handleReimportEpc = () => {
    if (!epcImportMeta.imported) return;
    const vals = epcImportMeta.importedValues;
    if (vals.addressLine1 !== undefined) setAddressLine1(vals.addressLine1);
    if (vals.postcode !== undefined) setPostcode(vals.postcode);
    if (vals.epcRating !== undefined) setEpcRating(vals.epcRating);
    if (vals.epcFloorArea !== undefined) setEpcFloorArea(vals.epcFloorArea);
    if (vals.propertyType !== undefined) setPropertyType(vals.propertyType);
    if (vals.bedrooms !== undefined) setBedrooms(vals.bedrooms);
    if (vals.wallInsulation !== undefined) setWallInsulation(vals.wallInsulation);
    if (vals.roofInsulation !== undefined) setRoofInsulation(vals.roofInsulation);
    if (vals.existingHeatingSystem !== undefined) setExistingHeatingSystem(vals.existingHeatingSystem);
    if (vals.existingFuelType !== undefined) setExistingFuelType(vals.existingFuelType);
    if (vals.onOffGasGrid !== undefined) setOnOffGasGrid(vals.onOffGasGrid);
    if (vals.annualHeatingKwh !== undefined) setAnnualHeatingKwh(vals.annualHeatingKwh);
    if (vals.annualHotWaterKwh !== undefined) setAnnualHotWaterKwh(vals.annualHotWaterKwh);
    if (vals.epcCertificateNumber !== undefined) setEpcCertificateNumber(vals.epcCertificateNumber);

    setEpcImportMeta(prev => ({
      ...prev,
      manualEdits: {}
    }));
  };

  const trackFieldChange = (fieldName: string, value: any) => {
    if (!epcImportMeta.imported || !(fieldName in epcImportMeta.importedValues)) return;
    const original = String(epcImportMeta.importedValues[fieldName] ?? '');
    const current = String(value ?? '');
    const isEdited = original !== current;

    setEpcImportMeta(prev => ({
      ...prev,
      manualEdits: {
        ...prev.manualEdits,
        [fieldName]: isEdited
      }
    }));
  };

  const renderEpcBadge = (fieldName: string) => {
    if (!epcImportMeta.imported || !(fieldName in epcImportMeta.importedValues)) return null;
    const isEdited = epcImportMeta.manualEdits[fieldName];
    if (isEdited) {
      return (
        <span className="badge badge-warning" style={{ fontSize: '0.68rem', marginLeft: '6px', padding: '2px 6px' }} title="This value was edited after importing from GOV.UK EPC">
          Manually edited
        </span>
      );
    }
    return (
      <span className="badge badge-success" style={{ fontSize: '0.68rem', marginLeft: '6px', padding: '2px 6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }} title="Imported from official GOV.UK Energy Performance of Buildings Register">
        Imported from GOV.UK EPC
      </span>
    );
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
        salesNotes: salesNotes || '',
        epcSource: epcImportMeta.imported ? 'GOV.UK' : undefined,
        epcReference: epcImportMeta.imported ? epcImportMeta.reference : undefined,
        epcImportedAt: epcImportMeta.imported ? epcImportMeta.importedAt : undefined,
        epcCertificateDate: epcImportMeta.imported ? epcImportMeta.certificateDate : undefined,
        epcSelectedAddress: epcImportMeta.imported ? epcImportMeta.selectedAddress : undefined
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

  const handleGenerateQuotation = async () => {
    if (!result) return;

    if (!customerName || customerName.trim().length === 0) {
      alert('Customer Name is required to generate a formal quotation document. Please enter Customer Name in Customer Details.');
      return;
    }
    if (!addressLine1 || addressLine1.trim().length === 0 || !postcode || postcode.trim().length === 0) {
      alert('Installation Address (Address Line 1 and Postcode) is required to generate a formal quotation document. Please complete property address fields.');
      return;
    }

    setGeneratingQuotation(true);
    try {
      const leadRes = await api.createLead({
        customerName: customerName.trim(),
        email: email ? email.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        leadSource: leadSource || undefined,
        addressLine1: addressLine1.trim(),
        postcode: postcode.trim().toUpperCase(),
        country: country || 'England',
        propertyType: propertyType || 'Detached',
        propertyStatus: propertyStatus || 'Existing property',
        epcRating: epcRating || undefined,
        epcFloorArea: epcFloorArea ? parseFloat(epcFloorArea) : undefined,
        storeys: storeys ? parseInt(storeys, 10) : undefined,
        annualHeatingKwh: annualHeatingKwh ? parseFloat(annualHeatingKwh) : undefined,
        annualHotWaterKwh: annualHotWaterKwh ? parseFloat(annualHotWaterKwh) : undefined,
        epcCertificateNumber: epcCertificateNumber || undefined,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : undefined,
        wallInsulation: wallInsulation || undefined,
        roofInsulation: roofInsulation || undefined,
        existingHeatingSystem: existingHeatingSystem || undefined,
        boilerType: boilerType || undefined,
        onOffGasGrid: onOffGasGrid || undefined,
        cylinderSpace: cylinderSpace || undefined,
        existingPipework: existingPipework || undefined,
        previousGovernmentGrant: previousGovernmentGrant || undefined,
        salesNotes: salesNotes || '',
        epcSource: epcImportMeta.imported ? 'GOV.UK' : undefined,
        epcReference: epcImportMeta.imported ? epcImportMeta.reference : undefined,
        epcImportedAt: epcImportMeta.imported ? epcImportMeta.importedAt : undefined,
        epcCertificateDate: epcImportMeta.imported ? epcImportMeta.certificateDate : undefined,
        epcSelectedAddress: epcImportMeta.imported ? epcImportMeta.selectedAddress : undefined
      });

      const leadId = leadRes?.id || leadRes?.lead?.id;
      if (!leadId) {
        throw new Error(leadRes?.error || 'Failed to create or retrieve lead ID.');
      }

      const res = await api.generateQuotation({
        leadId,
        calculationResult: result,
        existingQuoteId: quotationResult?.quoteId || undefined,
        userId: currentUserId
      });

      if (!res || !res.quoteId) {
        throw new Error(res?.error || 'Server failed to return generated quotation.');
      }

      setQuotationResult({
        quoteId: res.quoteId,
        quoteReference: res.quoteReference,
        pdfUrl: res.pdfUrl,
        docxUrl: res.docxUrl,
        validUntil: res.validUntil,
        generatedAt: res.generatedAt
      });

      setSavedQuoteRef(res.quoteReference);
      if (onQuoteSaved) {
        onQuoteSaved(res.quoteId);
      }
    } catch (err: any) {
      alert('Failed to generate quotation document: ' + (err.message || err));
    } finally {
      setGeneratingQuotation(false);
    }
  };

  const handleRegenerateQuotation = async () => {
    if (!quotationResult || !result) return;
    setGeneratingQuotation(true);
    try {
      const res = await api.regenerateQuotation(quotationResult.quoteId, result);
      setQuotationResult({
        quoteId: res.quoteId,
        quoteReference: res.quoteReference,
        pdfUrl: res.pdfUrl,
        docxUrl: res.docxUrl,
        validUntil: res.validUntil,
        generatedAt: res.generatedAt
      });
    } catch (err: any) {
      alert('Failed to regenerate quotation: ' + (err.message || err));
    } finally {
      setGeneratingQuotation(false);
    }
  };

  // Filtered & Deduplicated ASHPs for selection modal with column header sorting
  const deduplicatedAshpCatalog = (() => {
    const seen = new Set<string>();
    const res: any[] = [];
    for (const item of ashpCatalog) {
      const brand = (item.brand || item.manufacturer || '').toLowerCase().trim();
      const model = (item.model || '').toLowerCase().trim();
      const rated = Number(item.rated_output_at_design ?? item.ratedOutputAtDesign ?? item.rated_output_kw ?? item.ratedOutputKw ?? 0);
      const key = item.sku ? item.sku.toLowerCase().trim() : `${brand}_${model}_${rated}`;
      if (!seen.has(key)) {
        seen.add(key);
        res.push(item);
      }
    }
    return res;
  })();

  const filteredAshps = deduplicatedAshpCatalog
    .filter(p => {
      const matchesSearch = !ashpSearchQuery || 
        (p.model || '').toLowerCase().includes(ashpSearchQuery.toLowerCase()) ||
        (p.manufacturer || '').toLowerCase().includes(ashpSearchQuery.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(ashpSearchQuery.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(ashpSearchQuery.toLowerCase());
      const matchesBrand = ashpBrandFilter === 'ALL' || (p.brand || p.manufacturer) === ashpBrandFilter;
      return matchesSearch && matchesBrand;
    })
    .sort((a, b) => {
      let res = 0;
      if (ashpCatalogSortField === 'brand') {
        const nameA = `${a.brand || a.manufacturer || ''} ${a.model || ''}`.toLowerCase();
        const nameB = `${b.brand || b.manufacturer || ''} ${b.model || ''}`.toLowerCase();
        res = nameA.localeCompare(nameB);
      } else if (ashpCatalogSortField === 'marketing') {
        const mktA = Number(a.nominal_capacity ?? a.marketing_nominal_kw ?? a.nominalCapacity ?? a.marketingNominalKw ?? a.nominal_capacity_kw ?? 0);
        const mktB = Number(b.nominal_capacity ?? b.marketing_nominal_kw ?? b.nominalCapacity ?? b.marketingNominalKw ?? b.nominal_capacity_kw ?? 0);
        res = mktA - mktB;
      } else if (ashpCatalogSortField === 'rated') {
        const ratedA = Number(a.rated_output_at_design ?? a.ratedOutputAtDesign ?? a.rated_output_kw ?? a.ratedOutputKw ?? 0);
        const ratedB = Number(b.rated_output_at_design ?? b.ratedOutputAtDesign ?? b.rated_output_kw ?? b.ratedOutputKw ?? 0);
        res = ratedA - ratedB;
      } else if (ashpCatalogSortField === 'mcs') {
        const mcsA = (a.mcs_status || a.mcsStatus || '').toLowerCase();
        const mcsB = (b.mcs_status || b.mcsStatus || '').toLowerCase();
        res = mcsA.localeCompare(mcsB);
      } else if (ashpCatalogSortField === 'price') {
        const priceA = Number(a.price_ex_vat ?? a.priceExVat ?? 0);
        const priceB = Number(b.price_ex_vat ?? b.priceExVat ?? 0);
        res = priceA - priceB;
      }
      return ashpCatalogSortOrder === 'asc' ? res : -res;
    });

  const handleAshpHeaderSort = (field: 'brand' | 'marketing' | 'rated' | 'mcs' | 'price') => {
    if (ashpCatalogSortField === field) {
      setAshpCatalogSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setAshpCatalogSortField(field);
      setAshpCatalogSortOrder('asc');
    }
  };

  const ashpBrands = Array.from(new Set(deduplicatedAshpCatalog.map(p => p.brand || p.manufacturer))).filter(Boolean);

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
          {/* IMPORT EPC FROM GOV.UK (Official Data Service) */}
          <div className="card" style={{ border: '1px solid #bfdbfe', background: '#f8fafc', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontSize: '1rem' }}>
                <Search size={18} color="#2563eb" /> Import EPC from GOV.UK Data Service
              </h2>
              {epcImportMeta.imported && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> EPC Imported ({epcImportMeta.reference})
                  </span>
                  <a
                    href={`https://find-energy-certificate.service.gov.uk/energy-certificate/${epcImportMeta.reference}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                    title="View official Energy Performance Certificate on GOV.UK"
                  >
                    <ExternalLink size={12} /> View Official GOV.UK Certificate ↗
                  </a>
                  <button
                    onClick={handleReimportEpc}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    title="Reset edited fields back to imported EPC values"
                  >
                    <RotateCcw size={12} /> Re-import EPC
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSearchEpc} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <input
                  className="form-control"
                  placeholder="Enter Postcode (e.g. WA15 8XL or SW1A 1AA)"
                  value={epcSearchPostcode}
                  onChange={(e) => setEpcSearchPostcode(e.target.value)}
                  style={{ textTransform: 'uppercase', fontWeight: 600 }}
                />
              </div>
              <button
                type="submit"
                disabled={epcSearching}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', border: 'none', whiteSpace: 'nowrap' }}
              >
                {epcSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} Search EPC
              </button>
            </form>

            {epcSearchNotice && (
              <div style={{ fontSize: '0.78rem', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                <Info size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
                {epcSearchNotice}
              </div>
            )}

            {epcSearchError && (
              <div style={{ fontSize: '0.8rem', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                {epcSearchError}
              </div>
            )}

            {/* Property Selector Table */}
            {epcSearchResults.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '12px', marginTop: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Select Property Certificate ({epcSearchResults.length} found):</span>
                  <button
                    onClick={handleImportEpc}
                    disabled={!selectedEpcRecord}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#059669', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Download size={13} /> Import EPC
                  </button>
                </div>

                <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '35px' }}></th>
                        <th>Address</th>
                        <th>EPC Rating</th>
                        <th>Cert. Date</th>
                        <th>Property Type</th>
                        <th>Floor Area</th>
                        <th>GOV.UK Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {epcSearchResults.map((rec) => {
                        const isSelected = selectedEpcRecord?.lmkKey === rec.lmkKey;
                        const certRef = rec.certificateNumber || rec.lmkKey;
                        return (
                          <tr
                            key={rec.lmkKey}
                            onClick={() => setSelectedEpcRecord(rec)}
                            style={{ cursor: 'pointer', background: isSelected ? '#eff6ff' : undefined }}
                          >
                            <td>
                              <input
                                type="radio"
                                name="epc_property_select"
                                checked={isSelected}
                                onChange={() => setSelectedEpcRecord(rec)}
                              />
                            </td>
                            <td style={{ fontWeight: isSelected ? 700 : 500 }}>{rec.address}</td>
                            <td>
                              <Badge type="grade" value={rec.epcRating} />
                            </td>
                            <td>{rec.certificateDate}</td>
                            <td>{rec.builtForm ? `${rec.builtForm} (${rec.propertyType})` : rec.propertyType}</td>
                            <td>{rec.floorAreaSqM ? `${rec.floorAreaSqM} m²` : '—'}</td>
                            <td>
                              <a
                                href={`https://find-energy-certificate.service.gov.uk/energy-certificate/${certRef}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}
                                title="Open certificate on GOV.UK"
                              >
                                <ExternalLink size={12} /> View ↗
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

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
                <SearchableSelect
                  options={leadSourceOptions}
                  value={leadSource}
                  onChange={(val) => setLeadSource(val || '')}
                  placeholder="Select lead source..."
                  searchPlaceholder="Search lead source..."
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
                <label className="form-label">
                  Address Line 1 {renderEpcBadge('addressLine1')}
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. 14 Meadow Lane"
                  value={addressLine1}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddressLine1(val);
                    trackFieldChange('addressLine1', val);
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Postcode {renderEpcBadge('postcode')}
                </label>
                <input
                  className="form-control font-mono"
                  placeholder="e.g. LS6 2NW"
                  value={postcode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPostcode(val);
                    trackFieldChange('postcode', val);
                  }}
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
                <label className="form-label">
                  Property Type {renderEpcBadge('propertyType')}
                </label>
                <SearchableSelect
                  options={propertyTypeOptions}
                  value={propertyType}
                  onChange={(val) => {
                    const v = val || '';
                    setPropertyType(v);
                    trackFieldChange('propertyType', v);
                  }}
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
                <label className="form-label">
                  EPC Rating {renderEpcBadge('epcRating')}
                </label>
                <SearchableSelect
                  options={epcRatingOptions}
                  value={epcRating}
                  onChange={(val) => {
                    const v = val || '';
                    setEpcRating(v);
                    trackFieldChange('epcRating', v);
                  }}
                  placeholder="Select EPC band..."
                  searchPlaceholder="Search EPC band..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  EPC Floor Area (m²) {renderEpcBadge('epcFloorArea')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="600"
                  className="form-control font-mono"
                  placeholder="e.g. 120"
                  value={epcFloorArea}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : String(e.target.value);
                    setEpcFloorArea(val);
                    trackFieldChange('epcFloorArea', val);
                  }}
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
                <label className="form-label">
                  Annual space heating energy (EPC) (kWh/year) {renderEpcBadge('annualHeatingKwh')}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 14120"
                  className="form-control font-mono"
                  value={annualHeatingKwh}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : String(e.target.value);
                    setAnnualHeatingKwh(val);
                    trackFieldChange('annualHeatingKwh', val);
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  SAP annual space energy consumption. (Not converted into peak kW)
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Annual water heating energy (EPC) (kWh/year) {renderEpcBadge('annualHotWaterKwh')}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1814"
                  className="form-control font-mono"
                  value={annualHotWaterKwh}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : String(e.target.value);
                    setAnnualHotWaterKwh(val);
                    trackFieldChange('annualHotWaterKwh', val);
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Bedrooms {renderEpcBadge('bedrooms')}
                </label>
                <SearchableSelect
                  options={bedroomOptions}
                  value={bedrooms}
                  onChange={(val) => {
                    const v = val !== '' && val !== null && val !== undefined ? String(val) : '';
                    setBedrooms(v);
                    trackFieldChange('bedrooms', v);
                  }}
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
                <label className="form-label">
                  Wall Insulation {renderEpcBadge('wallInsulation')}
                </label>
                <SearchableSelect
                  options={wallInsulationOptions}
                  value={wallInsulation}
                  onChange={(val) => {
                    const v = val || '';
                    setWallInsulation(v);
                    trackFieldChange('wallInsulation', v);
                  }}
                  placeholder="Select wall insulation..."
                  searchPlaceholder="Search wall insulation..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Roof / Loft Insulation {renderEpcBadge('roofInsulation')}
                </label>
                <SearchableSelect
                  options={roofInsulationOptions}
                  value={roofInsulation}
                  onChange={(val) => {
                    const v = val || '';
                    setRoofInsulation(v);
                    trackFieldChange('roofInsulation', v);
                  }}
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
                <label className="form-label">
                  Gas Grid Connection {renderEpcBadge('onOffGasGrid')}
                </label>
                <SearchableSelect
                  options={onOffGasGridOptions}
                  value={onOffGasGrid}
                  onChange={(val) => {
                    const v = val || '';
                    setOnOffGasGrid(v);
                    trackFieldChange('onOffGasGrid', v);
                  }}
                  placeholder="Select grid status..."
                  searchPlaceholder="Search grid status..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Existing Fuel Type {renderEpcBadge('existingFuelType')}
                </label>
                <SearchableSelect
                  options={existingFuelTypeOptions}
                  value={existingFuelType}
                  onChange={(val) => {
                    const v = val || '';
                    setExistingFuelType(v);
                    trackFieldChange('existingFuelType', v);
                  }}
                  placeholder="Select fuel type..."
                  searchPlaceholder="Search fuel type..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Existing Boiler / Heat Source {renderEpcBadge('existingHeatingSystem')}
                </label>
                <SearchableSelect
                  options={existingHeatingSystemOptions}
                  value={existingHeatingSystem}
                  onChange={(val) => {
                    const v = val || '';
                    setExistingHeatingSystem(v);
                    trackFieldChange('existingHeatingSystem', v);
                  }}
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

              {/* MODE A AUTOMATIC QUOTATION GENERATION (Requirement 2, 17, 18) */}
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(16,185,129,0.04))', border: '1.5px solid var(--primary, #2563eb)', marginBottom: '20px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 className="card-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--primary-dark, #1e40af)' }}>
                      <FileText size={20} color="var(--primary, #2563eb)" /> Mode A Quotation Generation
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
                      Fills master Word template (<code style={{ fontSize: '0.75rem' }}>Heat Pump Quotation.docx</code>) and converts to PDF.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleGenerateQuotation}
                      disabled={generatingQuotation}
                      className="btn btn-primary"
                      style={{
                        padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none'
                      }}
                    >
                      <FileText size={17} />
                      {generatingQuotation ? 'GENERATING QUOTATION...' : quotationResult ? 'REGENERATE QUOTATION' : 'GENERATE QUOTATION'}
                    </button>

                    {quotationResult && (
                      <>
                        <button
                          onClick={() => setShowPdfModal(true)}
                          className="btn btn-secondary"
                          style={{ padding: '9px 14px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Eye size={15} /> Preview
                        </button>

                        <a
                          href={quotationResult.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ padding: '9px 14px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                        >
                          <Download size={15} /> Download PDF
                        </a>

                        <a
                          href={quotationResult.docxUrl}
                          download
                          className="btn btn-secondary"
                          style={{ padding: '9px 14px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                          title="Download completed Word DOCX file"
                        >
                          <Download size={15} /> DOCX
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {quotationResult && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: 'var(--surface-color, #fff)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.825rem', marginTop: '10px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary, #64748b)' }}>Quotation Ref:</span>
                      <strong style={{ display: 'block', color: 'var(--text-color, #0f172a)', fontSize: '0.9rem' }}>{quotationResult.quoteReference}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary, #64748b)' }}>Customer:</span>
                      <strong style={{ display: 'block', color: 'var(--text-color, #0f172a)' }}>{customerName || 'Customer'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary, #64748b)' }}>Valid Until:</span>
                      <strong style={{ display: 'block', color: '#059669' }}>{quotationResult.validUntil}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary, #64748b)' }}>Generated:</span>
                      <strong style={{ display: 'block', color: 'var(--text-color, #0f172a)' }}>{new Date(quotationResult.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ({new Date(quotationResult.generatedAt).toLocaleDateString('en-GB')})</strong>
                    </div>
                  </div>
                )}
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
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSuitableAshpsModal(true); }}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Search size={14} /> VIEW ALL SUITABLE MODELS
                      </button>

                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAshpModal(true); }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      >
                        Full Catalog Search
                      </button>

                      {result.ashp?.isManualOverride && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOverrideAshpId(null); }}
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
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCylinderModal(true); }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        Choose Different Cylinder
                      </button>
                      {result.cylinder?.isManualOverride && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOverrideCylinderId(null); }}
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
          allAshps={result?.ashp?.allAshpProducts || ashpCatalog}
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
                    <th onClick={() => handleAshpHeaderSort('brand')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Brand & Model {ashpCatalogSortField === 'brand' ? (ashpCatalogSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th onClick={() => handleAshpHeaderSort('marketing')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Marketing kW {ashpCatalogSortField === 'marketing' ? (ashpCatalogSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th onClick={() => handleAshpHeaderSort('rated')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Rated Output kW {ashpCatalogSortField === 'rated' ? (ashpCatalogSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th onClick={() => handleAshpHeaderSort('mcs')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      MCS / PEL {ashpCatalogSortField === 'mcs' ? (ashpCatalogSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th onClick={() => handleAshpHeaderSort('price')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Price (ex VAT) {ashpCatalogSortField === 'price' ? (ashpCatalogSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAshps.map(p => {
                    const isSelected = overrideAshpId === p.id || (!overrideAshpId && result?.ashp?.recommendedProduct?.id === p.id);
                    const mktKw = Number(p.nominal_capacity ?? p.marketing_nominal_kw ?? p.nominalCapacity ?? p.marketingNominalKw ?? 0);
                    const ratedKw = Number(p.rated_output_at_design ?? p.ratedOutputAtDesign ?? p.rated_output_kw ?? p.ratedOutputKw ?? mktKw ?? 0);
                    const condStr = p.rated_output_condition || p.ratedOutputCondition || p.design_condition || p.designCondition || '-2°C / 45°C';
                    const priceEx = Number(p.price_ex_vat ?? p.priceExVat ?? 0);
                    const mcs = p.mcs_status || p.mcsStatus || 'UNVERIFIED';

                    return (
                      <tr key={p.id} style={{ backgroundColor: isSelected ? 'var(--primary-light)' : undefined }}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.brand || p.manufacturer} {p.model}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {p.sku || 'N/A'}</div>
                        </td>
                        <td>{mktKw > 0 ? `${mktKw.toFixed(1)} kW` : 'N/A'}</td>
                        <td>
                          <strong style={{ color: 'var(--primary)' }}>{ratedKw > 0 ? `${ratedKw.toFixed(1)} kW` : 'N/A'}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{condStr}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.7rem' }}>
                            {mcs.toUpperCase() === 'MCS_CERTIFIED' ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>MCS Certified</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>{mcs}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          £{priceEx > 0 ? priceEx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
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
          allCylinders={result?.cylinder?.allCylinders || cylinderCatalog}
        />
      )}

      {/* Authoritative Rule Evidence Modal */}
      <RuleEvidenceModal
        rule={activeRuleEvidence}
        isOpen={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
      />

      {/* QUOTATION PREVIEW / DOWNLOAD MODAL (Requirement 17) */}
      {showPdfModal && quotationResult && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div style={{
            width: '95%', maxWidth: '1050px', height: '90vh',
            backgroundColor: '#ffffff', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              padding: '14px 20px', background: '#0f172a', color: '#ffffff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                  <FileText size={20} color="#10b981" /> Heat Pump Quotation — {quotationResult.quoteReference}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Customer: {customerName || 'Customer'} | BUS Grant: £{(result?.bus?.grantAmount || 0).toLocaleString()} | Customer Contribution: £{(result?.commercials?.customerContribution || 0).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={quotationResult.docxUrl}
                  download
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#059669', border: 'none', textDecoration: 'none', color: '#ffffff', fontWeight: 700 }}
                >
                  <Download size={15} /> Download Word DOCX
                </a>

                {quotationResult.pdfUrl && (
                  <a
                    href={quotationResult.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#334155', border: 'none', textDecoration: 'none', color: '#ffffff' }}
                  >
                    <Download size={15} /> Download PDF
                  </a>
                )}

                <button
                  onClick={() => setShowPdfModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                  title="Close Preview"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#f8fafc', overflowY: 'auto' }}>
              {quotationResult.pdfUrl ? (
                <iframe
                  src={`${quotationResult.pdfUrl}#toolbar=1&navpanes=0`}
                  title="Quotation PDF Preview"
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                />
              ) : (
                <div style={{ padding: '40px 20px', maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                    <CheckCircle2 size={36} />
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Quotation Document Generated Successfully
                  </h2>
                  <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.5 }}>
                    Your formal quotation for <strong>{customerName || 'Valued Customer'}</strong> ({quotationResult.quoteReference}) has been populated directly into the master Word template with exact branding, table structures, and legal BUS wording.
                  </p>

                  <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', textAlign: 'left', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                      <div><span style={{ color: '#64748b' }}>Quote Reference:</span> <strong>{quotationResult.quoteReference}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Date Issued:</span> <strong>{new Date().toLocaleDateString('en-GB')}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Installation Address:</span> <strong>{addressLine1}, {postcode}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Valid Until:</span> <strong>{quotationResult.validUntil}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Recommended ASHP:</span> <strong>{result?.ashp?.selectedProduct?.model || 'Air Source Heat Pump'}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Hot Water Cylinder:</span> <strong>{result?.cylinder?.selectedCylinder?.model || 'Hot Water Cylinder'}</strong></div>
                      <div><span style={{ color: '#64748b' }}>BUS Grant Deduction:</span> <strong style={{ color: '#059669' }}>-£{(result?.bus?.grantAmount || 0).toLocaleString()}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Net Customer Contribution:</span> <strong style={{ color: '#b45309' }}>£{(result?.commercials?.customerContribution || 0).toLocaleString()}</strong></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <a
                      href={quotationResult.docxUrl}
                      download
                      className="btn btn-primary"
                      style={{ padding: '12px 24px', fontSize: '1rem', background: '#059669', borderColor: '#059669', color: '#ffffff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', borderRadius: '6px' }}
                    >
                      <Download size={18} /> Download Master Word Quotation (.docx)
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
