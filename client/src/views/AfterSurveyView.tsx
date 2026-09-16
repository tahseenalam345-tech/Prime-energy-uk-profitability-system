import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Save, CheckCircle2, Shield, Plus, Trash2, ArrowRight, Lock } from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.js';
import { CalculationResult, User } from '../types.js';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect.js';
import { CompactRadiatorSelector } from '../components/CompactRadiatorSelector.js';
import { CostCompositionTable, CustomLineItemInput } from '../components/CostCompositionTable.js';

interface AfterSurveyViewProps {
  onQuoteSaved?: (quoteId: string) => void;
  currentUserId: string;
  currentUser?: User | null;
}

export const AfterSurveyView: React.FC<AfterSurveyViewProps> = ({ onQuoteSaved, currentUserId, currentUser }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [ashpCatalog, setAshpCatalog] = useState<any[]>([]);
  const [cylinderCatalog, setCylinderCatalog] = useState<any[]>([]);
  const [radiatorCatalog, setRadiatorCatalog] = useState<any[]>([]);

  // Survey inputs (Default empty, optional)
  const [confirmedHeatLoss, setConfirmedHeatLoss] = useState<number | ''>(''); // kW
  const [designOutdoorTemp, setDesignOutdoorTemp] = useState<number | ''>(''); // C
  const [designFlowTemp, setDesignFlowTemp] = useState<number | ''>(''); // C
  const [selectedAshpId, setSelectedAshpId] = useState('');
  const [selectedCylinderId, setSelectedCylinderId] = useState('');
  const [electricalWorksCost, setElectricalWorksCost] = useState<number | ''>('');
  const [labourAdjustment, setLabourAdjustment] = useState<number | ''>(''); // e.g. +£200 complexity
  const [otherCosts, setOtherCosts] = useState<number | ''>('');
  const [surveyorNotes, setSurveyorNotes] = useState('');

  // Commercial cost overrides, deleted lines, description overrides & custom lines
  const [costOverrides, setCostOverrides] = useState<Record<string, number>>({});
  const [deletedLineIds, setDeletedLineIds] = useState<string[]>([]);
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({});
  const [customLineItems, setCustomLineItems] = useState<CustomLineItemInput[]>([]);

  // Radiators schedule (Default empty)
  const [radiatorSchedule, setRadiatorSchedule] = useState<Array<{ productId: string; quantity: number }>>([]);

  // Pipework schedule
  const [pipeMetres, setPipeMetres] = useState<number | ''>('');
  const [pipeUnitPrice, setPipeUnitPrice] = useState<number | ''>(''); // £25/m

  // Calculation output state
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedQuoteRef, setSavedQuoteRef] = useState('');

  // Initial data loading
  useEffect(() => {
    async function loadData() {
      try {
        const [leadsRes, ashps, cyls, rads] = await Promise.all([
          api.getLeads(),
          api.getProducts('ASHP'),
          api.getCylinders(),
          api.getRadiatorCatalogue()
        ]);
        setLeads(leadsRes.leads || []);
        // Note: Keep selectedLeadId empty by default as requested
        setAshpCatalog(ashps.products || []);
        setCylinderCatalog(cyls.cylinders || cyls.products || []);
        setRadiatorCatalog(rads.radiators || []);
      } catch (err) {
        console.error('Failed to load initial survey data', err);
      }
    }
    loadData();
  }, []);

  // Run calculation when survey inputs change
  const runCalculation = async () => {
    setCalculating(true);
    setError('');
    try {
      const selectedLead = leads.find(l => l.id === selectedLeadId);
      const chosenAshp = selectedAshpId || (ashpCatalog.length > 0 ? ashpCatalog[0].id : 'ashp_ecogenica_9');
      const payload = {
        leadId: selectedLeadId || 'lead_manual',
        surveyorUserId: currentUserId,
        confirmedDesignHeatLossKw: (confirmedHeatLoss !== '' && Number(confirmedHeatLoss) > 0) ? Number(confirmedHeatLoss) : 6.0,
        designOutdoorTemp: designOutdoorTemp !== '' ? Number(designOutdoorTemp) : -2.0,
        designFlowTemp: designFlowTemp !== '' ? Number(designFlowTemp) : 45.0,
        selectedAshpId: chosenAshp,
        selectedCylinderId: selectedCylinderId || undefined,
        exactRadiatorsSchedule: radiatorSchedule,
        exactPipeworkSchedule: (pipeMetres !== '' && Number(pipeMetres) > 0) ? [
          {
            description: '22mm & 28mm Insulated Copper Distribution Pipework',
            metres: Number(pipeMetres),
            unitPriceExVat: (pipeUnitPrice !== '' && Number(pipeUnitPrice) >= 0) ? Number(pipeUnitPrice) : 25
          }
        ] : [],
        electricalRequirementsCost: electricalWorksCost !== '' ? Number(electricalWorksCost) : 0,
        labourAdjustment: labourAdjustment !== '' ? Number(labourAdjustment) : 0,
        otherInstallationCosts: otherCosts !== '' ? Number(otherCosts) : 0,
        surveyorNotes: surveyorNotes || '',
        country: selectedLead?.country || 'England',
        propertyStatus: selectedLead?.property_status || 'Existing property',
        onOffGasGrid: selectedLead?.on_off_gas_grid || 'On gas grid',
        existingHeatingSystem: selectedLead?.existing_heating_system || 'Gas Central Heating',
        previousGovernmentGrant: selectedLead?.previous_government_grant || 'None',
        costOverrides: Object.keys(costOverrides).length > 0 ? costOverrides : undefined,
        deletedLineIds: deletedLineIds.length > 0 ? deletedLineIds : undefined,
        descriptionOverrides: Object.keys(descriptionOverrides).length > 0 ? descriptionOverrides : undefined,
        customLineItems: customLineItems.length > 0 ? customLineItems : undefined
      };

      const res = await api.calculateAfterSurvey(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Survey calculation failure');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [
    selectedLeadId, confirmedHeatLoss, designOutdoorTemp, designFlowTemp,
    selectedAshpId, selectedCylinderId, radiatorSchedule, pipeMetres, pipeUnitPrice,
    electricalWorksCost, labourAdjustment, otherCosts,
    costOverrides, deletedLineIds, descriptionOverrides, customLineItems
  ]);

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

  const addRadiatorRow = () => {
    if (radiatorCatalog.length > 0) {
      setRadiatorSchedule([...radiatorSchedule, { productId: radiatorCatalog[0].id, quantity: 1 }]);
    }
  };

  const removeRadiatorRow = (idx: number) => {
    setRadiatorSchedule(radiatorSchedule.filter((_, i) => i !== idx));
  };

  const handleSaveQuote = async () => {
    if (!result) return;
    setSaving(true);
    try {
      let targetLeadId = selectedLeadId;
      if (!targetLeadId) {
        // Automatically create a manual survey lead if none was selected
        const created = await api.createLead({
          customerName: 'Survey Customer (Manual)',
          addressLine1: 'Survey Property',
          postcode: 'SW1A 1AA',
          country: 'England',
          propertyType: 'Semi detached',
          propertyStatus: 'Existing Home'
        });
        targetLeadId = created?.id || created?.lead?.id;
        if (!targetLeadId) {
          throw new Error('Failed to create default survey customer');
        }
      }

      const res = await api.saveQuote({
        leadId: targetLeadId,
        calculationResult: result,
        userId: currentUserId
      });
      if (!res || !res.quoteId || !res.quoteReference) {
        throw new Error(res?.error || 'Failed to save survey quote: Server returned invalid quote response.');
      }
      setSavedQuoteRef(res.quoteReference);
      if (onQuoteSaved) {
        onQuoteSaved(res.quoteId);
      }
    } catch (err: any) {
      alert('Failed to save survey quote: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="after-survey-view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Mode B — After Survey / Confirmed System Design
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter verified MCS room-by-room design parameters. Heat loss is NOT estimated here; commercial viability is locked from confirmed specs.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!currentUser && (
            <span className="badge badge-info" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px' }}>
              <Lock size={12} /> Read-only preview — in-memory calculations
            </span>
          )}
          {savedQuoteRef && (
            <div className="badge badge-success" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
              <CheckCircle2 size={16} /> Locked Survey Snapshot: {savedQuoteRef}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: SURVEY DESIGN INPUTS */}
        <div>
          {/* Lead Selector */}
          <div className="card">
            <h2 className="card-title">1. Target Lead / Property</h2>
            <div className="form-group">
              <label className="form-label">Select Surveyed Lead (Optional)</label>
              <select className="form-control" value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)}>
                <option value="">-- No Existing Lead Selected (New Survey Entry) --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.reference_no} — {l.customer_name} ({l.address_line1}, {l.postcode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Confirmed MCS Design Points */}
          <div className="card">
            <h2 className="card-title">2. Confirmed MCS Design Points (No Estimation)</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Survey-confirmed design heat loss (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="40"
                  className="form-control font-mono"
                  placeholder="e.g. 7.8"
                  value={confirmedHeatLoss}
                  onChange={(e) => setConfirmedHeatLoss(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Design Outdoor Temp (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control font-mono"
                  placeholder="e.g. -2.0"
                  value={designOutdoorTemp}
                  onChange={(e) => setDesignOutdoorTemp(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Design Flow Temperature (°C)</label>
                <SearchableSelect
                  options={[
                    { value: 45, label: '45°C (High Efficiency MCS Standard)', badge: 'COP ~3.8' },
                    { value: 50, label: '50°C (Medium Temp Standard)', badge: 'COP ~3.4' },
                    { value: 55, label: '55°C (High Temp Fallback)', badge: 'COP ~3.0' }
                  ]}
                  value={designFlowTemp}
                  onChange={(val) => setDesignFlowTemp(val !== '' && val !== null && val !== undefined ? Number(val) : '')}
                  placeholder="Select flow temperature (optional)..."
                  searchPlaceholder="Search flow temp..."
                  clearable={true}
                />
              </div>
            </div>
          </div>

          {/* Specified Equipment (Surveyor Selection) */}
          <div className="card">
            <h2 className="card-title">3. Equipment Selection</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Confirmed ASHP Model</label>
                <SearchableSelect
                  options={ashpCatalog.map((p) => ({
                    value: p.id,
                    label: `${p.manufacturer} ${p.model}`,
                    sublabel: `Rated ${p.rated_output_at_design || p.rated_output_kw}kW @ ${p.design_condition || 'Design'} • ${p.refrigerant || 'R290/R32'}`,
                    badge: `£${(p.price_ex_vat || 0).toLocaleString()} ex VAT`
                  }))}
                  value={selectedAshpId}
                  onChange={(val) => setSelectedAshpId(val || '')}
                  placeholder="Search and select confirmed ASHP model (optional)..."
                  searchPlaceholder="Type manufacturer, model, capacity..."
                  clearable={true}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmed Hot Water Cylinder</label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None (Existing cylinder retained / suitable)' },
                    ...cylinderCatalog.map((c) => ({
                      value: c.id,
                      label: `${c.manufacturer} ${c.model}`,
                      sublabel: `${c.capacity_litres ? c.capacity_litres + 'L' : ''} ${c.coil_type || 'Heat Pump High-Recovery'}`,
                      badge: `£${(c.price_ex_vat || 0).toLocaleString()} ex VAT`
                    }))
                  ]}
                  value={selectedCylinderId}
                  onChange={(val) => setSelectedCylinderId(val || '')}
                  placeholder="Search and select cylinder (optional)..."
                  searchPlaceholder="Type capacity, manufacturer, model..."
                  clearable={true}
                />
              </div>
            </div>
          </div>

          {/* Exact Radiator Schedule */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title" style={{ fontSize: '1rem' }}>4. Exact Radiator Replacement Schedule</h2>
                <div className="card-subtitle">Compact dimension selector (valid Type, Height, and Length combinations only)</div>
              </div>
              <button onClick={addRadiatorRow} type="button" className="btn btn-secondary btn-sm">
                <Plus size={14} /> Add Radiator
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {radiatorSchedule.map((row, idx) => {
                const matchingItem = radiatorCatalog.find(r => r.id === row.productId);
                const currentType = matchingItem?.radiator_type || (row.productId.includes('k1') ? 'K1' : row.productId.includes('p_plus') ? 'P+' : 'K2');
                const currentHeight = matchingItem?.height_mm || 600;
                const currentLength = matchingItem?.length_mm || 1000;

                return (
                  <div key={idx} className="radiator-schedule-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-panel)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>Emitter #{idx + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Quantity:</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            className="form-control"
                            style={{ width: '70px', padding: '4px 8px', fontSize: '0.8125rem', textAlign: 'center' }}
                            value={row.quantity}
                            onChange={(e) => {
                              const updated = [...radiatorSchedule];
                              updated[idx].quantity = Math.max(1, Number(e.target.value));
                              setRadiatorSchedule(updated);
                            }}
                          />
                        </div>
                        <button onClick={() => removeRadiatorRow(idx)} type="button" className="btn btn-danger btn-sm" style={{ padding: '6px 10px' }}>
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                    <CompactRadiatorSelector
                      catalog={radiatorCatalog}
                      selectedType={currentType}
                      selectedHeight={currentHeight}
                      selectedLength={currentLength}
                      onChangeType={(newType) => {
                        const firstMatch = radiatorCatalog.find(r => (r.radiator_type === newType || r.type === newType));
                        if (firstMatch) {
                          const updated = [...radiatorSchedule];
                          updated[idx].productId = firstMatch.id;
                          setRadiatorSchedule(updated);
                        }
                      }}
                      onChangeHeight={(newHeight) => {
                        if (!newHeight) return;
                        const match = radiatorCatalog.find(r => (r.radiator_type === currentType || r.type === currentType) && Number(r.height_mm) === Number(newHeight));
                        if (match) {
                          const updated = [...radiatorSchedule];
                          updated[idx].productId = match.id;
                          setRadiatorSchedule(updated);
                        }
                      }}
                      onChangeLength={(newLength) => {
                        if (!newLength) return;
                        const match = radiatorCatalog.find(r => (r.radiator_type === currentType || r.type === currentType) && Number(r.height_mm) === Number(currentHeight) && Number(r.length_mm) === Number(newLength));
                        if (match) {
                          const updated = [...radiatorSchedule];
                          updated[idx].productId = match.id;
                          setRadiatorSchedule(updated);
                        }
                      }}
                    />
                  </div>
                );
              })}
              {radiatorSchedule.length === 0 && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '12px', textAlign: 'center', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)' }}>
                  No radiators scheduled for replacement. Click &quot;Add Radiator&quot; above to schedule an emitter.
                </div>
              )}
            </div>
          </div>

          {/* Pipework & Additional Site Costs */}
          <div className="card">
            <h2 className="card-title">5. Pipework, Electrical & Labour Adjustments</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Primary Pipework Run (Metres)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control font-mono"
                  placeholder="e.g. 18"
                  value={pipeMetres}
                  onChange={(e) => setPipeMetres(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pipework Unit Cost (£/m)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control font-mono"
                  placeholder="e.g. 25"
                  value={pipeUnitPrice}
                  onChange={(e) => setPipeUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmed Electrical Works Cost (£)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control font-mono"
                  placeholder="e.g. 250"
                  value={electricalWorksCost}
                  onChange={(e) => setElectricalWorksCost(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Labour Adjustment (+/- £ from £1,500 base)</label>
                <input
                  type="number"
                  step="50"
                  className="form-control font-mono"
                  value={labourAdjustment}
                  onChange={(e) => setLabourAdjustment(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 200 for complexity, -100 for easy access"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Surveyor Design Notes & Sign-off</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. MCS room-by-room heat loss survey completed. All radiators verified. Airing cupboard ready."
                value={surveyorNotes}
                onChange={(e) => setSurveyorNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SURVEY COMMERCIAL SUMMARY */}
        <div>
          {result && (
            <div>
              {/* Executive Commercial Decision */}
              <div className="card" style={{ borderLeft: `6px solid ${result.rating.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Survey Viability Status
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-main)' }}>
                      {result.recommendation.headline}
                    </h3>
                  </div>
                  <div className="rating-pill" style={{ backgroundColor: result.rating.color }}>
                    {result.rating.finalGrade}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <Badge type="recommendation" value={result.recommendation.status} />
                  <Badge type="bus" value={result.bus.status} />
                  <span className="badge badge-success" style={{ fontWeight: 800 }}>
                    <CheckCircle2 size={13} /> SURVEY-CONFIRMED
                  </span>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px', fontSize: '0.8rem', color: '#166534', marginBottom: '16px' }}>
                  <div><strong>Source:</strong> Survey / Prime Energy survey portal</div>
                  <div><strong>Status:</strong> SURVEY_CONFIRMED (BS EN 12831 Room-by-room MCS Standard)</div>
                  <div><strong>Survey-confirmed design heat loss:</strong> {confirmedHeatLoss} kW</div>
                </div>

                {/* Financial Summary */}
                <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Job Cost</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>£{result.commercials.totalJobCost.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confirmed BUS Grant</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                        £{result.commercials.busGrant.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Contribution</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>
                        £{result.commercials.customerContribution.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gross Margin %</div>
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

                {(!currentUser || (currentUser.role_name || currentUser.role) === 'READ_ONLY') ? (
                  <button
                    type="button"
                    onClick={() => alert('Login required: Saving survey quote snapshots requires a logged-in account with write permissions (Surveyor, Estimator, Sales, or Admin). Please click Login in the navigation bar.')}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    title="Log in to enable saving survey quotes"
                  >
                    <Lock size={16} /> Lock Survey Quote Snapshot (Login Required)
                  </button>
                ) : (
                  <button
                    onClick={handleSaveQuote}
                    disabled={saving || !!savedQuoteRef}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                  >
                    <Save size={16} />
                    {saving ? 'Locking Snapshot...' : savedQuoteRef ? 'Survey Snapshot Locked' : 'Lock Survey Quote Snapshot'}
                  </button>
                )}
              </div>

              {/* Confirmed Bill of Materials & Fully Editable Cost Composition */}
              <CostCompositionTable
                title="Confirmed Bill of Materials & Cost Breakdown (ex VAT)"
                subtitle="Every confirmed cost field is manually editable. Edit amounts directly, edit descriptions, delete lines, or add custom lines."
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
