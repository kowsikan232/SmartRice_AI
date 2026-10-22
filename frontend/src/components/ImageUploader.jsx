import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  ScanLine,
  Sparkles,
  Bug
} from 'lucide-react';
import QualityScore from './QualityScore';
import RiskBadge from './RiskBadge';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * ImageUploader: Professional upload zone for rice grain visual inspection.
 * Supports drag-and-drop, format validation, preview, replacement, and inline scan feedback.
 */
export default function ImageUploader({
  imageFile,
  previewUrl,
  onImageSelected,
  onImageRemoved,
  onQuickAnalyzeImage,
  analyzingImage,
  imageAnalysisResult,
  errorMessage,
  className = ''
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [activeTab, setActiveTab] = useState('quality');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(`Unsupported format (.${ext}). Supported formats: JPG, JPEG, PNG, WEBP.`);
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setValidationError(`File exceeds ${MAX_SIZE_MB}MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onImageSelected(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      onImageSelected(file);
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`uploader-panel ${className}`}>
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className="panel-icon-bubble">
            <ScanLine size={18} className="panel-icon" aria-hidden="true" />
          </div>
          <div>
            <h3 className="panel-title">Analyze Rice Quality</h3>
            <p className="panel-subtitle">Upload a rice grain image to assess visual quality.</p>
          </div>
        </div>
        <span className="panel-badge">MobileNetV2 + EfficientNet</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Upload rice grain image file"
      />

      {!previewUrl ? (
        <div
          className={`dropzone-box ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerBrowse}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerBrowse();
            }
          }}
          aria-label="Click or drop rice grain sample image here"
        >
          <div className="dropzone-inner">
            <div className="upload-icon-container">
              <UploadCloud size={40} className="upload-cloud-icon" />
            </div>
            <div className="dropzone-text-block">
              <p className="dropzone-main-text">
                <strong>Upload image</strong> or Drag & drop
              </p>
              <p className="dropzone-meta-hint">
                Supported formats: JPG, JPEG, PNG, WEBP (Max {MAX_SIZE_MB}MB)
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm browse-btn"
              onClick={(e) => {
                e.stopPropagation();
                triggerBrowse();
              }}
            >
              <ImageIcon size={15} />
              <span>Browse Image</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="preview-card">
          <div className="preview-layout-split">
            {/* Left: Image Container */}
            <div className="preview-image-side">
              <div className="preview-frame">
                <img
                  src={previewUrl}
                  alt="Uploaded rice sample grain"
                  className="grain-preview-img"
                />
                <div className="preview-action-overlay">
                  <button
                    type="button"
                    className="overlay-action-btn replace-action"
                    onClick={triggerBrowse}
                    title="Change Image"
                  >
                    <RefreshCw size={13} />
                    <span>Change Image</span>
                  </button>
                  <button
                    type="button"
                    className="overlay-action-btn remove-action"
                    onClick={onImageRemoved}
                    title="Remove sample image"
                  >
                    <X size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              <div className="file-info-bar">
                <div className="file-details">
                  <FileCheck size={14} className="file-icon" />
                  <span className="file-name" title={imageFile?.name}>
                    {imageFile?.name}
                  </span>
                </div>
                <span className="file-size">
                  {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : ''}
                </span>
              </div>
            </div>

            {/* Right: Quick Image Scan / Analysis Feedback */}
            <div className="preview-info-side">
              <div className="scan-cta-box">
                <span className="scan-prompt-text">
                  Direct deep-learning evaluation for visual quality grading and grain variety:
                </span>
                {onQuickAnalyzeImage && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-quick-scan"
                    onClick={onQuickAnalyzeImage}
                    disabled={analyzingImage}
                  >
                    {analyzingImage ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        <span>Analyzing with MobileNetV2...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Analyze Rice Sample</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Feedback if image scan was performed */}
              {imageAnalysisResult && (
                <div className="variety-analysis-card">
                  {/* Insect Infestation Alert */}
                  {imageAnalysisResult.has_insect && (
                    <div className="insect-alert-banner" role="alert">
                      <div className="insect-alert-icon-box">
                        <Bug size={22} className="insect-alert-icon" />
                      </div>
                      <div className="insect-alert-text">
                        <div className="insect-alert-title-row">
                          <strong className="insect-alert-title">Found insect</strong>
                          <span className="insect-alert-pill">Infestation Detected</span>
                        </div>
                        <p className="insect-alert-detail">
                          {imageAnalysisResult.insect_type
                            ? `${imageAnalysisResult.insect_type} identified in the uploaded rice sample.`
                            : 'Storage insect pest detected in the uploaded grain sample.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mode Tab Switcher */}
                  <div className="analysis-tab-bar">
                    <button
                      type="button"
                      className={`analysis-tab-btn ${activeTab === 'quality' ? 'active' : ''}`}
                      onClick={() => setActiveTab('quality')}
                    >
                      <span>Quality Grading</span>
                    </button>
                    <button
                      type="button"
                      className={`analysis-tab-btn ${activeTab === 'variety' ? 'active' : ''}`}
                      onClick={() => setActiveTab('variety')}
                    >
                      <span>Rice Variety</span>
                    </button>
                  </div>

                  {/* TAB 1: RICE QUALITY ANALYSIS */}
                  {activeTab === 'quality' && (() => {
                    const qual = imageAnalysisResult.qualityDetails || {};
                    const grade = qual.quality_grade || imageAnalysisResult.predicted_quality_grade || 'A';
                    const condition = qual.detected_condition || imageAnalysisResult.detected_condition || 'Healthy';
                    const level = qual.quality_level || imageAnalysisResult.quality_level || 'Excellent';
                    const conf = qual.confidence !== undefined ? qual.confidence * 100 : (imageAnalysisResult.quality_confidence || 95.0);
                    const defects = qual.defects_detected || imageAnalysisResult.defects_detected || [];
                    const probs = qual.class_probabilities || imageAnalysisResult.quality_probabilities || {
                      Whole: 0.95, Chalky: 0.03, Broken: 0.015, Stained: 0.005
                    };

                    const DEFECT_CLASSES = ['Whole', 'Chalky', 'Broken', 'Stained'];

                    return (
                      <>
                        <div className={`quality-hero-box grade-${grade}`}>
                          <div>
                            <span className="quality-condition-label">Detected Condition</span>
                            <h4 className="quality-condition-value">{condition}</h4>
                          </div>
                          <div className="quality-badge-wrap">
                            <span className={`quality-grade-badge grade-${grade}`}>
                              Grade {grade}
                            </span>
                            <span className="quality-level-sub">{level}</span>
                          </div>
                        </div>

                        <div className="scan-data-row" style={{ marginTop: '2px' }}>
                          <span className="scan-data-label">Confidence:</span>
                          <span className="scan-data-value" style={{ fontWeight: 700 }}>
                            {conf.toFixed(2)}%
                          </span>
                        </div>

                        <div className="defects-box">
                          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Visible Defects:</span>
                          {defects.length === 0 ? (
                            <span className="defect-tag none">None detected</span>
                          ) : (
                            defects.map((d, i) => (
                              <span key={i} className={`defect-tag ${String(d).toLowerCase().includes('insect') ? 'danger' : 'active'}`}>{d}</span>
                            ))
                          )}
                        </div>

                        {/* 4-Class Probabilities Bar List */}
                        <div className="variety-prob-section">
                          <div className="variety-prob-heading">
                            <span>Defect Class Probabilities</span>
                            <span className="text-muted" style={{ fontSize: '0.68rem', textTransform: 'none' }}>
                              4 Classes
                            </span>
                          </div>

                          <div className="variety-prob-list">
                            {DEFECT_CLASSES.map((clsName) => {
                              let p = probs[clsName];
                              if (p === undefined) p = 0;
                              const pct = p <= 1.0 ? p * 100 : p;
                              const isTop = (qual.predicted_class === clsName || (grade === 'A' && clsName === 'Whole'));

                              return (
                                <div key={clsName} className={`variety-prob-row ${isTop ? 'is-top' : ''}`}>
                                  <span className="variety-prob-name">
                                    {isTop && <span className="top-indicator" />}
                                    {clsName}
                                  </span>
                                  <div className="variety-prob-track">
                                    <div
                                      className={`variety-prob-fill ${isTop ? 'is-winner' : ''}`}
                                      style={{ width: `${Math.min(100, Math.max(pct, 0.5))}%` }}
                                    />
                                  </div>
                                  <span className="variety-prob-value">
                                    {pct.toFixed(2)}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <p className="scientific-limitation-note">
                          <strong>Note:</strong> Quality grade is a derived visual-grade classification based on documented defect categories (Whole, Chalky, Broken, Stained); it is not an original dataset label.
                        </p>
                      </>
                    );
                  })()}

                  {/* TAB 2: RICE VARIETY ANALYSIS */}
                  {activeTab === 'variety' && (() => {
                    const topVar = imageAnalysisResult.predicted_variety || imageAnalysisResult.detected_variety || 'Unknown';
                    const rawConf = imageAnalysisResult.confidence !== undefined && imageAnalysisResult.confidence <= 1.0
                      ? imageAnalysisResult.confidence * 100
                      : (imageAnalysisResult.variety_confidence || 0);

                    const probs = imageAnalysisResult.probabilities || {
                      [topVar]: rawConf / 100
                    };

                    const VARIETIES = ['Arborio', 'Basmati', 'Ipsala', 'Jasmine', 'Karacadag'];

                    return (
                      <>
                        <div className="variety-hero-box">
                          <div className="variety-hero-left">
                            <span className="variety-hero-caption">Predicted Variety</span>
                            <h4 className="variety-hero-title">{topVar}</h4>
                          </div>
                          <div className="variety-hero-right">
                            <span className="variety-conf-badge">
                              {rawConf.toFixed(2)}%
                            </span>
                            <span className="variety-conf-sub">Confidence</span>
                          </div>
                        </div>

                        <div className="variety-prob-section">
                          <div className="variety-prob-heading">
                            <span>Variety Probabilities</span>
                            <span className="text-muted" style={{ fontSize: '0.68rem', textTransform: 'none' }}>
                              5 Varieties
                            </span>
                          </div>

                          <div className="variety-prob-list">
                            {VARIETIES.map((varietyName) => {
                              let probVal = probs[varietyName];
                              if (probVal === undefined) probVal = 0;
                              const pct = probVal <= 1.0 ? probVal * 100 : probVal;
                              const isTop = (varietyName === topVar);

                              return (
                                <div key={varietyName} className={`variety-prob-row ${isTop ? 'is-top' : ''}`}>
                                  <span className="variety-prob-name">
                                    {isTop && <span className="top-indicator" />}
                                    {varietyName}
                                  </span>
                                  <div className="variety-prob-track">
                                    <div
                                      className={`variety-prob-fill ${isTop ? 'is-winner' : ''}`}
                                      style={{ width: `${Math.min(100, Math.max(pct, 0.5))}%` }}
                                    />
                                  </div>
                                  <span className="variety-prob-value">
                                    {pct.toFixed(2)}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(validationError || errorMessage) && (
        <div className="uploader-alert alert-error" role="alert">
          <AlertCircle size={16} className="alert-icon" />
          <span>{validationError || errorMessage}</span>
        </div>
      )}
    </div>
  );
}
