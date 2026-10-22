import React, { useState } from 'react';
import { Sliders, Sparkles, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';

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
    variety: 'Ponni',
    temperature: 28.0,
    humidity: 65.0,
    moisture: 13.8,
    storageDays: 150,
    co2: 600,
    o2: 19.5
  }
];

export default function StorageInputForm({
  formData,
  onChange,
  onApplyPreset,
  onSubmit,
  isAnalyzing,
  detectedVariety
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="card storage-form-card">
      <div className="card-header">
        <div className="card-title-group">
          <Sliders className="card-header-icon" size={20} />
          <div>
            <h3 className="card-title">Storage & Environment Parameters</h3>
            <p className="card-subtitle">Manually enter storage environment conditions (Phase 1 NO-IoT)</p>
          </div>
        </div>

        <div className="preset-dropdown-wrap">
          <span className="preset-label">
            <Sparkles size={14} /> Quick Demo:
          </span>
          <div className="preset-buttons">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-preset"
                onClick={() => onApplyPreset(p)}
                title={`Load parameters for ${p.name}`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="storage-form">
        <div className="form-grid">
          {/* Rice Variety */}
          <div className="form-group full-width">
            <label htmlFor="rice_variety" className="form-label">
              Rice Variety
              {detectedVariety && (
                <span className="detected-hint">
                  (Detected from Image: <strong>{detectedVariety}</strong>)
                </span>
              )}
            </label>
            <select
              id="rice_variety"
              name="variety"
              className="form-control"
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
          </div>

          {/* Temperature */}
          <div className="form-group">
            <label htmlFor="temperature" className="form-label">
              Temperature (°C)
            </label>
            <div className="input-group">
              <input
                type="number"
                step="0.1"
                min="-10"
                max="60"
                id="temperature"
                name="temperature"
                className="form-control"
                placeholder="e.g. 26.5"
                value={formData.temperature}
                onChange={onChange}
                required
              />
              <span className="input-unit">°C</span>
            </div>
            <span className="field-hint">Optimal safe range: 18 - 25°C</span>
          </div>

          {/* Humidity */}
          <div className="form-group">
            <label htmlFor="humidity" className="form-label">
              Relative Humidity (%)
            </label>
            <div className="input-group">
              <input
                type="number"
                step="0.1"
                min="10"
                max="100"
                id="humidity"
                name="humidity"
                className="form-control"
                placeholder="e.g. 62.0"
                value={formData.humidity}
                onChange={onChange}
                required
              />
              <span className="input-unit">%</span>
            </div>
            <span className="field-hint">Target: ≤ 65% RH</span>
          </div>

          {/* Moisture Content */}
          <div className="form-group">
            <label htmlFor="moisture" className="form-label">
              Moisture Content (%)
            </label>
            <div className="input-group">
              <input
                type="number"
                step="0.1"
                min="5"
                max="35"
                id="moisture"
                name="moisture"
                className="form-control"
                placeholder="e.g. 13.2"
                value={formData.moisture}
                onChange={onChange}
                required
              />
              <span className="input-unit">%</span>
            </div>
            <span className="field-hint">Safe storage standard: ≤ 14.0%</span>
          </div>

          {/* Storage Duration */}
          <div className="form-group">
            <label htmlFor="storageDays" className="form-label">
              Storage Duration (Days)
            </label>
            <div className="input-group">
              <input
                type="number"
                step="1"
                min="0"
                max="1500"
                id="storageDays"
                name="storageDays"
                className="form-control"
                placeholder="e.g. 45"
                value={formData.storageDays}
                onChange={onChange}
                required
              />
              <span className="input-unit">Days</span>
            </div>
            <span className="field-hint">Elapsed time in storage facility</span>
          </div>
        </div>

        {/* Optional Advanced Variables (CO2, O2) */}
        <div className="advanced-toggle-section">
          <button
            type="button"
            className="advanced-toggle-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>Atmospheric Storage Composition (CO2 / O2) [Optional]</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="form-grid advanced-grid">
              <div className="form-group">
                <label htmlFor="co2" className="form-label">
                  CO2 Concentration (ppm)
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    step="1"
                    min="200"
                    max="50000"
                    id="co2"
                    name="co2"
                    className="form-control"
                    placeholder="e.g. 500"
                    value={formData.co2 || ''}
                    onChange={onChange}
                  />
                  <span className="input-unit">ppm</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="o2" className="form-label">
                  Oxygen Level (%)
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="25"
                    id="o2"
                    name="o2"
                    className="form-control"
                    placeholder="e.g. 20.9"
                    value={formData.o2 || ''}
                    onChange={onChange}
                  />
                  <span className="input-unit">%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span className="spinner-border"></span>
                <span>PROCESSING MULTIMODAL PREDICTION...</span>
              </>
            ) : (
              <>
                <PlayCircle size={20} />
                <span>ANALYZE RICE</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
