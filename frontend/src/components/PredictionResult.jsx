import React, { useState, useEffect } from 'react';
import {
  Award,
  AlertTriangle,
  Clock,
  Percent,
  DollarSign,
  Tag,
  Info,
  CheckCircle2,
  Sparkles,
  Wheat,
  ShieldCheck,
  ArrowRight,
  Download,
  Image as ImageIcon,
  Bug
} from 'lucide-react';
import QualityScore from './QualityScore';
import RiskBadge from './RiskBadge';
import { createReportDataObject, generateSmartRicePDF } from '../services/pdfExportService';

const LOADING_STEPS = [
  'Analyzing rice grain features with MobileNetV2...',
  'Processing storage environmental parameters...',
  'Synthesizing shelf-life and spoilage forecasts...'
];

/**
 * PredictionResult: Professional results display component.
 * Features large visual indicators for Quality, Spoilage Risk, Shelf Life,
 * Dynamic Price recommendation, and actionable preservation advisory.
 */
export default function PredictionResult({
  results,
  loading,
  error,
  onNavigateToHistory,
  formData = {},
  previewUrl = null,
  className = ''
}) {
  const [loadingStep, setLoadingStep] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState('');
  const [exportErrorMessage, setExportErrorMessage] = useState('');

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(interval);
  }, [loading]);

  const handleExportPDF = async () => {
    if (isExporting || !results) return;

    setIsExporting(true);
    setExportSuccessMessage('');
    setExportErrorMessage('');

    try {
      const reportData = createReportDataObject({
        results,
        formData: formData || {},
        imageSrc: previewUrl || results?.image_url || null
      });

      await generateSmartRicePDF(reportData);
      setExportSuccessMessage('PDF report downloaded successfully.');

      setTimeout(() => {
        setExportSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('PDF export error:', err);
      setExportErrorMessage('Unable to generate the PDF report. Please try again.');
      setTimeout(() => {
        setExportErrorMessage('');
      }, 5000);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className={`result-panel state-loading ${className}`} role="status" aria-live="polite">
        <div className="loading-card-content">
          <div className="industrial-spinner-box">
            <div className="custom-progress-ring">
              <span className="spinner-border" />
            </div>
          </div>
          <h4 className="loading-main-heading">{LOADING_STEPS[loadingStep]}</h4>
          <p className="loading-sub-heading">Executing PyTorch MobileNetV2 and Scikit-Learn decision engines</p>
          <div className="loading-step-indicators">
            {LOADING_STEPS.map((step, idx) => (
              <span
                key={idx}
                className={`step-dot ${idx === loadingStep ? 'active' : idx < loadingStep ? 'done' : ''}`}
                title={step}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`result-panel state-error ${className}`} role="alert">
        <div className="error-card-content">
          <div className="error-icon-box">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <h4 className="error-heading">Analysis Encountered an Issue</h4>
          <p className="error-description">
            {typeof error === 'string' ? error : 'Unable to complete the analysis. Please verify inputs and try again.'}
          </p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className={`result-panel state-empty ${className}`}>
        <div className="empty-results-prompt">
          <div className="empty-icon-wrap">
            <Wheat size={32} className="empty-main-icon" aria-hidden="true" />
          </div>
          <h4 className="empty-heading">Ready for Evaluation</h4>
          <p className="empty-subtext">
            Upload a rice sample image on the left or configure storage parameters, then click <strong>"Analyze Rice"</strong> to generate real-time quality and shelf-life predictions.
          </p>

          <div className="empty-capabilities-list">
            <div className="capability-chip">
              <Sparkles size={14} /> MobileNetV2 Quality Classifier
            </div>
            <div className="capability-chip">
              <Wheat size={14} /> Variety Identification
            </div>
            <div className="capability-chip">
              <ShieldCheck size={14} /> Random Forest Shelf-Life & Spoilage
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeImage = previewUrl || results.image_url;
  const varietyDisplay = results.detected_variety || formData.variety || results.rice_variety || 'Basmati';
  const confidenceVal = results.quality_confidence ?? results.overall_confidence ?? results.confidence;

  return (
    <div className={`result-panel state-active ${className}`}>
      {/* Header Bar */}
      <div className="result-header-bar">
        <div className="result-title-group">
          <span className="eval-tag">EVALUATION COMPLETE</span>
          <h3 className="eval-title">Analysis Complete</h3>
        </div>

        <div className="result-header-actions">
          {confidenceVal !== null && confidenceVal !== undefined && (
            <div className="confidence-chip" title="Synthesized confidence across active models">
              <Percent size={14} />
              <span>Confidence: {confidenceVal}%</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm btn-export-pdf"
            onClick={handleExportPDF}
            disabled={isExporting}
            title="Download comprehensive PDF report"
          >
            <Download size={14} />
            <span>{isExporting ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Export Feedback Alerts */}
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

      {/* Critical Insect Infestation Alert */}
      {(results.has_insect || results.insect_detected) && (
        <div className="insect-critical-alert" role="alert">
          <div className="insect-alert-left">
            <div className="insect-badge-icon">
              <Bug size={24} />
            </div>
          </div>
          <div className="insect-alert-main">
            <div className="insect-status-pill">
              <span className="pulse-dot" />
              <span>PEST DETECTED</span>
            </div>
            <h3 className="insect-alert-title">Found insect</h3>
            <p className="insect-alert-subtitle">
              {results.insect_type
                ? `${results.insect_type} identified in the uploaded rice sample. Storage quality is compromised and requires urgent quarantine or fumigation treatment.`
                : 'Storage insect pest detected in the uploaded rice photography.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Results Grid */}
      <div className="results-core-grid">
        {/* Metric 1: Quality */}
        <div className="result-metric-card quality-focus-card">
          <div className="card-top-label">
            <Award size={16} className="metric-icon" aria-hidden="true" />
            <span>QUALITY CONDITION</span>
          </div>
          <div className="card-main-visual">
            <QualityScore
              quality={results.quality}
              confidence={confidenceVal}
              size="lg"
            />
          </div>
          <span className="card-footnote">
            {results.predicted_quality_grade ? `Assigned Grade: ${results.predicted_quality_grade}` : 'Synthesized condition rating'}
          </span>
        </div>

        {/* Metric 2: Spoilage Risk */}
        <div className="result-metric-card">
          <div className="card-top-label">
            <AlertTriangle size={16} className="metric-icon" aria-hidden="true" />
            <span>SPOILAGE RISK</span>
          </div>
          <div className="card-main-visual">
            <RiskBadge risk={results.spoilage_risk || 'Low'} size="lg" />
          </div>
          <span className="card-footnote">
            Evaluated against ambient moisture and temperature
          </span>
        </div>

        {/* Metric 3: Estimated Shelf Life */}
        <div className="result-metric-card">
          <div className="card-top-label">
            <Clock size={16} className="metric-icon" aria-hidden="true" />
            <span>ESTIMATED SHELF LIFE</span>
          </div>
          <div className="card-main-visual">
            <div className="shelf-life-display">
              <span className="shelf-days-num">
                {results.shelf_life_days !== null && results.shelf_life_days !== undefined
                  ? results.shelf_life_days
                  : 'N/A'}
              </span>
              <span className="shelf-days-unit">Days</span>
            </div>
          </div>
          <span className="card-footnote">
            Remaining preservation life in current conditions
          </span>
        </div>

        {/* Metric 4: Variety & Classification */}
        <div className="result-metric-card">
          <div className="card-top-label">
            <Tag size={16} className="metric-icon" aria-hidden="true" />
            <span>RICE VARIETY</span>
          </div>
          <div className="card-main-visual cv-findings-content">
            <div className="cv-item">
              <span className="cv-label">Cultivar:</span>
              <strong className="cv-value">{varietyDisplay}</strong>
            </div>
            {results.variety_confidence && (
              <div className="cv-item">
                <span className="cv-label">ID Match:</span>
                <span className="cv-sub">{results.variety_confidence}% Match</span>
              </div>
            )}
          </div>
          <span className="card-footnote">
            {results.detected_variety ? 'Classified via Computer Vision' : 'Storage profile specification'}
          </span>
        </div>
      </div>

      {/* Image Analysis Section (If image was evaluated) */}
      {activeImage && (
        <div className="result-image-evaluation-card">
          <div className="image-eval-header">
            <ImageIcon size={16} className="text-forest" />
            <h4 className="image-eval-title">Image Analysis Findings</h4>
          </div>
          <div className="image-eval-content-split">
            <div className="image-eval-preview-col">
              <img
                src={activeImage}
                alt="Evaluated rice sample"
                className="image-eval-thumb"
              />
            </div>
            <div className="image-eval-metrics-col">
              <div className="eval-metric-row">
                <span className="eval-metric-lbl">Predicted Variety:</span>
                <span className="eval-metric-val"><strong>{results.detected_variety || varietyDisplay}</strong></span>
              </div>
              {results.image_prediction && (
                <div className="eval-metric-row">
                  <span className="eval-metric-lbl">Visual Quality:</span>
                  <span className="eval-metric-val">{results.image_prediction.toUpperCase()}</span>
                </div>
              )}
              {results.image_confidence && (
                <div className="eval-metric-row">
                  <span className="eval-metric-lbl">Confidence:</span>
                  <span className="eval-metric-val">{results.image_confidence}%</span>
                </div>
              )}
              {results.defects_detected && results.defects_detected.length > 0 && (
                <div className="eval-metric-row">
                  <span className="eval-metric-lbl">Detected Defects:</span>
                  <span className="eval-metric-val">{results.defects_detected.join(', ')}</span>
                </div>
              )}
              <div className="eval-metric-row">
                <span className="eval-metric-lbl">Pest / Insect Check:</span>
                <span className="eval-metric-val">
                  {(results.has_insect || results.insect_detected) ? (
                    <span className="eval-insect-badge detected">
                      <Bug size={14} /> Found insect ({results.insect_type || 'Rice Weevil'})
                    </span>
                  ) : (
                    <span className="eval-insect-badge clean">
                      <ShieldCheck size={14} /> Clean (No insects detected)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Price Recommendation */}
      {results.recommended_price !== null && results.recommended_price !== undefined && (
        <div className="price-recommendation-card">
          <div className="price-card-left">
            <div className="price-symbol-box">
              <DollarSign size={22} aria-hidden="true" />
            </div>
            <div className="price-details-wrap">
              <span className="price-card-title">Dynamic Price Recommendation</span>
              <div className="price-number-row">
                <span className="price-currency">₹</span>
                <span className="price-value">{results.recommended_price}</span>
                <span className="price-per-unit">/ kg</span>
              </div>
            </div>
          </div>
          <div className="price-card-right">
            <span className="formula-tag">Algorithm: Base Price × Quality Index × Shelf-Life Index</span>
          </div>
        </div>
      )}

      {/* Actionable Storage Advisory */}
      {results.advisory && (
        <div className="preservation-advisory-card">
          <div className="advisory-header">
            <CheckCircle2 size={18} className="advisory-icon" aria-hidden="true" />
            <h4 className="advisory-title">Preservation & Storage Advisory</h4>
          </div>
          <p className="advisory-body">{results.advisory}</p>
        </div>
      )}

      {/* Footer Navigation Link */}
      <div className="academic-metadata-strip">
        <Info size={14} className="meta-icon" aria-hidden="true" />
        <span className="meta-text">
          {results.message || 'Data-driven machine learning evaluation verified and synced to Supabase database.'}
        </span>
        {onNavigateToHistory && (
          <button
            type="button"
            className="btn-view-history-link"
            onClick={onNavigateToHistory}
          >
            <span>View in History</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
