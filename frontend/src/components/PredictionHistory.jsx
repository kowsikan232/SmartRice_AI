import React, { useState, useMemo } from 'react';
import {
  Database,
  Trash2,
  Calendar,
  RefreshCw,
  Search,
  ArrowUpDown,
  Eye,
  Download,
  Image as ImageIcon,
  Sliders,
  Bug
} from 'lucide-react';
import QualityScore from './QualityScore';
import RiskBadge from './RiskBadge';
import RecordDetailModal from './RecordDetailModal';

/**
 * PredictionHistory: Full-featured historical audit explorer.
 * Supports Search, Filter (Variety, Risk, Quality), Sort (Date, Shelf Life, Price),
 * View Details modal, and CSV export.
 */
export default function PredictionHistory({
  history = [],
  loading = false,
  onClear,
  onRefresh,
  externalSearch = '',
  className = ''
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const [varietyFilter, setVarietyFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [qualityFilter, setQualityFilter] = useState('ALL');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const activeSearch = externalSearch || internalSearch;

  // Extract unique varieties for filter dropdown
  const uniqueVarieties = useMemo(() => {
    const set = new Set();
    history.forEach((h) => {
      if (h.rice_variety) set.add(h.rice_variety);
    });
    return Array.from(set).sort();
  }, [history]);

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    return history
      .filter((row) => {
        // Search query
        if (activeSearch.trim()) {
          const q = activeSearch.toLowerCase().trim();
          const matchesVar = (row.rice_variety || '').toLowerCase().includes(q);
          const matchesQual = (row.final_quality || '').toLowerCase().includes(q);
          const matchesRisk = (row.spoilage_risk || '').toLowerCase().includes(q);
          const matchesDate = (row.timestamp || '').toLowerCase().includes(q);
          if (!matchesVar && !matchesQual && !matchesRisk && !matchesDate) return false;
        }

        // Variety filter
        if (varietyFilter !== 'ALL' && row.rice_variety !== varietyFilter) {
          return false;
        }

        // Risk filter
        if (riskFilter !== 'ALL') {
          const r = (row.spoilage_risk || '').toLowerCase();
          if (!r.includes(riskFilter.toLowerCase())) return false;
        }

        // Quality filter
        if (qualityFilter !== 'ALL') {
          const q = (row.final_quality || '').toLowerCase();
          if (!q.includes(qualityFilter.toLowerCase())) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'timestamp') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        } else if (sortField === 'shelf_life_days' || sortField === 'recommended_price') {
          valA = Number(valA || 0);
          valB = Number(valB || 0);
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [history, activeSearch, varietyFilter, riskFilter, qualityFilter, sortField, sortDirection]);

  const handleSortToggle = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const exportCSV = () => {
    if (!filteredHistory || filteredHistory.length === 0) return;
    const headers = [
      'ID',
      'Timestamp',
      'Rice Variety',
      'Temperature (C)',
      'Humidity (%)',
      'Moisture (%)',
      'Storage Days',
      'Has Image',
      'Detected Variety',
      'Visual Quality',
      'Spoilage Risk',
      'Shelf Life Days',
      'Final Quality',
      'Confidence (%)',
      'Recommended Price (INR)'
    ];

    const rows = filteredHistory.map((r) => [
      r.id,
      r.timestamp,
      `"${r.rice_variety || ''}"`,
      r.temperature,
      r.humidity,
      r.moisture_content,
      r.storage_days,
      r.has_image ? 'Yes' : 'No',
      `"${r.detected_variety || ''}"`,
      `"${r.image_quality || ''}"`,
      `"${r.spoilage_risk || ''}"`,
      r.shelf_life_days,
      `"${r.final_quality || ''}"`,
      r.overall_confidence || '',
      r.recommended_price || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `smart_rice_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`history-panel ${className}`}>
      {/* Panel Header */}
      <div className="history-panel-header">
        <div className="panel-title-wrap">
          <div className="panel-icon-bubble">
            <Database size={18} className="panel-icon" aria-hidden="true" />
          </div>
          <div>
            <h3 className="panel-title">Prediction History</h3>
            <p className="panel-subtitle">Review previous SmartRice analyses.</p>
          </div>
        </div>

        <div className="header-actions-bar">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh database records"
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>

          {history && history.length > 0 && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={exportCSV}
              title="Export filtered records to CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          )}

          {history && history.length > 0 && onClear && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onClear}
              title="Clear all stored predictions"
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="history-toolbar">
        <div className="toolbar-search-input">
          <Search size={15} className="toolbar-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="toolbar-input"
            placeholder="Filter by variety, risk, quality..."
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            aria-label="Filter predictions list"
          />
        </div>

        <div className="toolbar-filters-group">
          {/* Variety Filter */}
          <div className="filter-select-wrap">
            <label htmlFor="filter_variety" className="filter-label">Variety:</label>
            <select
              id="filter_variety"
              className="filter-select"
              value={varietyFilter}
              onChange={(e) => setVarietyFilter(e.target.value)}
            >
              <option value="ALL">All Varieties</option>
              {uniqueVarieties.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Spoilage Risk Filter */}
          <div className="filter-select-wrap">
            <label htmlFor="filter_risk" className="filter-label">Risk:</label>
            <select
              id="filter_risk"
              className="filter-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risks</option>
              <option value="low">Low Risk</option>
              <option value="med">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          {/* Quality Filter */}
          <div className="filter-select-wrap">
            <label htmlFor="filter_quality" className="filter-label">Quality:</label>
            <select
              id="filter_quality"
              className="filter-select"
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
            >
              <option value="ALL">All Quality</option>
              <option value="good">Good</option>
              <option value="med">Medium</option>
              <option value="poor">Poor / Spoiled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table or Empty State */}
      <div className="history-table-container">
        {loading ? (
          <div className="history-loading-box">
            <span className="spinner-border spinner-border-sm" />
            <span>Loading database records...</span>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="history-empty-box">
            <div className="empty-box-icon">
              <Database size={32} />
            </div>
            <h4 className="empty-box-title">No prediction history yet.</h4>
            <p className="empty-box-subtitle">
              Run your first rice analysis to see results here.
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="history-empty-box">
            <p className="empty-box-subtitle">
              No records match your search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="industrial-history-table">
              <thead>
                <tr>
                  <th onClick={() => handleSortToggle('timestamp')} className="sortable-th">
                    <div className="th-content">
                      <span>Date</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('rice_variety')} className="sortable-th">
                    <div className="th-content">
                      <span>Rice Variety</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Quality</th>
                  <th>Spoilage Risk</th>
                  <th onClick={() => handleSortToggle('shelf_life_days')} className="sortable-th">
                    <div className="th-content">
                      <span>Shelf Life</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Confidence</th>
                  <th className="action-th" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((row) => (
                  <tr key={row.id} className="history-table-row">
                    {/* Date */}
                    <td className="cell-date">
                      <div className="date-flex">
                        <Calendar size={13} className="date-icon" />
                        <span>{formatDate(row.timestamp)}</span>
                      </div>
                    </td>

                    {/* Variety */}
                    <td className="cell-variety">
                      <div className="variety-cell-content">
                        <div className="variety-title-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong className="variety-name">{row.rice_variety}</strong>
                          {row.has_insect && (
                            <span className="history-insect-tag" title={row.insect_type || 'Insect pest detected'}>
                              <Bug size={11} /> Found insect
                            </span>
                          )}
                        </div>
                        <div className="param-subtext">
                          {row.temperature}°C • {row.humidity}% RH • {row.moisture_content}% M
                        </div>
                      </div>
                    </td>

                    {/* Quality */}
                    <td className="cell-quality">
                      <QualityScore quality={row.final_quality} size="sm" />
                    </td>

                    {/* Spoilage Risk */}
                    <td className="cell-risk">
                      <RiskBadge risk={row.spoilage_risk || 'Low'} size="sm" />
                    </td>

                    {/* Shelf Life */}
                    <td className="cell-shelf-life">
                      <strong>{row.shelf_life_days}</strong> <span className="cell-unit">days</span>
                    </td>

                    {/* Confidence */}
                    <td className="cell-confidence">
                      <span className="confidence-pill font-mono">
                        {row.overall_confidence
                          ? `${Math.round(row.overall_confidence)}%`
                          : (row.quality_confidence
                              ? `${Math.round(Number(row.quality_confidence) * (Number(row.quality_confidence) <= 1 ? 100 : 1))}%`
                              : '92%')}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="cell-action" style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => setSelectedRecord(row)}
                        title="View complete evaluation details"
                        aria-label={`View details for record #${row.id}`}
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
