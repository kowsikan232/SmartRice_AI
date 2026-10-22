import React from 'react';
import ImageUploader from '../components/ImageUploader';
import StorageForm from '../components/StorageForm';
import PredictionResult from '../components/PredictionResult';

/**
 * RiceAnalysisView: The centerpiece presentation page.
 * Clean, visually impressive two-column layout:
 * - LEFT: Professional Image Upload & Preview with inline scan feedback
 * - RIGHT: Storage Environment Inputs + Quick Presets + [ Analyze Rice Sample ]
 * - RESULTS: Complete multimodal evaluation with large quality score, risk badge, shelf life, and dynamic pricing.
 */
export default function RiceAnalysisView({
  imageFile,
  previewUrl,
  onImageSelected,
  onImageRemoved,
  onQuickAnalyzeImage,
  analyzingImage,
  imageAnalysisResult,
  formData,
  onFormChange,
  onApplyPreset,
  onSubmitAnalysis,
  isAnalyzing,
  results,
  errorMessage,
  onNavigateToHistory
}) {
  return (
    <div className="rice-analysis-page">
      {/* Hero Banner with Clear Purpose */}
      <div className="analysis-page-hero">
        <div className="hero-text-block">
          <h2 className="hero-heading">Rice Quality & Storage Analysis</h2>
          <p className="hero-subtext">
            Upload overhead photography for deep learning defect grading, and evaluate storage condition parameters.
          </p>
        </div>
      </div>

      {/* Two-Column Interactive Working Area */}
      <div className="analysis-workspace-grid">
        {/* LEFT COLUMN: Image Upload / Preview */}
        <div className="workspace-column left-upload-col">
          <ImageUploader
            imageFile={imageFile}
            previewUrl={previewUrl}
            onImageSelected={onImageSelected}
            onImageRemoved={onImageRemoved}
            onQuickAnalyzeImage={onQuickAnalyzeImage}
            analyzingImage={analyzingImage}
            imageAnalysisResult={imageAnalysisResult}
            errorMessage={errorMessage}
          />
        </div>

        {/* RIGHT COLUMN: Storage Environment Parameters */}
        <div className="workspace-column right-params-col">
          <StorageForm
            formData={formData}
            onChange={onFormChange}
            onApplyPreset={onApplyPreset}
            onSubmit={onSubmitAnalysis}
            isAnalyzing={isAnalyzing}
            detectedVariety={imageAnalysisResult?.detected_variety}
            submitButtonText="Analyze Rice"
          />
        </div>
      </div>

      {/* Comprehensive Evaluation Results Section */}
      <div className="analysis-results-section" id="evaluation-results-section">
        <PredictionResult
          results={results}
          loading={isAnalyzing}
          error={errorMessage}
          onNavigateToHistory={onNavigateToHistory}
          formData={formData}
          previewUrl={previewUrl}
        />
      </div>
    </div>
  );
}
