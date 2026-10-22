import React from 'react';
import { Award, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

/**
 * QualityScore: Visual indicator for rice condition / grade.
 * Dual encoded with text, distinct iconography, and high-contrast color scheme.
 */
export default function QualityScore({ quality, confidence, size = 'md', className = '' }) {
  const norm = (quality || '').toLowerCase().trim();

  let grade = 'Unrated';
  let variant = 'unknown';
  let Icon = Award;
  let description = 'Model Assessment Pending';

  if (norm.includes('good') || norm.includes('high') || norm.includes('grade a')) {
    grade = 'Good (Grade A)';
    variant = 'good';
    Icon = CheckCircle2;
    description = 'Optimal commercial grain standard';
  } else if (norm.includes('medium') || norm.includes('grade b')) {
    grade = 'Medium (Grade B)';
    variant = 'medium';
    Icon = AlertCircle;
    description = 'Acceptable quality, monitor storage';
  } else if (norm.includes('poor') || norm.includes('spoil') || norm.includes('grade c')) {
    grade = 'Poor / Spoiled';
    variant = 'poor';
    Icon = XCircle;
    description = 'Sub-optimal condition, high spoilage risk';
  } else if (quality) {
    grade = quality;
    variant = 'neutral';
    Icon = Award;
    description = 'Assessed grain condition';
  }

  if (size === 'lg') {
    return (
      <div className={`quality-score-large variant-${variant} ${className}`}>
        <div className="quality-icon-bubble">
          <Icon size={28} aria-hidden="true" />
        </div>
        <div className="quality-details">
          <div className="quality-header-row">
            <span className="quality-grade-label">{grade}</span>
            {confidence !== undefined && confidence !== null && (
              <span className="quality-conf-tag">{confidence}% Confidence</span>
            )}
          </div>
          <p className="quality-desc">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <span className={`quality-badge variant-${variant} size-${size} ${className}`} title={description}>
      <Icon size={size === 'sm' ? 12 : 14} className="badge-icon" aria-hidden="true" />
      <span className="badge-text">{grade}</span>
    </span>
  );
}
