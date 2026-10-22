import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Cpu,
  Info,
  ChevronDown,
  User,
  Edit3,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useProfile, isValidUserAvatar } from '../context/ProfileContext';

/**
 * Header: Top app bar for Smart Rice AI.
 * Displays dynamic page titles/breadcrumbs, system connection pill,
 * model diagnostic trigger, notification drawer, and interactive user profile badge.
 */
export default function Header({
  activeTab,
  pageMeta = {},
  backendOnline,
  onOpenModelStatus,
  onToggleMobileMenu,
  searchQuery,
  onSearchChange,
  onNavigateProfile,
  onNavigateSettings
}) {
  const { profile } = useProfile();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const notifRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowProfileDropdown(false);
    alert(
      'Session Note: Smart Rice AI is running in Single-User mode. Multi-user authentication & session management will be active in multi-tenant deployment.'
    );
  };

  const notifications = [
    {
      id: 1,
      title: 'Supabase Database Connected',
      desc: 'Prediction history and profiles are synced in real time.',
      time: 'Live DB'
    },
    {
      id: 2,
      title: 'ML Decision Engines Active',
      desc: 'MobileNetV2 visual grading and Scikit-Learn models online.',
      time: 'Inference'
    },
    {
      id: 3,
      title: 'Academic Data Integrity',
      desc: 'Zero synthetic data fabrication enforced across all evaluation modules.',
      time: 'System'
    }
  ];

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {/* Mobile Hamburger */}
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Dynamic Page Breadcrumb & Title */}
        <div className="topbar-breadcrumb-wrap">
          <div className="breadcrumb-trail">
            <span className="breadcrumb-root">SmartRice AI</span>
            <ChevronRight size={13} className="breadcrumb-separator" aria-hidden="true" />
            <span className="breadcrumb-current">{pageMeta.title || 'Dashboard'}</span>
          </div>
          {pageMeta.subtitle && (
            <p className="topbar-page-subtitle">{pageMeta.subtitle}</p>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* Global Search Input */}
        <div className="topbar-search">
          <Search size={15} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            className="search-input"
            placeholder="Search records, varieties..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            aria-label="Search records"
          />
        </div>

        {/* System Connection Status Pill */}
        <div
          className={`status-pill ${backendOnline ? 'online' : 'offline'}`}
          title={backendOnline ? 'Supabase & FastAPI connected at http://127.0.0.1:8000' : 'Backend offline. Run backend/run.py'}
        >
          <span className="status-dot" aria-hidden="true" />
          <span className="status-label">
            {backendOnline ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* Model Status Diagnostic Button */}
        <button
          type="button"
          className="topbar-btn model-btn"
          onClick={onOpenModelStatus}
          title="Inspect ML & DL Model Status"
          aria-label="Inspect Machine Learning Model Status"
        >
          <Cpu size={15} />
          <span className="btn-text">Models</span>
        </button>

        {/* Notification Bell */}
        <div className="notification-wrapper" ref={notifRef}>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            title="System notifications"
          >
            <Bell size={17} />
            <span className="notification-indicator" />
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span className="notif-title">System Bulletins</span>
                <span className="notif-count">{notifications.length} notices</span>
              </div>
              <ul className="notification-list">
                {notifications.map((n) => (
                  <li key={n.id} className="notification-item">
                    <div className="notif-icon-col">
                      <Info size={14} className="notif-icon" />
                    </div>
                    <div className="notif-content">
                      <span className="notif-item-title">{n.title}</span>
                      <p className="notif-item-desc">{n.desc}</p>
                      <span className="notif-time">{n.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* User Profile Area with Dropdown */}
        <div className="profile-menu-container" ref={profileDropdownRef}>
          <button
            type="button"
            className={`user-profile-badge clickable ${showProfileDropdown ? 'active' : ''}`}
            onClick={() => setShowProfileDropdown((prev) => !prev)}
            aria-expanded={showProfileDropdown}
            aria-haspopup="true"
            title={`Account: ${profile.name}`}
          >
            <div className="profile-avatar">
              {isValidUserAvatar(profile.avatar) ? (
                <img
                  src={profile.avatar}
                  alt="Kowsikan"
                  className="profile-avatar-img"
                />
              ) : (
                <User size={15} className="neutral-avatar-icon" />
              )}
            </div>
            <div className="profile-info">
              <span className="profile-name">Kowsikan</span>
            </div>
            <ChevronDown size={13} className={`profile-chevron ${showProfileDropdown ? 'rotated' : ''}`} />
          </button>

          {showProfileDropdown && (
            <div className="profile-dropdown-menu" role="menu">
              <div className="profile-dropdown-header">
                <span className="dropdown-user-name">Kowsikan</span>
              </div>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-menu-item"
                role="menuitem"
                onClick={() => {
                  setShowProfileDropdown(false);
                  if (onNavigateProfile) onNavigateProfile();
                }}
              >
                <User size={15} />
                <span>Profile</span>
              </button>
              <button
                type="button"
                className="dropdown-menu-item"
                role="menuitem"
                onClick={() => {
                  setShowProfileDropdown(false);
                  if (onNavigateProfile) onNavigateProfile();
                }}
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                className="dropdown-menu-item"
                role="menuitem"
                onClick={() => {
                  setShowProfileDropdown(false);
                  if (onNavigateSettings) onNavigateSettings();
                }}
              >
                <Settings size={15} />
                <span>Settings</span>
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-menu-item text-danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
