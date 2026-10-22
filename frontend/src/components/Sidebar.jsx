import React from 'react';
import {
  LayoutDashboard,
  Scan,
  Brain,
  History,
  FileText,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Wheat
} from 'lucide-react';
import { useProfile, isValidUserAvatar, getInitials } from '../context/ProfileContext';

/**
 * Sidebar: Fixed left navigation for Smart Rice AI platform.
 * Clean, compact structure:
 * - Brand: SMART RICE AI / AI-Powered Rice Quality Analysis
 * - MAIN: Dashboard, Rice Analysis, Predictions, History, Reports
 * - SYSTEM: Settings, Profile
 * - User Profile: [Profile Photo] Kowsikan (No roles, no extraneous text)
 */
export default function Sidebar({
  activeTab,
  setActiveTab,
  historyCount = 0,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  backendOnline
}) {
  const { profile } = useProfile();

  const mainNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'rice-analysis',
      label: 'Rice Analysis',
      icon: Scan
    },
    {
      id: 'predictions',
      label: 'Predictions',
      icon: Brain
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      count: historyCount
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText
    }
  ];

  const systemNavItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User
    }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const hasValidPhoto = isValidUserAvatar(profile?.avatar);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-wrap" onClick={() => handleNavClick('dashboard')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon-box" title="SmartRice AI">
              <Wheat size={18} className="brand-icon" aria-hidden="true" />
            </div>
            {!collapsed && (
              <div className="brand-text-block">
                <span className="brand-app-name">SMART RICE AI</span>
                <span className="brand-tagline">AI-Powered Rice Quality Analysis</span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-nav-container">
          {/* MAIN Section */}
          <div className="nav-group-section">
            {!collapsed && <span className="nav-section-label">MAIN</span>}
            <nav className="sidebar-nav" aria-label="Main Navigation">
              <ul className="nav-list">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <li key={item.id} className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${isActive ? 'active' : ''}`}
                        onClick={() => handleNavClick(item.id)}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="nav-icon-wrap">
                          <Icon size={18} className="nav-icon" aria-hidden="true" />
                        </span>
                        {!collapsed && (
                          <div className="nav-label-wrap">
                            <span className="nav-title">{item.label}</span>
                          </div>
                        )}
                        {!collapsed && item.count !== undefined && item.count > 0 && (
                          <span className="nav-badge badge-count">{item.count}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* SYSTEM Section */}
          <div className="nav-group-section system-nav-group">
            {!collapsed && <span className="nav-section-label">SYSTEM</span>}
            <nav className="sidebar-nav" aria-label="System Navigation">
              <ul className="nav-list">
                {systemNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <li key={item.id} className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${isActive ? 'active' : ''}`}
                        onClick={() => handleNavClick(item.id)}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="nav-icon-wrap">
                          <Icon size={18} className="nav-icon" aria-hidden="true" />
                        </span>
                        {!collapsed && (
                          <div className="nav-label-wrap">
                            <span className="nav-title">{item.label}</span>
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom of Sidebar: User Profile & Minimal Identifier */}
        <div className="sidebar-footer">
          {!collapsed ? (
            <div
              className="footer-user-card"
              onClick={() => handleNavClick('profile')}
              role="button"
              tabIndex={0}
              title="View profile: Kowsikan"
            >
              <div className="footer-avatar">
                {hasValidPhoto ? (
                  <img src={profile.avatar} alt="Kowsikan" className="avatar-img" />
                ) : (
                  <User size={16} className="avatar-neutral-icon" />
                )}
              </div>
              <div className="footer-user-details">
                <span className="footer-user-name">Kowsikan</span>
              </div>
              <div
                className={`status-dot-indicator ${backendOnline ? 'online' : 'offline'}`}
                title={backendOnline ? 'System Online' : 'System Offline'}
              />
            </div>
          ) : (
            <div
              className="footer-user-collapsed"
              onClick={() => handleNavClick('profile')}
              title="Profile: Kowsikan"
            >
              <div className="footer-avatar">
                {hasValidPhoto ? (
                  <img src={profile.avatar} alt="Kowsikan" className="avatar-img" />
                ) : (
                  <User size={16} className="avatar-neutral-icon" />
                )}
              </div>
            </div>
          )}

          {/* Desktop/Tablet Collapse Toggle */}
          <div className="collapse-toggle-wrapper">
            <button
              type="button"
              className="sidebar-collapse-toggle"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {!collapsed && <span className="collapse-text">Collapse Menu</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
