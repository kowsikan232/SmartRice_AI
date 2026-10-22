import React from 'react';
import StorageForm from '../components/StorageForm';
import PredictionResult from '../components/PredictionResult';
import ChartCard, { StorageConditionBars } from '../components/ChartCard';
import { Sliders, ShieldCheck, Info } from 'lucide-react';

/**
 * PredictionsView: Dedicated storage condition prediction page.
 * Focuses on environmental parameters (Temperature, Humidity, Moisture, Storage Duration, Atmospheric gases)
 * and displays storage condition safety bars alongside predicted outcomes.
 */
export default function PredictionsView({
  formData,
  onFormChange,
  onApplyPreset,
  onSubmitStorageAnalysis,
  isAnalyzing,
  results,
  errorMessage,
  onNavigateToHistory
}) {
  return (
    <div className="predictions-view-container">
      {/* Intro Header */}
      <div className="view-intro-strip">
        <div className="intro-icon-box">
          <Sliders size={20} />
        </div>
        <div>
          <h2 className="intro-title">Storage Environment Predictor</h2>
          <p className="intro-subtitle">
            Simulate silo or warehouse microclimates to evaluate post-harvest grain stability,
            respiration rate, and fungal spoilage vulnerability.
          </p>
        </div>
      </div>

      <div className="predictions-layout-grid">
        {/* Left Side: Storage Form */}
        <div className="predictions-form-column">
          <StorageForm
            formData={formData}
            onChange={onFormChange}
            onApplyPreset={onApplyPreset}
            onSubmit={onSubmitStorageAnalysis}
            isAnalyzing={isAnalyzing}
            submitButtonText="Analyze Storage Conditions"
          />
        </div>

        {/* Right Side: Safe Range Reference & Visual Bars */}
        <div className="predictions-sidebar-column">
          <ChartCard
            title="Safe Storage Thresholds"
            subtitle="Industrial and research standards for rice preservation"
            badge="Standard Limits"
          >
            <StorageConditionBars
              temperature={formData.temperature}
              humidity={formData.humidity}
              moisture={formData.moisture}
              storageDays={formData.storageDays}
            />
          </ChartCard>

          <div className="scientific-reference-card">
            <div className="ref-header">
              <Info size={16} />
              <span>Grain Preservation Guidelines</span>
            </div>
            <ul className="ref-points-list">
              <li>
                <strong>Moisture ≤ 14.0%:</strong> Critical safe limit. Higher moisture stimulates Aspergillus and Penicillium fungal growth.
              </li>
              <li>
                <strong>Temp ≤ 25.0°C:</strong> Prevents accelerated respiration, dry matter loss, and fat acidity accumulation.
              </li>
              <li>
                <strong>Humidity ≤ 65%:</strong> Prevents moisture re-absorption from ambient warehouse air.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="predictions-results-area">
        <PredictionResult
          results={results}
          loading={isAnalyzing}
          error={errorMessage}
          onNavigateToHistory={onNavigateToHistory}
          formData={formData}
        />
      </div>
    </div>
  );
}
