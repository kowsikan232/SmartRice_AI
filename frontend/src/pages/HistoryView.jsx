import React from 'react';
import PredictionHistory from '../components/PredictionHistory';

/**
 * HistoryView: Full-page historical records viewer.
 * Provides high-density auditing table, multi-parameter filtering,
 * CSV export, and complete record inspect modal.
 */
export default function HistoryView({
  history,
  loading,
  onClear,
  onRefresh,
  externalSearch
}) {
  return (
    <div className="history-view-container">
      <PredictionHistory
        history={history}
        loading={loading}
        onClear={onClear}
        onRefresh={onRefresh}
        externalSearch={externalSearch}
      />
    </div>
  );
}
