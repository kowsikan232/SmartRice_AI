import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

const VARIETIES = [
  'Basmati',
  'Jasmine',
  'Arborio',
  'Ipsala',
  'Karacadag',
  'Ponni',
  'Sona Masoori',
  'IR64',
  'Other'
];

const PRESETS = [
  {
    name: 'Optimal Basmati Storage',
    tag: 'Optimal',
    variety: 'Basmati',
    temperature: 22.0,
    humidity: 55.0,
    moisture: 12.5,
    storageDays: 30,
    co2: 450,
    o2: 20.8
  },
  {
    name: 'High-Moisture Spoilage Risk',
    tag: 'High Risk',
    variety: 'Jasmine',
    temperature: 32.5,
    humidity: 78.0,
    moisture: 16.2,
    storageDays: 90,
    co2: 950,
    o2: 17.5
  },
  {
    name: 'Extended Ambient Storage',
    tag: 'Ambient',
    variety: 'Ponni',
    temperature: 28.0,
    humidity: 65.0,
    moisture: 13.8,
    storageDays: 150,
    co2: 600,
    o2: 19.5
  }
];

/**
 * StorageForm: Storage environment parameters input form.
 * Provides professional inputs with units, validation, helper hints,
 * preset demo scenarios, and optional gas composition fields.
 */
export default function StorageForm({
  formData,
  onChange,
  onApplyPreset,
  onSubmit,
  isAnalyzing,
  detectedVariety,
  submitButtonText = 'Analyze Storage',
  className = ''
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const moisture = Number(formData.moisture);
  const temp = Number(formData.temperature);
  const humidity = Number(formData.humidity);

  return (
    <div className={`storage-form-panel ${className}`}>
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className="panel-icon-bubble">
            <Sliders size={18} className="panel-icon" aria-hidden="true" />
          </div>
          <div>
            <h3 className="panel-title">Storage Environment Parameters</h3>
            <p className="panel-subtitle">Manually entered storage conditions (Phase 1 NO-IoT)</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="preset-selector-group">
          <span className="preset-legend">
            <Sparkles size={13} /> Demo Presets:
          </span>
          <div className="preset-btn-bar">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="btn-preset-pill"
                onClick={() => onApplyPreset(p)}
                title={`Load parameters for ${p.name}`}
              >
                {p.tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="storage-input-form" noValidate={false}>
        <div className="form-fields-grid">
          {/* Rice Variety */}
          <div className="form-field full-span">
            <div className="field-label-row">
              <label htmlFor="form_rice_variety" className="field-label">
                Rice Variety <span className="required-star">*</span>
              </label>
              {detectedVariety && (
                <span className="detected-badge">
                  <CheckCircle2 size={12} /> Detected: <strong>{detectedVariety}</strong>
                </span>
              )}
            </div>
            <select
              id="form_rice_variety"
              name="variety"
              className="field-select"
              value={formData.variety}
              onChange={onChange}
              required
            >
              {VARIETIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <span className="field-helper">Cultivar determines basal price coefficient and respiration curve</span>
          </div>

          {/* Temperature */}
          <div className="form-field">
            <label htmlFor="form_temperature" className="field-label">
              Temperature (°C) <span className="required-star">*</span>
            </label>
            <div className="field-input-wrap">
              <input
                type="number"
                step="0.1"
                min="-10"
                max="60"
                id="form_temperature"
                name="temperature"
                className={`field-input ${temp > 30 ? 'input-warning' : ''}`}
                placeholder="24.0"
                value={formData.temperature}
                onChange={onChange}
                required
              />
              <span className="field-unit">°C</span>
            </div>
            <div className="field-helper-row">
              <span className="field-helper">Optimal: 18 - 25°C</span>
              {temp > 30 && <span className="inline-flag warning-flag">High Temp</span>}
            </div>
          </div>

          {/* Relative Humidity */}
          <div className="form-field">
            <label htmlFor="form_humidity" className="field-label">
              Relative Humidity (%) <span className="required-star">*</span>
            </label>
            <div className="field-input-wrap">
              <input
                type="number"
                step="0.1"
                min="10"
                max="100"
                id="form_humidity"
                name="humidity"
                className={`field-input ${humidity > 70 ? 'input-warning' : ''}`}
                placeholder="60.0"
                value={formData.humidity}
                onChange={onChange}
                required
              />
              <span className="field-unit">% RH</span>
            </div>
            <div className="field-helper-row">
              <span className="field-helper">Safe Limit: ≤ 65% RH</span>
              {humidity > 70 && <span className="inline-flag warning-flag">Humid</span>}
            </div>
          </div>

          {/* Moisture Content */}
          <div className="form-field">
            <label htmlFor="form_moisture" className="field-label">
              Grain Moisture Content (%) <span className="required-star">*</span>
            </label>
            <div className="field-input-wrap">
              <input
                type="number"
                step="0.1"
                min="5"
                max="35"
                id="form_moisture"
                name="moisture"
                className={`field-input ${moisture > 14.0 ? 'input-danger' : ''}`}
                placeholder="13.0"
                value={formData.moisture}
                onChange={onChange}
                required
              />
              <span className="field-unit">%</span>
            </div>
            <div className="field-helper-row">
              <span className="field-helper">Industrial Safe: ≤ 14.0%</span>
              {moisture > 14.0 && (
                <span className="inline-flag danger-flag">
                  <AlertTriangle size={11} /> Exceeds Safe
                </span>
              )}
            </div>
          </div>

          {/* Storage Duration */}
          <div className="form-field">
            <label htmlFor="form_storageDays" className="field-label">
              Storage Duration (Days) <span className="required-star">*</span>
            </label>
            <div className="field-input-wrap">
              <input
                type="number"
                step="1"
                min="0"
                max="1500"
                id="form_storageDays"
                name="storageDays"
                className="field-input"
                placeholder="30"
                value={formData.storageDays}
                onChange={onChange}
                required
              />
              <span className="field-unit">Days</span>
            </div>
            <span className="field-helper">Elapsed time in warehouse storage</span>
          </div>
        </div>

        {/* Advanced Gas Atmospheric Composition (CO2 / O2) */}
        <div className="advanced-accordion">
          <button
            type="button"
            className="accordion-header-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
          >
            <span>Atmospheric Composition (CO2 & O2) [Optional]</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="accordion-content-grid">
              <div className="form-field">
                <label htmlFor="form_co2" className="field-label">
                  CO2 Concentration (ppm)
                </label>
                <div className="field-input-wrap">
                  <input
                    type="number"
                    step="1"
                    min="200"
                    max="50000"
                    id="form_co2"
                    name="co2"
                    className="field-input"
                    placeholder="450"
                    value={formData.co2 || ''}
                    onChange={onChange}
                  />
                  <span className="field-unit">ppm</span>
                </div>
                <span className="field-helper">Elevated CO2 indicates grain respiration or insect activity</span>
              </div>

              <div className="form-field">
                <label htmlFor="form_o2" className="field-label">
                  Oxygen Level (%)
                </label>
                <div className="field-input-wrap">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="25"
                    id="form_o2"
                    name="o2"
                    className="field-input"
                    placeholder="20.9"
                    value={formData.o2 || ''}
                    onChange={onChange}
                  />
                  <span className="field-unit">%</span>
                </div>
                <span className="field-helper">Hermetic storage target: &lt; 5% O2</span>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="form-submit-row">
          <button
            type="submit"
            className="btn btn-primary btn-submit-action"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <PlayCircle size={18} />
                <span>{submitButtonText}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
