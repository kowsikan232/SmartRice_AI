import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function ImageUpload({
  imageFile,
  previewUrl,
  onImageSelected,
  onImageRemoved,
  onQuickAnalyzeImage,
  analyzingImage,
  imageAnalysisResult,
  errorMessage
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setLocalError(`Unsupported format (.${ext}). Supported: JPG, JPEG, PNG, WEBP.`);
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError(`File size exceeds ${MAX_SIZE_MB}MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return false;
    }
    setLocalError(null);
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

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="card image-upload-card">
      <div className="card-header">
        <div className="card-title-group">
          <ImageIcon className="card-header-icon" size={20} />
          <div>
            <h3 className="card-title">Image Quality Analysis</h3>
            <p className="card-subtitle">Upload rice grain or storage sample image for computer vision evaluation</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!previewUrl ? (
        <div
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="dropzone-content">
            <div className="upload-icon-wrapper">
              <UploadCloud size={36} className="upload-icon" />
            </div>
            <p className="dropzone-primary-text">
              <strong>Click to upload</strong> or drag and drop sample
            </p>
            <p className="dropzone-secondary-text">
              JPG, JPEG, PNG, or WEBP (Max {MAX_SIZE_MB}MB)
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              Browse Image
            </button>
          </div>
        </div>
      ) : (
        <div className="image-preview-container">
          <div className="preview-image-wrapper">
            <img src={previewUrl} alt="Rice Sample Preview" className="preview-image" />
            <div className="image-overlay-controls">
              <button
                type="button"
                className="overlay-btn replace-btn"
                onClick={handleBrowseClick}
                title="Replace image"
              >
                <RefreshCw size={14} />
                <span>Replace</span>
              </button>
              <button
                type="button"
                className="overlay-btn remove-btn"
                onClick={onImageRemoved}
                title="Remove image"
              >
                <X size={14} />
                <span>Remove</span>
              </button>
            </div>
          </div>

          <div className="preview-meta">
            <div className="meta-info">
              <span className="file-name" title={imageFile?.name}>
                {imageFile?.name}
              </span>
              <span className="file-size">
                {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : ''}
              </span>
            </div>

            {onQuickAnalyzeImage && (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={onQuickAnalyzeImage}
                disabled={analyzingImage}
              >
                {analyzingImage ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    <span>Analyzing Image...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={14} />
                    <span>Quick Image Scan</span>
                  </>
                )}
              </button>
            )}
          </div>

          {imageAnalysisResult && (
            <div className="quick-image-badge">
              <div className="badge-header">
                <CheckCircle2 size={15} className="text-success" />
                <span>Image Scan Feedback</span>
              </div>
              <div className="badge-body">
                {imageAnalysisResult.detected_variety && (
                  <p className="badge-item">
                    <strong>Identified Variety:</strong> {imageAnalysisResult.detected_variety} ({imageAnalysisResult.variety_confidence}%)
                  </p>
                )}
                {imageAnalysisResult.quality_prediction ? (
                  <p className="badge-item">
                    <strong>Visual Quality:</strong> {imageAnalysisResult.quality_prediction} ({imageAnalysisResult.confidence}%)
                  </p>
                ) : (
                  <p className="badge-item text-muted">
                    <em>{imageAnalysisResult.message}</em>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(localError || errorMessage) && (
        <div className="alert alert-danger">
          <AlertCircle size={16} />
          <span>{localError || errorMessage}</span>
        </div>
      )}
    </div>
  );
}
