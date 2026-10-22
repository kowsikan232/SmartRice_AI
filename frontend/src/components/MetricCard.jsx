import React from 'react';

/**
 * MetricCard: Reusable top-level analytical card.
 * Displays primary numerical/categorical metrics with iconography,
 * contextual subtext, and industrial dashboard styling.
 */
export default function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  variant = 'default', // 'default' | 'success' | 'warning' | 'danger' | 'info'
  badge,
  onClick,
  className = ''
}) {
  return (
    <div
      className={`metric-card metric-${variant} ${onClick ? 'clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="metric-card-top">
        <div className="metric-icon-box">
          {Icon && <Icon size={20} className="metric-icon" aria-hidden="true" />}
        </div>
        {badge && <span className="metric-header-badge">{badge}</span>}
      </div>

      <div className="metric-card-body">
        <span className="metric-title">{title}</span>
        <div className="metric-value-row">
          <span className="metric-value">{value}</span>
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
        {subtitle && <p className="metric-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
