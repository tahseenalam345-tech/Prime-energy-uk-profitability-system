import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtext, icon, highlight }) => {
  return (
    <div className={`metric-card ${highlight ? 'highlighted' : ''}`} style={highlight ? { borderColor: 'var(--primary)', background: 'var(--primary-light)' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="metric-label">{label}</div>
        {icon && <div style={{ color: 'var(--primary)' }}>{icon}</div>}
      </div>
      <div className="metric-value" style={highlight ? { color: 'var(--primary)' } : {}}>
        {value}
      </div>
      {subtext && <div className="metric-subtext">{subtext}</div>}
    </div>
  );
};
