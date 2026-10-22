import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

/**
 * RiskBadge: Accessible visual indicator for spoilage risk.
 * Never relies on color alone — includes distinct icons, text labels, and semantic aria attributes.
 */
export default function RiskBadge({ risk, size = 'md', className = '' }) {
  const norm = (risk || '').toLowerCase().trim();

  let riskLevel = 'Unknown';
  let variant = 'unknown';
  let Icon = HelpCircle;
  let label = 'Unknown Risk';

  if (norm.includes('low')) {
    riskLevel = 'Low';
    variant = 'low';
    Icon = ShieldCheck;
    label = 'Low Spoilage Risk (Safe)';
  } else if (norm.includes('med')) {
    riskLevel = 'Medium';
    variant = 'medium';
    Icon = AlertTriangle;
    label = 'Medium Spoilage Risk (Monitor)';
  } else if (norm.includes('high') || norm.includes('poor') || norm.includes('spoil')) {
    riskLevel = 'High';
    variant = 'high';
    Icon = AlertOctagon;
    label = 'High Spoilage Risk (Critical)';
  }

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  return (
    <span
      className={`risk-badge risk-${variant} size-${size} ${className}`}
      role="status"
      aria-label={label}
      title={label}
    >
      <Icon size={iconSize} className="badge-icon" aria-hidden="true" />
      <span className="badge-text">{riskLevel.toUpperCase()} RISK</span>
    </span>
  );
}
