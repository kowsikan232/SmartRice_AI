import React, { useState } from 'react';
import {
  X,
  Calendar,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import QualityScore from './QualityScore';
import RiskBadge from './RiskBadge';
import { createReportDataObject, generateSmartRicePDF } from '../services/pdfExportService';

/**
 * RecordDetailModal: Shows comprehensive parameters and predictions
 * for a single stored evaluation record from the SQLite database.
 */
export default function RecordDetailModal({ record, onClose }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');

  if (!record) return null;

  const handleExportPDF = async () => {
    if (isExporting || !record) return;

    setIsExporting(true);
    setExportMessage('');
    setExportError('');

    try {
      const reportData = createReportDataObject({
        results: record,
        imageSrc: record.image_url || null,
        formData: {
          variety: record.rice_variety,
          temperature: record.temperature,
          humidity: record.humidity,
          moisture: record.moisture_content,
          storageDays: record.storage_days
        }
      });

      await generateSmartRicePDF(reportData);
      setExportMessage('PDF report downloaded successfully.');

      setTimeout(() => {
        setExportMessage('');
      }, 5000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setExportError('Unable to generate the PDF report. Please try again.');
      setTimeout(() => {
        setExportError('');
      }, 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-detail-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-eyebrow">AUDIT RECORD #{record.id}</span>
            <h3 className="modal-title">{record.rice_variety} Evaluation Details</h3>
          </div>
          <div className="modal-header-actions">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              title="Download record as PDF report"
            >
              <Download size={14} />
              <span>{isExporting ? 'Generating PDF...' : 'Export PDF'}</span>
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close record modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {exportMessage && (
          <div className="export-banner alert-success" style={{ margin: '10px 16px 0' }} role="status">
            <CheckCircle2 size={15} />
            <span>{exportMessage}</span>
          </div>
        )}

        {exportError && (
          <div className="export-banner alert-error" style={{ margin: '10px 16px 0' }} role="alert">
            <AlertTriangle size={15} />
            <span>{exportError}</span>
          </div>
        )}

        <div className="modal-body">
          {/* Header Metadata */}
          <div className="detail-meta-banner">
            <div className="meta-banner-item">
              <Calendar size={14} className="meta-banner-icon" />
              <span>Timestamp: <strong>{formatDate(record.timestamp)}</strong></span>
            </div>
            <div className="meta-banner-item">
              <ImageIcon size={14} className="meta-banner-icon" />
              <span>
                Image Analysis:{' '}
                <strong>{record.has_image ? 'Processed' : 'None (Storage Only)'}</strong>
              </span>
            </div>
          </div>

          {/* Primary Results Summary */}
          <div className="detail-metrics-grid">
            <div className="detail-metric-box">
              <span className="box-label">Quality Grade</span>
              <QualityScore quality={record.final_quality} size="md" />
              {record.overall_confidence && (
                <span className="box-sub">{record.overall_confidence}% Confidence</span>
              )}
            </div>

            <div className="detail-metric-box">
              <span className="box-label">Spoilage Risk</span>
              <RiskBadge risk={record.spoilage_risk || 'Low'} size="md" />
            </div>

            <div className="detail-metric-box">
              <span className="box-label">Remaining Shelf-Life</span>
              <div className="metric-large-text">
                <strong>{record.shelf_life_days}</strong> <span className="unit-label">Days</span>
              </div>
            </div>

            <div className="detail-metric-box">
              <span className="box-label">Recommended Price</span>
              <div className="metric-large-text">
                {record.recommended_price ? `₹${record.recommended_price}/kg` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Stored Environmental Parameters */}
          <div className="detail-section">
            <h4 className="detail-section-title">Recorded Storage Parameters</h4>
            <div className="parameters-table-view">
              <div className="param-item">
                <span className="param-label">Temperature:</span>
                <span className="param-val">{record.temperature}°C</span>
              </div>
              <div className="param-item">
                <span className="param-label">Relative Humidity:</span>
                <span className="param-val">{record.humidity}% RH</span>
              </div>
              <div className="param-item">
                <span className="param-label">Grain Moisture:</span>
                <span className="param-val">{record.moisture_content}%</span>
              </div>
              <div className="param-item">
                <span className="param-label">Storage Duration:</span>
                <span className="param-val">{record.storage_days} Days</span>
              </div>
            </div>
          </div>

          {/* Computer Vision Record if available */}
          {record.has_image && (
            <div className="detail-section">
              <h4 className="detail-section-title">Computer Vision Output</h4>
              {record.image_url && (
                <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                  <img
                    src={record.image_url}
                    alt="Analyzed sample"
                    style={{
                      maxHeight: '180px',
                      maxWidth: '100%',
                      borderRadius: '8px',
                      objectFit: 'contain',
                      border: '1px solid var(--border-color, #334155)'
                    }}
                  />
                </div>
              )}
              <div className="parameters-table-view">
                <div className="param-item">
                  <span className="param-label">Identified Variety:</span>
                  <span className="param-val">{record.detected_variety || 'Basmati'}</span>
                </div>
                <div className="param-item">
                  <span className="param-label">Image Quality Pred:</span>
                  <span className="param-val">{record.image_quality || 'Good'}</span>
                </div>
                {record.image_confidence && (
                  <div className="param-item">
                    <span className="param-label">CNN Confidence:</span>
                    <span className="param-val">{record.image_confidence}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
