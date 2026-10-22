import React from 'react';
import { Calendar, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

/**
 * ChartCard: Container for industrial & agricultural AI analytics.
 */
export default function ChartCard({
  title,
  subtitle,
  children,
  badge,
  action,
  className = ''
}) {
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-card-header">
        <div className="chart-header-left">
          <h4 className="chart-title">{title}</h4>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        <div className="chart-header-right">
          {badge && <span className="chart-badge">{badge}</span>}
          {action}
        </div>
      </div>
      <div className="chart-card-body">
        {children}
      </div>
    </div>
  );
}

/**
 * PredictionActivityChart: Shows real recent prediction history activity timeline.
 */
export function PredictionActivityChart({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>No prediction activity recorded yet.</p>
      </div>
    );
  }

  // Take the last 8 records reversed for chronological display
  const recentRecords = [...history].slice(0, 8).reverse();

  return (
    <div className="activity-chart-container">
      <div className="activity-bars-grid">
        {recentRecords.map((r, idx) => {
          // Normalize shelf life height between 20% and 100%
          const shelfLife = Number(r.shelf_life_days || 0);
          const heightPct = Math.min(100, Math.max(22, (shelfLife / 240) * 100));
          const isHighRisk = (r.spoilage_risk || '').toLowerCase().includes('high');
          const isMedRisk = (r.spoilage_risk || '').toLowerCase().includes('med');
          const barColorClass = isHighRisk ? 'bar-danger' : isMedRisk ? 'bar-warning' : 'bar-success';

          const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `Batch #${r.id}`;

          return (
            <div key={r.id || idx} className="activity-col" title={`ID #${r.id} (${r.rice_variety}): ${shelfLife}d shelf-life, Quality: ${r.final_quality}`}>
              <div className="activity-bar-track">
                <div
                  className={`activity-bar-fill ${barColorClass}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="activity-bar-label">{dateStr}</span>
              <span className="activity-bar-val">{shelfLife}d</span>
            </div>
          );
        })}
      </div>
      <div className="chart-metric-legend">
        <span className="legend-item"><span className="legend-dot good-dot"></span> Optimal (Low Risk)</span>
        <span className="legend-item"><span className="legend-dot med-dot"></span> Medium Risk</span>
        <span className="legend-item"><span className="legend-dot poor-dot"></span> High Risk</span>
      </div>
    </div>
  );
}

/**
 * QualityDistributionChart: Shows real breakdown of evaluations from database.
 */
export function QualityDistributionChart({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>No historical evaluations recorded yet.</p>
      </div>
    );
  }

  const counts = { good: 0, medium: 0, poor: 0 };
  history.forEach((h) => {
    const q = (h.final_quality || '').toLowerCase();
    if (q.includes('good') || q.includes('grade a') || q.includes('high')) counts.good++;
    else if (q.includes('med') || q.includes('grade b') || q.includes('c')) counts.medium++;
    else counts.poor++;
  });

  const total = history.length;
  const goodPct = Math.round((counts.good / total) * 100);
  const medPct = Math.round((counts.medium / total) * 100);
  const poorPct = Math.max(0, 100 - goodPct - medPct);

  return (
    <div className="distribution-chart-wrapper">
      <div className="stacked-progress-bar">
        {goodPct > 0 && (
          <div
            className="bar-segment good-segment"
            style={{ width: `${goodPct}%` }}
            title={`Good Quality: ${counts.good} (${goodPct}%)`}
          />
        )}
        {medPct > 0 && (
          <div
            className="bar-segment med-segment"
            style={{ width: `${medPct}%` }}
            title={`Medium Quality: ${counts.medium} (${medPct}%)`}
          />
        )}
        {poorPct > 0 && (
          <div
            className="bar-segment poor-segment"
            style={{ width: `${poorPct}%` }}
            title={`Poor / At Risk: ${counts.poor} (${poorPct}%)`}
          />
        )}
      </div>

      <div className="distribution-legend">
        <div className="legend-row">
          <div className="legend-left">
            <span className="legend-dot good-dot"></span>
            <span className="legend-label">Good Quality:</span>
          </div>
          <span className="legend-val"><strong>{counts.good}</strong> ({goodPct}%)</span>
        </div>
        <div className="legend-row">
          <div className="legend-left">
            <span className="legend-dot med-dot"></span>
            <span className="legend-label">Medium Quality:</span>
          </div>
          <span className="legend-val"><strong>{counts.medium}</strong> ({medPct}%)</span>
        </div>
        <div className="legend-row">
          <div className="legend-left">
            <span className="legend-dot poor-dot"></span>
            <span className="legend-label">Poor / Degraded:</span>
          </div>
          <span className="legend-val"><strong>{counts.poor}</strong> ({poorPct}%)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * SpoilageRiskBreakdown: Shows real distribution of Spoilage Risk levels.
 */
export function SpoilageRiskBreakdown({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>No records available.</p>
      </div>
    );
  }

  let lowCount = 0;
  let medCount = 0;
  let highCount = 0;

  history.forEach((h) => {
    const r = (h.spoilage_risk || '').toLowerCase();
    if (r.includes('high')) highCount++;
    else if (r.includes('med')) medCount++;
    else lowCount++;
  });

  const total = history.length;
  const lowPct = Math.round((lowCount / total) * 100);
  const medPct = Math.round((medCount / total) * 100);
  const highPct = Math.max(0, 100 - lowPct - medPct);

  return (
    <div className="spoilage-risk-breakdown">
      <div className="risk-level-bar-group">
        {/* Low Risk */}
        <div className="risk-row">
          <div className="risk-row-header">
            <div className="risk-tag-group">
              <CheckCircle2 size={14} className="text-emerald" />
              <span className="risk-title">Low Risk (Safe)</span>
            </div>
            <span className="risk-stat">{lowCount} batches ({lowPct}%)</span>
          </div>
          <div className="risk-bar-track">
            <div className="risk-bar-fill fill-low" style={{ width: `${lowPct}%` }} />
          </div>
        </div>

        {/* Medium Risk */}
        <div className="risk-row">
          <div className="risk-row-header">
            <div className="risk-tag-group">
              <AlertTriangle size={14} className="text-amber" />
              <span className="risk-title">Medium Risk (Monitor)</span>
            </div>
            <span className="risk-stat">{medCount} batches ({medPct}%)</span>
          </div>
          <div className="risk-bar-track">
            <div className="risk-bar-fill fill-med" style={{ width: `${medPct}%` }} />
          </div>
        </div>

        {/* High Risk */}
        <div className="risk-row">
          <div className="risk-row-header">
            <div className="risk-tag-group">
              <AlertCircle size={14} className="text-rose" />
              <span className="risk-title">High Risk (Spoilage Hazard)</span>
            </div>
            <span className="risk-stat">{highCount} batches ({highPct}%)</span>
          </div>
          <div className="risk-bar-track">
            <div className="risk-bar-fill fill-high" style={{ width: `${highPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * StorageConditionBars: Visualizes storage variables against standard agricultural limits.
 */
export function StorageConditionBars({
  temperature = 25.0,
  humidity = 60.0,
  moisture = 13.0,
  storageDays = 30
}) {
  const metrics = [
    {
      label: 'Grain Moisture Content',
      val: Number(moisture),
      unit: '%',
      safeMax: 14.0,
      min: 8,
      max: 24,
      isDanger: Number(moisture) > 14.0,
      isWarning: Number(moisture) > 13.5 && Number(moisture) <= 14.0,
      standard: 'Safe Limit: ≤ 14.0%'
    },
    {
      label: 'Ambient Temperature',
      val: Number(temperature),
      unit: '°C',
      safeMax: 25.0,
      min: 10,
      max: 45,
      isDanger: Number(temperature) > 30.0,
      isWarning: Number(temperature) > 25.0 && Number(temperature) <= 30.0,
      standard: 'Optimal: 18 - 25°C'
    },
    {
      label: 'Relative Humidity',
      val: Number(humidity),
      unit: '%',
      safeMax: 65.0,
      min: 20,
      max: 95,
      isDanger: Number(humidity) > 70.0,
      isWarning: Number(humidity) > 65.0 && Number(humidity) <= 70.0,
      standard: 'Safe Limit: ≤ 65%'
    },
    {
      label: 'Storage Duration',
      val: Number(storageDays),
      unit: 'Days',
      safeMax: 90,
      min: 0,
      max: 240,
      isDanger: Number(storageDays) > 180,
      isWarning: Number(storageDays) > 90 && Number(storageDays) <= 180,
      standard: 'Standard Cycle: ≤ 90d'
    }
  ];

  return (
    <div className="storage-condition-bars">
      {metrics.map((m, idx) => {
        const pct = Math.min(100, Math.max(0, ((m.val - m.min) / (m.max - m.min)) * 100));
        const safeThresholdPct = Math.min(100, Math.max(0, ((m.safeMax - m.min) / (m.max - m.min)) * 100));
        const statusClass = m.isDanger ? 'status-danger' : m.isWarning ? 'status-warning' : 'status-safe';
        const statusText = m.isDanger ? 'Critical' : m.isWarning ? 'Caution' : 'Optimal';

        return (
          <div key={idx} className="condition-bar-row">
            <div className="bar-label-group">
              <div className="label-with-standard">
                <span className="bar-param-name">{m.label}</span>
                <span className="bar-standard-hint">{m.standard}</span>
              </div>
              <div className="bar-reading-group">
                <span className="bar-current-val">
                  {m.val} {m.unit}
                </span>
                <span className={`bar-status-chip ${statusClass}`}>{statusText}</span>
              </div>
            </div>

            <div className="bar-track" title={`Value: ${m.val}${m.unit} (Safe limit: ${m.safeMax}${m.unit})`}>
              <div
                className={`bar-fill ${statusClass}`}
                style={{ width: `${pct}%` }}
              />
              <div
                className="bar-safe-marker"
                style={{ left: `${safeThresholdPct}%` }}
                title={`Safe threshold: ${m.safeMax}${m.unit}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
