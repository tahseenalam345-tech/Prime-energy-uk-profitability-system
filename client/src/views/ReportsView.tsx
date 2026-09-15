import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PoundSterling, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../services/api.js';
import { MetricCard } from '../components/MetricCard.js';

export const ReportsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getDashboardSummary();
        setData(res);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div style={{ padding: '32px' }}>Loading Commercial Reports...</div>;
  }

  const metrics = data?.metrics || {};
  const gradeDistribution = data?.gradeDistribution || [];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Commercial Viability & Margin Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Executive financial performance, BUS grant capture, and gross profit realization metrics.
        </p>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Average Realized Margin"
          value={`${metrics.avgGrossMarginPercent || 25.0}%`}
          subtext="Configured target: 25.0%"
          icon={<TrendingUp size={20} />}
          highlight={true}
        />
        <MetricCard
          label="Total Revenue"
          value={`£${(metrics.totalPipelineRevenue || 0).toLocaleString()}`}
          subtext="Grants + contributions"
          icon={<PoundSterling size={20} />}
        />
        <MetricCard
          label="Total Gross Profit"
          value={`£${(metrics.totalGrossProfit || 0).toLocaleString()}`}
          subtext="Commercial net margin"
          icon={<Zap size={20} />}
        />
        <MetricCard
          label="Total BUS Grants"
          value={`£${(metrics.totalBUSGrantsClaimed || 0).toLocaleString()}`}
          subtext="UK Government incentive capture"
          icon={<ShieldCheck size={20} />}
        />
      </div>

      {/* Grade Distribution Breakdown */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>
          <BarChart3 size={20} color="var(--primary)" /> Profitability Grade Distribution
        </h3>
        <p className="card-subtitle" style={{ marginBottom: '20px' }}>
          Quotes categorized by commercial margin rating (A+: ≥35%, A: 28-34%, B: 20-27%, C: 12-19%, D: 5-11%, F: &lt;5%)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {['A+', 'A', 'B', 'C', 'D', 'F'].map((grade) => {
            const count = gradeDistribution.find((g: any) => g.grade === grade)?.count || 0;
            const total = metrics.totalQuotes || 1;
            const pct = Math.round((count / total) * 100);

            const colors: Record<string, string> = {
              'A+': '#10b981',
              'A': '#059669',
              'B': '#3b82f6',
              'C': '#f59e0b',
              'D': '#f97316',
              'F': '#ef4444'
            };

            return (
              <div key={grade}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: colors[grade],
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      {grade}
                    </span>
                    Grade {grade}
                  </span>
                  <span><strong>{count}</strong> quotes ({pct}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(count > 0 ? 8 : 0, pct)}%`, height: '100%', background: colors[grade], borderRadius: '5px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
