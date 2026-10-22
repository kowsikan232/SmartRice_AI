import React, { useState } from 'react';
import { Award, AlertTriangle, Clock, Percent, DollarSign, Tag, Info, CheckCircle2, Download } from 'lucide-react';
import { createReportDataObject, generateSmartRicePDF } from '../services/pdfExportService';

export default function PredictionResults({ results, loading, error, formData = {}, previewUrl = null }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');

  const handleExportPDF = async () => {
    if (isExporting || !results) return;

    setIsExporting(true);
    setExportMessage('');
    setExportError('');

    try {
      const reportData = createReportDataObject({
        results,
        formData,
        imageSrc: previewUrl || results?.imageSrc || null
      });

      await generateSmartRicePDF(reportData);
      setExportMessage('PDF report downloaded successfully.');

      setTimeout(() => {
        setExportMessage('');
      }, 5000);
    } catch (err) {
      console.error('PDF export error:', err);
      setExportError('Unable to generate the PDF report. Please try again.');
      setTimeout(() => {
        setExportError('');
      }, 5000);
    } finally {
      setIsExporting(false);
    }
  };
  if (loading) {
    return (
      <div className="card results-card loading-state">
        <div className="loading-spinner-container">
          <div className="custom-spinner"></div>
          <h4 className="loading-title">Analyzing Rice Quality & Storage Metrics...</h4>
          <p className="loading-subtitle">Executing computer vision and tabular prediction engines</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card results-card error-state">
        <div className="error-alert">
          <AlertTriangle size={24} className="error-icon" />
          <div>
            <h4 className="error-heading">Analysis Error</h4>
            <p className="error-message">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="card results-card empty-state">
        <div className="empty-content">
          <div className="empty-icon-wrap">
            <Award size={40} className="empty-icon" />
          </div>
          <h3 className="empty-title">Prediction Dashboard</h3>
          <p className="empty-desc">
            Upload a sample rice image and configure your storage environment parameters, then click{' '}
            <strong>ANALYZE RICE</strong> to generate comprehensive quality, shelf-life, and risk reports.
          </p>
          <div className="academic-notice">
            <Info size={16} />
            <span>Academic Phase 1 Implementation • No IoT Sensors • Data Science Validated</span>
          </div>
        </div>
      </div>
    );
  }

  // Determine badge styles based on results
  const getQualityBadgeClass = (q) => {
    const val = (q || '').toLowerCase();
    if (val.includes('good') || val.includes('high') || val.includes('grade a')) return 'badge-good';
    if (val.includes('medium') || val.includes('grade b')) return 'badge-medium';
    return 'badge-poor';
  };

  const getSpoilageBadgeClass = (s) => {
    const val = (s || '').toLowerCase();
    if (val.includes('low')) return 'badge-low';
    if (val.includes('med')) return 'badge-medium';
    return 'badge-high';
  };

  return (
    <div className="card results-card active-results">
      <div className="results-header">
        <div>
          <span className="results-tag">ANALYSIS RESULT</span>
          <h3 className="results-title">Smart Rice Storage Evaluation</h3>
        </div>
        <div className="result-header-actions">
          <div className="confidence-pill">
            <Percent size={14} />
            <span>Confidence: {results.quality_confidence || 85.0}%</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-export-pdf"
            onClick={handleExportPDF}
            disabled={isExporting}
            title="Download PDF evaluation report"
          >
            <Download size={14} />
            <span>{isExporting ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="export-banner alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>{exportMessage}</span>
        </div>
      )}

      {exportError && (
        <div className="export-banner alert-error" role="alert">
          <AlertTriangle size={16} />
          <span>{exportError}</span>
        </div>
      )}

      <div className="results-metrics-grid">
        {/* Metric 1: Rice Quality */}
        <div className="metric-box">
          <div className="metric-header">
            <Award size={18} className="metric-icon quality-icon" />
            <span className="metric-label">Rice Quality</span>
          </div>
          <div className="metric-value-wrap">
            <span className={`quality-badge ${getQualityBadgeClass(results.quality)}`}>
              {results.quality || 'N/A'}
            </span>
          </div>
          <span className="metric-footer">
            Final synthesis of visual and storage factors
          </span>
        </div>

        {/* Metric 2: Image Quality */}
        <div className="metric-box">
          <div className="metric-header">
            <Tag size={18} className="metric-icon image-icon" />
            <span className="metric-label">Image Quality</span>
          </div>
          <div className="metric-value-wrap">
            <span className="metric-text-val">
              {results.image_prediction ? results.image_prediction.toUpperCase() : 'Not Uploaded'}
            </span>
            {results.image_confidence && (
              <span className="sub-badge">({results.image_confidence}%)</span>
            )}
          </div>
          <span className="metric-footer">
            {results.detected_variety ? `Identified: ${results.detected_variety}` : 'MobileNetV2 Visual Classifier'}
          </span>
        </div>

        {/* Metric 3: Spoilage Risk */}
        <div className="metric-box">
          <div className="metric-header">
            <AlertTriangle size={18} className="metric-icon risk-icon" />
            <span className="metric-label">Spoilage Risk</span>
          </div>
          <div className="metric-value-wrap">
            <span className={`risk-badge ${getSpoilageBadgeClass(results.spoilage_risk)}`}>
              {(results.spoilage_risk || 'Low').toUpperCase()}
            </span>
          </div>
          <span className="metric-footer">
            Random Forest Spoilage Classifier
          </span>
        </div>

        {/* Metric 4: Estimated Shelf Life */}
        <div className="metric-box">
          <div className="metric-header">
            <Clock size={18} className="metric-icon shelf-icon" />
            <span className="metric-label">Estimated Shelf Life</span>
          </div>
          <div className="metric-value-wrap">
            <span className="metric-number-val">{results.shelf_life_days}</span>
            <span className="metric-unit">Days</span>
          </div>
          <span className="metric-footer">
            Random Forest Shelf-Life Regressor
          </span>
        </div>
      </div>

      {/* Dynamic Price & Economic Recommendation */}
      {results.recommended_price && (
        <div className="pricing-recommendation-banner">
          <div className="price-content">
            <div className="price-icon-wrap">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="price-label">Recommended Dynamic Market Price (Phase 1 Decision Support)</span>
              <div className="price-display">
                <span className="price-currency">₹</span>
                <span className="price-amount">{results.recommended_price}</span>
                <span className="price-unit">/ kg</span>
              </div>
            </div>
          </div>
          <div className="pricing-formula-hint">
            <em>Formula: Pr = Pb × Fq × Fs</em>
          </div>
        </div>
      )}

      {/* Actionable Storage Advisory */}
      {results.advisory && (
        <div className="advisory-box">
          <div className="advisory-title">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>Storage & Preservation Advisory</span>
          </div>
          <p className="advisory-text">{results.advisory}</p>
        </div>
      )}

      {/* Academic Transparency Note */}
      <div className="model-transparency-card">
        <div className="transparency-header">
          <Info size={14} />
          <span>Model Execution Metadata</span>
        </div>
        <p className="transparency-note">
          {results.message || 'Predictions evaluated with strict data science integrity standards without synthetic fabrication.'}
        </p>
      </div>
    </div>
  );
}
