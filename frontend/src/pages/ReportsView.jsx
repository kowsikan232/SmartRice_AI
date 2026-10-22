import React, { useState } from 'react';
import ChartCard, { QualityDistributionChart } from '../components/ChartCard';
import MetricCard from '../components/MetricCard';
import {
  FileText,
  Download,
  FileCode,
  Layers,
  AlertTriangle,
  Clock,
  Droplets,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Inbox
} from 'lucide-react';
import QualityScore from '../components/QualityScore';
import RiskBadge from '../components/RiskBadge';
import { createReportDataObject, generateSmartRicePDF } from '../services/pdfExportService';

/**
 * ReportsView: Executive summary & aggregated analytics report.
 * Provides Prediction Summary, Quality Summary, Spoilage Summary, and Shelf-Life Summary
 * along with direct PDF and JSON audit exports.
 */
export default function ReportsView({ history = [] }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState('');
  const [exportErrorMessage, setExportErrorMessage] = useState('');

  const total = history.length;

  // 1. Prediction Summary calculations
  const multimodalCount = history.filter((h) => h.has_image || h.image_url).length;
  const storageOnlyCount = total - multimodalCount;
  const uniqueVarieties = Array.from(new Set(history.map((h) => h.rice_variety).filter(Boolean)));
  const latestRecordDate = total > 0 && history[0]?.timestamp
    ? new Date(history[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

  // 2. Quality Summary calculations
  const goodQualityCount = history.filter((h) => (h.final_quality || '').toLowerCase() === 'good').length;
  const mediumQualityCount = history.filter((h) => (h.final_quality || '').toLowerCase() === 'medium').length;
  const poorQualityCount = history.filter((h) => (h.final_quality || '').toLowerCase() === 'poor').length;
  const goodQualityPct = total > 0 ? Math.round((goodQualityCount / total) * 100) : 0;

  // 3. Spoilage Summary calculations
  const lowRiskCount = history.filter((h) => (h.spoilage_risk || '').toLowerCase().includes('low')).length;
  const mediumRiskCount = history.filter((h) => (h.spoilage_risk || '').toLowerCase().includes('medium')).length;
  const highRiskCount = history.filter((h) => (h.spoilage_risk || '').toLowerCase().includes('high')).length;
  const highRiskPct = total > 0 ? Math.round((highRiskCount / total) * 100) : 0;

  // 4. Shelf-Life Summary calculations
  const shelfLifeValues = history.map((h) => Number(h.shelf_life_days) || 0).filter((v) => v > 0);
  const avgShelfLife = shelfLifeValues.length > 0
    ? (shelfLifeValues.reduce((a, b) => a + b, 0) / shelfLifeValues.length).toFixed(1)
    : '0';
  const minShelfLife = shelfLifeValues.length > 0 ? Math.min(...shelfLifeValues).toFixed(0) : '0';
  const maxShelfLife = shelfLifeValues.length > 0 ? Math.max(...shelfLifeValues).toFixed(0) : '0';

  // PDF Export
  const handleExportPDF = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportSuccessMessage('');
    setExportErrorMessage('');

    try {
      const activeRecord = history.length > 0 ? history[0] : {
        rice_variety: 'Basmati',
        temperature: 24.5,
        humidity: 58.0,
        moisture_content: 12.8,
        storage_days: 30,
        final_quality: 'Good',
        spoilage_risk: highRiskCount > 0 ? 'Medium' : 'Low',
        shelf_life_days: Number(avgShelfLife) || 120.0,
        overall_confidence: 88.5
      };

      const reportData = createReportDataObject({
        results: activeRecord,
        formData: {
          variety: activeRecord.rice_variety,
          temperature: activeRecord.temperature,
          humidity: activeRecord.humidity,
          moisture: activeRecord.moisture_content,
          storageDays: activeRecord.storage_days
        }
      });

      await generateSmartRicePDF(reportData);
      setExportSuccessMessage('PDF report downloaded successfully.');

      setTimeout(() => {
        setExportSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setExportErrorMessage('Unable to generate the PDF report. Please try again.');
      setTimeout(() => {
        setExportErrorMessage('');
      }, 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // JSON Export
  const handleExportJSON = () => {
    try {
      const exportPayload = {
        exportDate: new Date().toISOString(),
        application: 'SmartRice AI Analytics Platform',
        summary: {
          totalPredictions: total,
          avgShelfLifeDays: avgShelfLife,
          goodQualityPercentage: `${goodQualityPct}%`,
          highRiskCount: highRiskCount,
          varietiesEvaluated: uniqueVarieties
        },
        records: history
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smartrice_audit_report_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMessage('JSON audit data downloaded successfully.');
      setTimeout(() => setExportSuccessMessage(''), 4000);
    } catch (err) {
      console.error('JSON export error:', err);
      setExportErrorMessage('Failed to export JSON report.');
      setTimeout(() => setExportErrorMessage(''), 4000);
    }
  };

  if (total === 0) {
    return (
      <div className="reports-view-container">
        <div className="reports-header-strip">
          <div className="reports-title-group">
            <div className="reports-icon-box">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="reports-title">Reports & Quality Summaries</h2>
              <p className="reports-subtitle">
                Statistical summaries and audit exports for warehouse grain storage evaluations.
              </p>
            </div>
          </div>
        </div>

        <div className="empty-state-card" style={{ padding: '64px 24px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '20px' }}>
          <Inbox size={42} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#1f2937', marginBottom: '6px' }}>Reports will appear after your first analysis.</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '420px', margin: '0 auto' }}>
            Run your first rice grain image or storage condition evaluation to generate aggregate quality distribution and spoilage risk analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-view-container">
      {/* Top Banner with Main Action: Export PDF, Secondary: Export JSON */}
      <div className="reports-header-strip">
        <div className="reports-title-group">
          <div className="reports-icon-box">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="reports-title">Storage Quality & Risk Reports</h2>
            <p className="reports-subtitle">
              Comprehensive statistical summaries and audit exports based on real evaluations.
            </p>
          </div>
        </div>

        <div className="reports-actions">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleExportJSON}
            title="Download complete audit records as JSON"
          >
            <FileCode size={14} />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleExportPDF}
            disabled={isExporting}
            title="Download comprehensive PDF report"
          >
            <Download size={14} />
            <span>{isExporting ? 'Generating report...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Export Notifications / Feedback */}
      {exportSuccessMessage && (
        <div className="export-banner alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {exportErrorMessage && (
        <div className="export-banner alert-error" role="alert">
          <AlertTriangle size={16} />
          <span>{exportErrorMessage}</span>
        </div>
      )}

      {/* 4 Summary Cards Grid */}
      <div className="reports-summary-cards-grid">
        {/* 1. Prediction Summary */}
        <div className="summary-block-card">
          <div className="summary-block-header">
            <div className="summary-icon-wrap icon-primary">
              <Layers size={18} />
            </div>
            <div>
              <span className="summary-eyebrow">OVERVIEW</span>
              <h4 className="summary-card-title">Prediction Summary</h4>
            </div>
          </div>
          <div className="summary-main-val">
            <span className="val-number">{total}</span>
            <span className="val-unit">Total Analyses</span>
          </div>
          <div className="summary-meta-list">
            <div className="meta-row">
              <span className="meta-k">Multimodal (Image+Env):</span>
              <strong className="meta-v">{multimodalCount}</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Storage Condition Only:</span>
              <strong className="meta-v">{storageOnlyCount}</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Active Varieties:</span>
              <strong className="meta-v">{uniqueVarieties.length} types</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Latest Analysis:</span>
              <strong className="meta-v">{latestRecordDate}</strong>
            </div>
          </div>
        </div>

        {/* 2. Quality Summary */}
        <div className="summary-block-card">
          <div className="summary-block-header">
            <div className="summary-icon-wrap icon-success">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="summary-eyebrow">QUALITY GRADING</span>
              <h4 className="summary-card-title">Quality Summary</h4>
            </div>
          </div>
          <div className="summary-main-val">
            <span className="val-number text-forest">{goodQualityPct}%</span>
            <span className="val-unit">Good Quality Ratio</span>
          </div>
          <div className="summary-meta-list">
            <div className="meta-row">
              <span className="meta-k">Good Grade:</span>
              <strong className="meta-v text-emerald">{goodQualityCount} batches</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Medium Grade:</span>
              <strong className="meta-v text-amber">{mediumQualityCount} batches</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Poor Grade:</span>
              <strong className="meta-v text-danger">{poorQualityCount} batches</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Quality Standard:</span>
              <strong className="meta-v">AI Visual + Tabular</strong>
            </div>
          </div>
        </div>

        {/* 3. Spoilage Summary */}
        <div className="summary-block-card">
          <div className="summary-block-header">
            <div className="summary-icon-wrap icon-amber">
              <AlertTriangle size={18} />
            </div>
            <div>
              <span className="summary-eyebrow">RISK ASSESSMENT</span>
              <h4 className="summary-card-title">Spoilage Summary</h4>
            </div>
          </div>
          <div className="summary-main-val">
            <span className={`val-number ${highRiskCount > 0 ? 'text-danger' : 'text-emerald'}`}>
              {highRiskCount}
            </span>
            <span className="val-unit">High Risk Incidents</span>
          </div>
          <div className="summary-meta-list">
            <div className="meta-row">
              <span className="meta-k">Low Risk (Safe):</span>
              <strong className="meta-v text-emerald">{lowRiskCount} ({total > 0 ? Math.round((lowRiskCount / total) * 100) : 0}%)</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Medium Risk (Warning):</span>
              <strong className="meta-v text-amber">{mediumRiskCount} ({total > 0 ? Math.round((mediumRiskCount / total) * 100) : 0}%)</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">High Risk (Critical):</span>
              <strong className="meta-v text-danger">{highRiskCount} ({highRiskPct}%)</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Spoilage Index:</span>
              <strong className="meta-v">{highRiskCount > 0 ? 'Action Required' : 'Optimal'}</strong>
            </div>
          </div>
        </div>

        {/* 4. Shelf-Life Summary */}
        <div className="summary-block-card">
          <div className="summary-block-header">
            <div className="summary-icon-wrap icon-info">
              <Clock size={18} />
            </div>
            <div>
              <span className="summary-eyebrow">STORAGE HORIZON</span>
              <h4 className="summary-card-title">Shelf-Life Summary</h4>
            </div>
          </div>
          <div className="summary-main-val">
            <span className="val-number">{avgShelfLife}</span>
            <span className="val-unit">Avg. Days Remaining</span>
          </div>
          <div className="summary-meta-list">
            <div className="meta-row">
              <span className="meta-k">Shortest Shelf Life:</span>
              <strong className="meta-v">{minShelfLife} days</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Longest Shelf Life:</span>
              <strong className="meta-v">{maxShelfLife} days</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Safe Storage Baseline:</span>
              <strong className="meta-v">≤ 14.0% Moisture</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Model Type:</span>
              <strong className="meta-v">Tabular Regressor</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Analytical Charts */}
      <div className="reports-charts-grid">
        {/* Quality Distribution */}
        <ChartCard
          title="Quality Grade Distribution"
          subtitle="Proportion of grain batches classified into Good, Medium, and Poor"
          badge={`Total: ${total}`}
        >
          <QualityDistributionChart history={history} />
        </ChartCard>

        {/* Moisture Safety Compliance Analysis */}
        <ChartCard
          title="Moisture Safety Standard Compliance"
          subtitle="Comparison of evaluated records against standard safe threshold (14.0%)"
          badge="Safety Threshold"
        >
          <div className="compliance-breakdown-box">
            {(() => {
              const safeCount = history.filter((h) => Number(h.moisture_content || 0) <= 14.0).length;
              const excessCount = total - safeCount;
              const safePct = Math.round((safeCount / total) * 100);
              const excessPct = 100 - safePct;

              return (
                <div>
                  <div className="compliance-ratio-bar">
                    <div className="ratio-segment safe-bar" style={{ width: `${safePct}%` }}>
                      {safePct > 15 && `${safePct}% Safe`}
                    </div>
                    <div className="ratio-segment excess-bar" style={{ width: `${excessPct}%` }}>
                      {excessPct > 15 && `${excessPct}% High Moisture`}
                    </div>
                  </div>

                  <div className="compliance-legend-row">
                    <div className="comp-item">
                      <CheckCircle2 size={15} className="text-emerald" />
                      <span>Within Safe Limit (≤14%):</span>
                      <strong>{safeCount} batches ({safePct}%)</strong>
                    </div>
                    <div className="comp-item">
                      <AlertTriangle size={15} className="text-danger" />
                      <span>Exceeds Limit (&gt;14%):</span>
                      <strong>{excessCount} batches ({excessPct}%)</strong>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </ChartCard>
      </div>

      {/* Batch Breakdown Table */}
      <div className="reports-audit-section">
        <div className="audit-section-top">
          <div>
            <h3 className="audit-table-title">Evaluated Batch Log</h3>
            <p className="audit-table-subtitle">Recent grain batch audit records stored in Supabase</p>
          </div>
          <span className="batch-count-pill">{total} Records</span>
        </div>

        <div className="table-responsive-wrapper">
          <table className="industrial-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Rice Variety</th>
                <th>Quality</th>
                <th>Spoilage Risk</th>
                <th>Shelf Life</th>
                <th>Moisture</th>
                <th>Temperature</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td><strong>{h.rice_variety}</strong></td>
                  <td><QualityScore quality={h.final_quality} size="sm" /></td>
                  <td><RiskBadge risk={h.spoilage_risk || 'Low'} size="sm" /></td>
                  <td><strong>{h.shelf_life_days}</strong> <span className="cell-unit">days</span></td>
                  <td className={Number(h.moisture_content) > 14 ? 'text-danger font-semibold' : ''}>
                    {h.moisture_content}%
                  </td>
                  <td>{h.temperature}°C</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
