import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, HelpCircle } from 'lucide-react';

interface BadgeProps {
  type?: 'bus' | 'confidence' | 'grade' | 'recommendation' | 'status' | 'custom';
  value?: string | null;
}

export const Badge: React.FC<BadgeProps> = ({ type = 'custom', value }) => {
  const displayVal = value != null ? String(value) : '';
  const val = displayVal.trim().toUpperCase();

  if (!val) {
    return <span className="badge badge-neutral">—</span>;
  }

  // BUS Badges
  if (type === 'bus' || val === 'PASS' || val === 'FAIL' || val === 'UNCERTAIN') {
    if (val === 'PASS') {
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={13} /> BUS ELIGIBLE
        </span>
      );
    }
    if (val === 'FAIL') {
      return (
        <span className="badge badge-danger">
          <XCircle size={13} /> BUS INELIGIBLE
        </span>
      );
    }
    return (
      <span className="badge badge-warning">
        <HelpCircle size={13} /> BUS UNCERTAIN
      </span>
    );
  }

  // Confidence Badges
  if (type === 'confidence' || val === 'HIGH' || val === 'MEDIUM' || val === 'LOW' || val === 'SURVEY-CONFIRMED') {
    if (val === 'HIGH' || val === 'SURVEY-CONFIRMED') {
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={13} /> {val}
        </span>
      );
    }
    if (val === 'MEDIUM') {
      return (
        <span className="badge badge-info">
          <Info size={13} /> MEDIUM CONFIDENCE
        </span>
      );
    }
    return (
      <span className="badge badge-warning">
        <AlertTriangle size={13} /> LOW CONFIDENCE
      </span>
    );
  }

  // Profitability Grade Badges
  if (type === 'grade' || ['A+', 'A', 'B', 'C', 'D', 'F'].includes(val)) {
    const colors: Record<string, string> = {
      'A+': '#047857',
      'A': '#059669',
      'B': '#10b981', // Clean vibrant green matching target commercial margin (>=25%)
      'C': '#f59e0b',
      'D': '#f97316',
      'F': '#ef4444'
    };
    return (
      <span
        className={`badge-grade badge-grade-${val.toLowerCase().replace('+', 'plus')}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          backgroundColor: colors[val] || '#6b7280',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.75rem',
          lineHeight: 1,
          flexShrink: 0
        }}
      >
        {val}
      </span>
    );
  }

  // Commercial Recommendation Badges
  if (type === 'recommendation') {
    if (val.includes('PROCEED WITH CAUTION')) {
      return <span className="badge badge-warning"><AlertTriangle size={13} /> {displayVal}</span>;
    }
    if (val.includes('DO NOT PROCEED')) {
      return <span className="badge badge-danger"><XCircle size={13} /> {displayVal}</span>;
    }
    if (val.includes('SURVEY REQUIRED') || val.includes('CUSTOMER CONTRIBUTION')) {
      return <span className="badge badge-info"><Info size={13} /> {displayVal}</span>;
    }
    return <span className="badge badge-success"><CheckCircle2 size={13} /> {displayVal}</span>;
  }

  return <span className="badge badge-neutral">{displayVal}</span>;
};
