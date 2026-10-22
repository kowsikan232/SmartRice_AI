import React from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  Cpu,
  FileCode,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

/**
 * ModelStatusModal: Transparent machine learning diagnostic dialog.
 * Accurately displays real availability, model types, evaluation accuracy,
 * and academic zero-fabrication standards.
 */
export default function ModelStatusModal({ isOpen, onClose, modelStatus, onRefresh }) {
  if (!isOpen) return null;

  const models = modelStatus?.models || {};

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-model-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-bubble">
              <Cpu size={20} className="modal-icon text-forest" />
            </div>
            <div>
              <h3 className="modal-title">ML & DL Architecture Diagnostics</h3>
              <p className="modal-subtitle">Phase 1 Academic Machine Learning Model Readiness</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Academic Integrity Banner */}
          <div className="academic-compliance-banner">
            <ShieldCheck size={18} className="compliance-icon" />
            <div>
              <strong>Academic Data Science Integrity:</strong>
              <p>
                Zero synthetic data fabrication. When real tabular datasets or weights are not yet trained,
                models cleanly report "Dataset Required" rather than generating fabricated outputs.
              </p>
            </div>
          </div>

          {/* Model Status Cards */}
          <div className="models-diagnostic-list">
            {Object.entries(models).map(([key, model]) => (
              <div
                key={key}
                className={`model-card-box ${model.available ? 'is-available' : 'is-pending'}`}
              >
                <div className="model-box-top">
                  <div className="model-box-identity">
                    <span className="model-algo-chip">{model.type}</span>
                    <h4 className="model-box-name">{model.name}</h4>
                  </div>
                  <div className={`model-status-indicator ${model.available ? 'online' : 'needs-data'}`}>
                    {model.available ? (
                      <>
                        <CheckCircle size={14} />
                        <span>Available / Trained</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        <span>Dataset Required</span>
                      </>
                    )}
                  </div>
                </div>

                <p className="model-box-desc">{model.description}</p>

                {model.metrics && Object.keys(model.metrics).length > 0 && (
                  <div className="model-metrics-panel">
                    <span className="metrics-label">Trained Evaluation Metrics:</span>
                    <div className="metrics-chips-row">
                      {model.metrics.test_accuracy && (
                        <span className="metric-chip">
                          Accuracy: <strong>{(model.metrics.test_accuracy * 100).toFixed(2)}%</strong>
                        </span>
                      )}
                      {model.metrics.metrics?.mae && (
                        <span className="metric-chip">
                          MAE: <strong>{model.metrics.metrics.mae.toFixed(2)} days</strong>
                        </span>
                      )}
                      {model.metrics.metrics?.r2_score && (
                        <span className="metric-chip">
                          R²: <strong>{model.metrics.metrics.r2_score.toFixed(3)}</strong>
                        </span>
                      )}
                      {model.metrics.classes && (
                        <span className="metric-chip">
                          Classes: {model.metrics.classes.join(', ')}
                        </span>
                      )}
                      {model.metrics.dataset_samples && (
                        <span className="metric-chip">
                          Dataset: {model.metrics.dataset_samples.train} train / {model.metrics.dataset_samples.test} test
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Training Instructions */}
          <div className="training-instructions-panel">
            <div className="inst-header">
              <FileCode size={15} />
              <span>Dataset Locations & Reproducible Training</span>
            </div>
            <p className="inst-summary">
              To train or evaluate models on your dataset in Phase 1:
            </p>
            <pre className="code-pre">
              <code>
{`# 1. Image Model: Place real samples at:
ml/datasets/rice_images/{train,validation,test}/{good,medium,spoiled}
python train_image_model.py

# 2. Tabular Storage Models: Place real CSV at:
ml/datasets/tabular/rice_storage_dataset.csv
python train_quality_model.py
python train_shelf_life_model.py
python train_spoilage_model.py`}
              </code>
            </pre>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh}>
            <RefreshCw size={13} />
            <span>Refresh Diagnostics</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
