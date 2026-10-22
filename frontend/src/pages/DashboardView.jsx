import React, { useState } from 'react';
import {
  Award,
  AlertTriangle,
  Clock,
  Database,
  ArrowRight,
  Sparkles,
  Sliders,
  Calendar,
  Eye,
  CheckCircle2,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import ChartCard, {
  PredictionActivityChart,
  QualityDistributionChart,
  SpoilageRiskBreakdown,
  StorageConditionBars
} from '../components/ChartCard';
import QualityScore from '../components/QualityScore';
import RiskBadge from '../components/RiskBadge';
import RecordDetailModal from '../components/RecordDetailModal';

/**
 * DashboardView: Professional commercial AI agriculture overview.
 * 100% data-driven from real Supabase / database records.
 */
export default function DashboardView({
  history = [],
  formData,
  latestResult,
  onNavigateTab
}) {
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Compute 100% genuine statistics from Supabase history
  const totalAnalyses = history.length;

  // 1. Average Quality / Dominant Grade
  let goodQualityCount = 0;
  let totalShelfLife = 0;
  let validShelfLifeCount = 0;
  let highRiskCount = 0;

  history.forEach((h) => {
    const q = (h.final_quality || '').toLowerCase();
    if (q.includes('good') || q.includes('grade a') || q.includes('high')) {
      goodQualityCount++;
    }
    if (h.shelf_life_days !== null && h.shelf_life_days !== undefined) {
      const s = Number(h.shelf_life_days);
      if (!isNaN(s) && s > 0) {
        totalShelfLife += s;
        validShelfLifeCount++;
      }
    }
    const r = (h.spoilage_risk || '').toLowerCase();
    if (r.includes('high')) {
      highRiskCount++;
    }
  });

  const qualityRate = totalAnalyses > 0 ? Math.round((goodQualityCount / totalAnalyses) * 100) : null;
  const avgShelfLifeDays = validShelfLifeCount > 0 ? (totalShelfLife / validShelfLifeCount).toFixed(1) : null;

  return (
    <div className="dashboard-view-container">
      {/* Top Welcome & Overview Header */}
      <div className="dashboard-hero-header">
        <div className="hero-text-col">
          <h2 className="dashboard-page-heading">SmartRice Overview</h2>
          <p className="dashboard-page-subheading">
            Monitor rice quality, storage conditions and prediction insights.
          </p>
        </div>
        <div className="hero-actions-col">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateTab('rice-analysis')}
          >
            <Sparkles size={14} />
            <span>New Rice Analysis</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards (Derived from real Supabase data) */}
      <section className="metrics-grid-row" aria-label="Key Performance Indicators">
        {/* Total Predictions */}
        <MetricCard
          title="Total Predictions"
          value={totalAnalyses}
          subtitle="Stored in Supabase database"
          icon={Database}
          variant="default"
          badge="Audit Trail"
          onClick={() => onNavigateTab('history')}
        />

        {/* Average Quality */}
        <MetricCard
          title="Average Quality"
          value={qualityRate !== null ? `${qualityRate}%` : 'No Data'}
          unit={qualityRate !== null ? 'Good' : ''}
          subtitle={qualityRate !== null ? `${goodQualityCount} of ${totalAnalyses} rated Good` : 'Run analysis to compute'}
          icon={Award}
          variant="success"
          badge="Grading Model"
          onClick={() => onNavigateTab('reports')}
        />

        {/* High Spoilage Risk */}
        <MetricCard
          title="High Spoilage Risk"
          value={highRiskCount}
          unit="Batches"
          subtitle={highRiskCount === 0 ? 'All warehouse batches within safe bounds' : 'Requires immediate storage intervention'}
          icon={AlertTriangle}
          variant={highRiskCount > 0 ? 'danger' : 'success'}
          badge={highRiskCount === 0 ? 'Safe' : 'Alert'}
          onClick={() => onNavigateTab('predictions')}
        />

        {/* Average Shelf Life */}
        <MetricCard
          title="Average Shelf Life"
          value={avgShelfLifeDays !== null ? avgShelfLifeDays : 'No Data'}
          unit={avgShelfLifeDays !== null ? 'Days' : ''}
          subtitle="Mean estimated preservation life"
          icon={Clock}
          variant="info"
          badge="RF Regressor"
          onClick={() => onNavigateTab('predictions')}
        />
      </section>

      {/* Two-Column Analytics Layout */}
      <div className="dashboard-content-split">
        {/* LEFT COLUMN: Prediction Activity Chart */}
        <div className="dash-column-main">
          <ChartCard
            title="Prediction Activity"
            subtitle="Recent grain evaluations and estimated shelf-life timeline"
            badge="Actual Records"
          >
            <PredictionActivityChart history={history} />
          </ChartCard>

          {/* Environmental Limits Card */}
          <ChartCard
            title="Storage Environmental Safe Limits"
            subtitle="Reference safety thresholds for grain preservation (Moisture ≤ 14%, Temp ≤ 25°C, RH ≤ 65%)"
            badge="Standard Limits"
          >
            <StorageConditionBars
              temperature={formData?.temperature ?? 24.5}
              humidity={formData?.humidity ?? 58.0}
              moisture={formData?.moisture ?? 12.8}
              storageDays={formData?.storageDays ?? 30}
            />
          </ChartCard>
        </div>

        {/* RIGHT COLUMN: Quality Distribution & Spoilage Risk */}
        <div className="dash-column-side">
          {/* Quality Distribution */}
          <ChartCard
            title="Quality Distribution"
            subtitle="Breakdown of recorded batches by quality grading"
            badge={`Total: ${totalAnalyses}`}
          >
            <QualityDistributionChart history={history} />
          </ChartCard>

          {/* Spoilage Risk Breakdown */}
          <ChartCard
            title="Spoilage Risk"
            subtitle="Vulnerability distribution across Low, Medium, and High hazard levels"
            badge="Multi-Variable"
          >
            <SpoilageRiskBreakdown history={history} />
          </ChartCard>
        </div>
      </div>

      {/* Recent Predictions Table Section */}
      <section className="recent-evaluations-section">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">Recent Predictions</h3>
            <p className="section-subtitle">Latest samples recorded into Supabase PostgreSQL database</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => onNavigateTab('history')}
          >
            <span>View All ({totalAnalyses})</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="empty-history-banner">
            <p>No predictions yet. Run your first analysis to populate recent activity.</p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="industrial-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Rice Variety</th>
                  <th>Quality</th>
                  <th>Spoilage Risk</th>
                  <th>Shelf Life</th>
                  <th>Confidence</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="date-flex">
                        <Calendar size={13} className="date-icon" />
                        <span>
                          {r.timestamp
                            ? new Date(r.timestamp).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{r.rice_variety}</strong>
                    </td>
                    <td>
                      <QualityScore quality={r.final_quality} size="sm" />
                    </td>
                    <td>
                      <RiskBadge risk={r.spoilage_risk || 'Low'} size="sm" />
                    </td>
                    <td>
                      <strong>{r.shelf_life_days}</strong> Days
                    </td>
                    <td>
                      {r.overall_confidence ? `${r.overall_confidence}%` : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm btn-icon-only"
                        onClick={() => setSelectedRecord(r)}
                        title="View details & parameters"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Record Inspect Modal */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
