import React, { useState } from 'react';
import {
  BarChart3, Table2, ShieldCheck, CheckCircle2,
  TrendingUp, PoundSterling, Sparkles, Sliders, ArrowRight,
  Calculator, Zap, Layers, RefreshCw
} from 'lucide-react';

interface ScenarioRow {
  archetype: string;
  scope: string;
  jobCost: number;
  busGrant: number;
  requiredRevenue: number;
  customerContribution: number;
  grossProfit: number;
  marginPercent: number;
  viability: 'EXCELLENT' | 'HIGH' | 'CORE' | 'REQUIRES_DEPOSIT';
  badgeLabel: string;
}

export const GoldenFormulaExplainer: React.FC = () => {
  // Active View Tab: 'CHARTS' (Canva-style visual waterfall & stacked bar) | 'TABLE' (Canva-style scenario matrix) | 'FORMULAS' (Audited Math)
  const [activeTab, setActiveTab] = useState<'CHARTS' | 'TABLE' | 'FORMULAS'>('CHARTS');

  // Interactive Simulator Controls
  const [simJobCost, setSimJobCost] = useState<number>(8000);
  const [simMarginPct, setSimMarginPct] = useState<number>(25);
  const [simBusGrant, setSimBusGrant] = useState<number>(7500);

  // Deterministic True Target Gross Margin Math
  const targetMargin = simMarginPct / 100;
  const requiredRevenue = simJobCost / (1 - targetMargin);
  const customerContribution = Math.max(0, requiredRevenue - simBusGrant);
  const actualRevenue = simBusGrant + customerContribution;
  const grossProfit = actualRevenue - simJobCost;
  const grossMarginPercent = actualRevenue > 0 ? (grossProfit / actualRevenue) * 100 : 0;

  // Percentage shares of revenue
  const grantSharePct = actualRevenue > 0 ? Math.min(100, (simBusGrant / actualRevenue) * 100) : 0;
  const custSharePct = actualRevenue > 0 ? Math.max(0, 100 - grantSharePct) : 0;
  const costSharePct = actualRevenue > 0 ? Math.min(100, (simJobCost / actualRevenue) * 100) : 0;
  const profitSharePct = actualRevenue > 0 ? Math.max(0, 100 - costSharePct) : 0;

  // Pre-calculated Scenario Matrix (Canva Table Data)
  const scenarios: ScenarioRow[] = [
    {
      archetype: '3-Bed Semi (Standard)',
      scope: '6kW ASHP + 180L Cyl + 3 Rads',
      jobCost: 7200,
      busGrant: simBusGrant,
      requiredRevenue: 7200 / (1 - targetMargin),
      customerContribution: Math.max(0, 7200 / (1 - targetMargin) - simBusGrant),
      grossProfit: (simBusGrant + Math.max(0, 7200 / (1 - targetMargin) - simBusGrant)) - 7200,
      marginPercent: simMarginPct,
      viability: 'EXCELLENT',
      badgeLabel: 'High Volume Core'
    },
    {
      archetype: '4-Bed Detached (Golden Test)',
      scope: '8.5kW ASHP + 210L Cyl + 5 Rads',
      jobCost: 8000,
      busGrant: simBusGrant,
      requiredRevenue: 8000 / (1 - targetMargin),
      customerContribution: Math.max(0, 8000 / (1 - targetMargin) - simBusGrant),
      grossProfit: (simBusGrant + Math.max(0, 8000 / (1 - targetMargin) - simBusGrant)) - 8000,
      marginPercent: simMarginPct,
      viability: 'EXCELLENT',
      badgeLabel: 'Golden Benchmark'
    },
    {
      archetype: '4-Bed Rural Detached',
      scope: '10kW ASHP + 250L Cyl + 7 Rads',
      jobCost: 9500,
      busGrant: simBusGrant,
      requiredRevenue: 9500 / (1 - targetMargin),
      customerContribution: Math.max(0, 9500 / (1 - targetMargin) - simBusGrant),
      grossProfit: (simBusGrant + Math.max(0, 9500 / (1 - targetMargin) - simBusGrant)) - 9500,
      marginPercent: simMarginPct,
      viability: 'HIGH',
      badgeLabel: 'High Gross Profit'
    },
    {
      archetype: '5-Bed Detached + Microbore',
      scope: '12kW ASHP + 300L Cyl + Full Re-pipe',
      jobCost: 11400,
      busGrant: simBusGrant,
      requiredRevenue: 11400 / (1 - targetMargin),
      customerContribution: Math.max(0, 11400 / (1 - targetMargin) - simBusGrant),
      grossProfit: (simBusGrant + Math.max(0, 11400 / (1 - targetMargin) - simBusGrant)) - 11400,
      marginPercent: simMarginPct,
      viability: 'CORE',
      badgeLabel: 'Complex Re-pipe'
    },
    {
      archetype: 'High Heat Loss Estate',
      scope: '14kW ASHP + Buffer + 12 Rads',
      jobCost: 13200,
      busGrant: simBusGrant,
      requiredRevenue: 13200 / (1 - targetMargin),
      customerContribution: Math.max(0, 13200 / (1 - targetMargin) - simBusGrant),
      grossProfit: (simBusGrant + Math.max(0, 13200 / (1 - targetMargin) - simBusGrant)) - 13200,
      marginPercent: simMarginPct,
      viability: 'REQUIRES_DEPOSIT',
      badgeLabel: 'High Contribution'
    }
  ];

  return (
    <div className="canva-analytics-card" style={{
      background: 'linear-gradient(145deg, #090e1a 0%, #0f182c 50%, #0d1527 100%)',
      color: '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '28px',
      boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(52, 211, 153, 0.15)',
      border: '1px solid rgba(52, 211, 153, 0.25)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Gradient Glow */}
      <div style={{
        position: 'absolute',
        top: '-80px',
        right: '-80px',
        width: '240px',
        height: '240px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Top Header & View Switcher */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '18px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.15) 100%)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.25)'
          }}>
            <TrendingUp size={22} color="#34d399" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#f8fafc' }}>
                Commercial Margin & Revenue Analytics
              </h2>
              <span style={{
                fontSize: '0.7rem',
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={11} /> Canva-Style Analytics
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
              Audited True Target Gross Margin specification with interactive revenue waterfall & pricing matrix.
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveTab('CHARTS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'CHARTS' ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent',
              color: activeTab === 'CHARTS' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'CHARTS' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <BarChart3 size={15} /> Visual Waterfall Chart
          </button>
          <button
            onClick={() => setActiveTab('TABLE')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'TABLE' ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent',
              color: activeTab === 'TABLE' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'TABLE' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Table2 size={15} /> Canva Scenario Table
          </button>
          <button
            onClick={() => setActiveTab('FORMULAS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'FORMULAS' ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent',
              color: activeTab === 'FORMULAS' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'FORMULAS' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldCheck size={15} /> Audited Math & Proof
          </button>
        </div>
      </div>

      {/* Interactive Simulation Controls Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        {/* Left: Job Cost Slider & Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.8125rem', fontWeight: 600 }}>
            <Sliders size={15} color="#34d399" />
            <span>Job Cost:</span>
            <strong style={{ color: '#ffffff', fontSize: '1rem' }}>£{simJobCost.toLocaleString()}</strong>
          </div>
          <input
            type="range"
            min="6000"
            max="14000"
            step="200"
            value={simJobCost}
            onChange={(e) => setSimJobCost(Number(e.target.value))}
            style={{
              flex: 1,
              minWidth: '130px',
              accentColor: '#10b981',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            {[7200, 8000, 9500, 11400].map(val => (
              <button
                key={val}
                onClick={() => setSimJobCost(val)}
                style={{
                  background: simJobCost === val ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  border: simJobCost === val ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: simJobCost === val ? '#34d399' : '#cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                £{val / 1000}k
              </button>
            ))}
          </div>
        </div>

        {/* Middle & Right: Margin & BUS Grant Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Target Margin Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Target Margin:</span>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[20, 25, 30].map(m => (
                <button
                  key={m}
                  onClick={() => setSimMarginPct(m)}
                  style={{
                    background: simMarginPct === m ? '#059669' : 'transparent',
                    color: simMarginPct === m ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 9px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {m}%
                </button>
              ))}
            </div>
          </div>

          {/* BUS Grant Category Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>BUS Category:</span>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setSimBusGrant(7500)}
                style={{
                  background: simBusGrant === 7500 ? '#059669' : 'transparent',
                  color: simBusGrant === 7500 ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                £7,500 Standard
              </button>
              <button
                onClick={() => setSimBusGrant(9000)}
                style={{
                  background: simBusGrant === 9000 ? '#d97706' : 'transparent',
                  color: simBusGrant === 9000 ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                £9,000 Off-Gas Uplift
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setSimJobCost(8000);
              setSimMarginPct(25);
              setSimBusGrant(7500);
            }}
            title="Reset to Golden Test Benchmark"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem'
            }}
          >
            <RefreshCw size={12} /> Reset Benchmark
          </button>
        </div>
      </div>

      {/* 4 Canva-Style Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '22px'
      }}>
        {/* Card 1: Total Job Cost */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
            1. Total Job Cost
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            £{simJobCost.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
            Equipment + Labour + Extras (ex VAT)
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#94a3b8' }} />
        </div>

        {/* Card 2: Government BUS Grant */}
        <div style={{
          background: 'rgba(5, 150, 105, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#34d399', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
            2. BUS Grant Subsidy
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
            £{simBusGrant.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#a7f3d0', marginTop: '4px' }}>
            Covers {(Number(grantSharePct || 0)).toFixed(1)}% of Required Revenue
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#10b981' }} />
        </div>

        {/* Card 3: Customer Out-of-Pocket Contribution */}
        <div style={{
          background: 'rgba(217, 119, 6, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
            3. Customer Contribution
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em' }}>
            £{customerContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#fde68a', marginTop: '4px' }}>
            MAX(0, Revenue − BUS) • Net Quote to Homeowner
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#f59e0b' }} />
        </div>

        {/* Card 4: Net Delivered Gross Profit */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(96, 165, 250, 0.35)',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.04em' }}>
              4. Delivered Gross Profit
            </span>
            <span style={{
              fontSize: '0.7rem',
              background: '#2563eb',
              color: '#ffffff',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 800
            }}>
              {(Number(grossMarginPercent || 0)).toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.02em' }}>
            £{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#bfdbfe', marginTop: '4px' }}>
            Revenue (£{actualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}) − Job Cost
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#3b82f6' }} />
        </div>
      </div>

      {/* TAB 1: VISUAL WATERFALL & STACKED CHARTS */}
      {activeTab === 'CHARTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Chart Section A: Revenue Composition Stacked Progress Bars (Canva Style) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc' }}>
                  A. Revenue Funding Composition (How the £{actualRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} is paid)
                </span>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Government Grant subsidy vs Customer out-of-pocket payment
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981', display: 'inline-block' }} />
                  BUS Grant: <strong>{(Number(grantSharePct || 0)).toFixed(1)}%</strong> (£{simBusGrant.toLocaleString()})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b', display: 'inline-block' }} />
                  Customer Pays: <strong>{(Number(custSharePct || 0)).toFixed(1)}%</strong> (£{customerContribution.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                </span>
              </div>
            </div>

            {/* Stacked Bar 1 */}
            <div style={{
              width: '100%',
              height: '24px',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
            }}>
              <div
                style={{
                  width: `${grantSharePct}%`,
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  transition: 'width 0.3s ease'
                }}
                title={`BUS Grant: £${simBusGrant} (${(Number(grantSharePct || 0)).toFixed(1)}%)`}
              >
                {grantSharePct > 18 ? `BUS Grant £${simBusGrant.toLocaleString()} (${(Number(grantSharePct || 0)).toFixed(1)}%)` : ''}
              </div>
              <div
                style={{
                  width: `${custSharePct}%`,
                  background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  transition: 'width 0.3s ease'
                }}
                title={`Customer Contribution: £${(Number(customerContribution || 0)).toFixed(2)} (${(Number(custSharePct || 0)).toFixed(1)}%)`}
              >
                {custSharePct > 15 ? `Customer £${customerContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''}
              </div>
            </div>

            {/* Bar 2: Cost vs Margin Breakdown */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                  B. Cost of Goods vs True Margin Share
                </span>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#64748b', display: 'inline-block' }} />
                    Job Cost: <strong>{(Number(costSharePct || 0)).toFixed(1)}%</strong> (£{simJobCost.toLocaleString()})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6', display: 'inline-block' }} />
                    Gross Profit: <strong>{(Number(profitSharePct || 0)).toFixed(1)}%</strong> (£{grossProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                  </span>
                </div>
              </div>

              <div style={{
                width: '100%',
                height: '24px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
              }}>
                <div
                  style={{
                    width: `${costSharePct}%`,
                    background: 'linear-gradient(90deg, #475569, #64748b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    transition: 'width 0.3s ease'
                  }}
                >
                  {costSharePct > 15 ? `Total Job Cost £${simJobCost.toLocaleString()} (${(Number(costSharePct || 0)).toFixed(1)}%)` : ''}
                </div>
                <div
                  style={{
                    width: `${profitSharePct}%`,
                    background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    transition: 'width 0.3s ease'
                  }}
                >
                  {profitSharePct > 10 ? `Profit £${grossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${(Number(profitSharePct || 0)).toFixed(1)}%)` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section B: Canva-Style Flow / Waterfall Visualizer */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc' }}>
                  C. Commercial Margin Waterfall Flow
                </span>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Step-by-step financial translation from job cost to homeowner invoice
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, background: 'rgba(52,211,153,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                Formula Verified: Profit = £{grossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({(Number(grossMarginPercent || 0)).toFixed(1)}%)
              </span>
            </div>

            {/* Waterfall Flow Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              alignItems: 'stretch'
            }}>
              {/* Step 1 */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>STEP 1 • BASE COST</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>Total Job Cost</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Materials, labour, ASHP & cylinders</div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                    £{simJobCost.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{
                background: 'rgba(37, 99, 235, 0.12)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 700 }}>STEP 2 • TARGET MARGIN</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd', marginTop: '2px' }}>+ Required Gross Profit</div>
                  <div style={{ fontSize: '0.72rem', color: '#bfdbfe', marginTop: '4px' }}>Configured {simMarginPct}% profit factor</div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>
                    +£{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#e2e8f0', fontWeight: 700 }}>STEP 3 • TOTAL REVENUE</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>= Required Revenue</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Job Cost / (1 − {targetMargin})</div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                    £{requiredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>STEP 4 • BUS VOUCHER</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a7f3d0', marginTop: '2px' }}>− Government Grant</div>
                  <div style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '4px' }}>Statutory Boiler Upgrade Voucher</div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                    −£{simBusGrant.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>STEP 5 • HOMEOWNER QUOTE</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fde68a', marginTop: '2px' }}>= Customer Contribution</div>
                  <div style={{ fontSize: '0.72rem', color: '#fcd34d', marginTop: '4px' }}>Net payable by homeowner</div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
                    £{customerContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CANVA-STYLE SCENARIO MATRIX TABLE */}
      {activeTab === 'TABLE' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Canva Scenario Matrix — Commercial Tiers ({simMarginPct}% Margin Target)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Predictive viability table across typical UK residential installation sizes with £{simBusGrant.toLocaleString()} BUS Grant
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, background: 'rgba(52,211,153,0.15)', padding: '3px 8px', borderRadius: '4px' }}>
              Deterministic True Margin
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 700 }}>Installation Archetype</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: 700 }}>Total Job Cost</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>BUS Voucher</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#fbbf24', fontWeight: 700 }}>Customer Pays</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#f8fafc', fontWeight: 700 }}>Total Revenue</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#60a5fa', fontWeight: 700 }}>Delivered Profit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#34d399', fontWeight: 700 }}>True Margin</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>Commercial Viability</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((row, idx) => {
                  const isSimMatch = Math.abs(row.jobCost - simJobCost) < 400;
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSimJobCost(row.jobCost)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isSimMatch ? 'rgba(16, 185, 129, 0.12)' : idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{row.archetype}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{row.scope}</div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#e2e8f0' }}>
                        £{row.jobCost.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                        £{row.busGrant.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#fbbf24' }}>
                        £{row.customerContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                        £{row.requiredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#60a5fa' }}>
                        £{row.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(52, 211, 153, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.75rem'
                        }}>
                          {(Number(row?.marginPercent || 0)).toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: row.viability === 'EXCELLENT'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : row.viability === 'HIGH'
                            ? 'rgba(59, 130, 246, 0.2)'
                            : row.viability === 'CORE'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                          color: row.viability === 'EXCELLENT'
                            ? '#34d399'
                            : row.viability === 'HIGH'
                            ? '#93c5fd'
                            : row.viability === 'CORE'
                            ? '#fcd34d'
                            : '#fca5a5',
                          border: `1px solid ${
                            row.viability === 'EXCELLENT'
                              ? 'rgba(52, 211, 153, 0.3)'
                              : row.viability === 'HIGH'
                              ? 'rgba(96, 165, 250, 0.3)'
                              : row.viability === 'CORE'
                              ? 'rgba(245, 158, 11, 0.3)'
                              : 'rgba(239, 68, 68, 0.3)'
                          }`
                        }}>
                          {row.badgeLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDITED MATHEMATICAL SPECIFICATION & PROOF */}
      {activeTab === 'FORMULAS' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck color="#34d399" size={20} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Audited Deterministic True Gross Margin Formula
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
              Deterministic Engine • Rule COMMERCIAL_TRUE_MARGIN_FORMULA
            </span>
          </div>

          <p style={{ fontSize: '0.8125rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 12px 0' }}>
            Prime Energy UK prices domestic heat pump installations using <strong>True Target Gross Margin</strong> math, ensuring revenue delivers the configured profit margin after accounting for Boiler Upgrade Scheme (BUS) grant funding:
          </p>

          <div style={{
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            borderRadius: '10px',
            padding: '16px 20px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.85rem',
            color: '#34d399',
            lineHeight: '1.9'
          }}>
            <div>1. Required Revenue = Total Job Cost / (1 − Target Gross Margin)</div>
            <div>2. Customer Contribution = MAX(0, Required Revenue − BUS Grant)</div>
            <div>3. Actual Revenue = BUS Grant + Customer Contribution</div>
            <div>4. Gross Profit = Actual Revenue − Total Job Cost</div>
            <div>5. Gross Margin % = (Gross Profit / Actual Revenue) × 100</div>
          </div>

          {/* Golden Test Banner */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(52, 211, 153, 0.08)',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#34d399" />
              <span><strong>Golden Test Verification:</strong> Cost £8,000 @ 25% Margin</span>
            </div>
            <div>• Required Revenue: <strong>£10,666.67</strong></div>
            <div>• BUS Grant: <strong>£7,500.00</strong></div>
            <div>• Customer Contribution: <strong>£3,166.67</strong></div>
            <div>• Gross Profit: <strong>£2,666.67</strong></div>
            <div>• Gross Margin: <strong style={{ color: '#34d399' }}>25.0%</strong></div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Status Footnote */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        marginTop: '18px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '0.75rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} color="#34d399" />
          <span>Active Simulation: <strong>Cost £{simJobCost.toLocaleString()} @ {simMarginPct}% Margin</strong> with <strong>£{simBusGrant.toLocaleString()} BUS Grant</strong></span>
        </div>
        <div>
          Delivering: <strong>£{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Profit ({(Number(grossMarginPercent || 0)).toFixed(1)}% True Margin)</strong>
        </div>
      </div>
    </div>
  );
};

