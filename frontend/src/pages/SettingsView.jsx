import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  User,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  LogOut,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { useProfile, isValidUserAvatar } from '../context/ProfileContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * SettingsView: Professional application settings.
 * Organized into:
 * 1. Appearance (Light / Dark mode)
 * 2. Account (Profile settings, Logout)
 * 3. Application (Version, System status, ML Model Registry)
 */
export default function SettingsView({
  modelStatus,
  backendOnline,
  onRefreshStatus,
  onNavigateProfile
}) {
  const { profile } = useProfile();
  const models = modelStatus?.models || {};

  // Appearance Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('smartrice_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smartrice_theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of SmartRice AI?')) {
      // Clean session notification
      alert('You have been logged out of the current session.');
      window.location.reload();
    }
  };

  return (
    <div className="settings-view-container">
      {/* Page Header Strip */}
      <div className="settings-header-strip">
        <div className="settings-title-group">
          <div className="settings-icon-box">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="settings-title">System Settings</h2>
            <p className="settings-subtitle">
              Manage appearance preferences, account details, and live system diagnostics.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onRefreshStatus}
          title="Refresh live system and model status"
        >
          <RefreshCw size={14} />
          <span>Refresh Status</span>
        </button>
      </div>

      <div className="settings-sections-stack">
        {/* SECTION 1: APPEARANCE */}
        <section className="settings-card-section">
          <div className="settings-card-header">
            <div className="card-title-group">
              <Sun size={18} className="card-header-icon" />
              <div>
                <h3 className="settings-section-title">Appearance</h3>
                <p className="card-subtitle">
                  Customize the interface theme for high-contrast laboratory or field conditions.
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="theme-selector-grid">
              <button
                type="button"
                className={`theme-option-card ${theme === 'light' ? 'is-active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className="theme-preview-box light-preview">
                  <div className="preview-header"></div>
                  <div className="preview-content">
                    <div className="preview-pill"></div>
                    <div className="preview-card"></div>
                  </div>
                </div>
                <div className="theme-meta">
                  <div className="theme-title-row">
                    <Sun size={15} />
                    <strong>Light Mode</strong>
                  </div>
                  <p>Crisp off-white canvas with deep forest green accents</p>
                </div>
                {theme === 'light' && <span className="theme-badge-active">Active</span>}
              </button>

              <button
                type="button"
                className={`theme-option-card ${theme === 'dark' ? 'is-active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="theme-preview-box dark-preview">
                  <div className="preview-header"></div>
                  <div className="preview-content">
                    <div className="preview-pill"></div>
                    <div className="preview-card"></div>
                  </div>
                </div>
                <div className="theme-meta">
                  <div className="theme-title-row">
                    <Moon size={15} />
                    <strong>Dark Mode</strong>
                  </div>
                  <p>Dark charcoal slate with high-contrast emerald indicators</p>
                </div>
                {theme === 'dark' && <span className="theme-badge-active">Active</span>}
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: ACCOUNT */}
        <section className="settings-card-section">
          <div className="settings-card-header">
            <div className="card-title-group">
              <User size={18} className="card-header-icon" />
              <div>
                <h3 className="settings-section-title">Account</h3>
                <p className="card-subtitle">
                  Signed-in investigator credentials and user access management.
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="account-summary-row">
              <div className="account-avatar-wrap">
                {isValidUserAvatar(profile.avatar) ? (
                  <img src={profile.avatar} alt="Kowsikan" className="account-avatar-img" />
                ) : (
                  <User size={26} className="avatar-neutral-icon" />
                )}
              </div>

              <div className="account-details">
                <h4 className="account-name">Kowsikan</h4>
                <p className="account-email">{profile.email || 'user@email.com'}</p>
                <div className="account-tags">
                  {profile.department && <span className="account-tag">{profile.department}</span>}
                  {profile.college && <span className="account-tag">{profile.college}</span>}
                </div>
              </div>

              <div className="account-actions">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={onNavigateProfile}
                  title="Open user profile settings"
                >
                  <User size={14} />
                  <span>Profile Settings</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleLogout}
                  title="Log out of the current session"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: APPLICATION */}
        <section className="settings-card-section">
          <div className="settings-card-header">
            <div className="card-title-group">
              <Laptop size={18} className="card-header-icon" />
              <div>
                <h3 className="settings-section-title">Application</h3>
                <p className="card-subtitle">
                  Software release version, operational health, and machine learning model registry.
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            {/* Version & Environment Row */}
            <div className="app-system-grid">
              <div className="system-status-box">
                <span className="status-label">Application Version</span>
                <strong className="status-val font-mono">v1.0.0 (Phase 1 Release)</strong>
                <span className="status-desc">Production AI Agriculture Suite</span>
              </div>

              <div className="system-status-box">
                <span className="status-label">FastAPI Backend</span>
                <div className="status-val-row">
                  <div className={`status-dot ${backendOnline ? 'online' : 'offline'}`}></div>
                  <strong>{backendOnline ? 'Online (Port 8000)' : 'Offline / Reconnecting'}</strong>
                </div>
                <span className="status-desc">Python 3.10 In-Memory Inference</span>
              </div>

              <div className="system-status-box">
                <span className="status-label">Supabase Database</span>
                <div className="status-val-row">
                  <div className={`status-dot ${isSupabaseConfigured ? 'online' : 'offline'}`}></div>
                  <strong>{isSupabaseConfigured ? 'Connected & Synced' : 'Offline / SQLite Local'}</strong>
                </div>
                <span className="status-desc">PostgreSQL Prediction History & Profiles</span>
              </div>

              <div className="system-status-box">
                <span className="status-label">Supabase Storage</span>
                <div className="status-val-row">
                  <div className={`status-dot ${isSupabaseConfigured ? 'online' : 'offline'}`}></div>
                  <strong>{isSupabaseConfigured ? 'Active (2 Buckets)' : 'Local Cache'}</strong>
                </div>
                <span className="status-desc">profile-images & rice-analysis-images</span>
              </div>
            </div>

            {/* Machine Learning Model Registry */}
            <div className="models-registry-wrapper">
              <div className="registry-title-row">
                <Cpu size={16} />
                <h4 className="registry-title">Machine Learning Model Registry</h4>
              </div>

              <div className="models-cards-grid">
                {Object.entries(models).map(([key, model]) => (
                  <div
                    key={key}
                    className={`model-card-box ${model.available ? 'is-available' : 'is-pending'}`}
                  >
                    <div className="model-box-top">
                      <div className="model-box-identity">
                        <span className="model-algo-chip">{model.type}</span>
                        <h5 className="model-box-name">{model.name}</h5>
                      </div>
                      <div className={`model-status-indicator ${model.available ? 'online' : 'needs-data'}`}>
                        {model.available ? (
                          <>
                            <CheckCircle size={13} />
                            <span>Trained & Ready</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={13} />
                            <span>Dataset Required</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="model-box-desc">{model.description}</p>

                    {model.metrics && Object.keys(model.metrics).length > 0 && (
                      <div className="model-metrics-panel">
                        <span className="metrics-label">Evaluation Metrics:</span>
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
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
