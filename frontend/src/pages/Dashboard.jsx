import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ModelStatusModal from '../components/ModelStatusModal';

// Tab Views
import DashboardView from './DashboardView';
import RiceAnalysisView from './RiceAnalysisView';
import PredictionsView from './PredictionsView';
import HistoryView from './HistoryView';
import ReportsView from './ReportsView';
import SettingsView from './SettingsView';
import ProfileView from './ProfileView';

import {
  checkHealth,
  getModelStatus,
  predictImage,
  predictQuality,
  predictTabular,
  predictCombined,
  fetchHistory,
  clearPredictionHistory
} from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export default function Dashboard() {
  // Navigation & Layout States
  const getInitialTab = () => {
    if (typeof window !== 'undefined' && window.location.pathname === '/profile') {
      return 'profile';
    }
    return 'dashboard';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Backend & ML Diagnostic States
  const [backendOnline, setBackendOnline] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [showModelModal, setShowModelModal] = useState(false);

  // History States
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Image Upload States
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);

  // Storage Environmental Form State
  const [formData, setFormData] = useState({
    variety: 'Basmati',
    temperature: 24.5,
    humidity: 58.0,
    moisture: 12.8,
    storageDays: 30,
    co2: '',
    o2: ''
  });

  // Inference Execution States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Poll Health & Model Status
  const initSystemStatus = async () => {
    try {
      await checkHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }

    try {
      const statusData = await getModelStatus();
      setModelStatus(statusData);
    } catch {
      // Ignored if offline
    }

    loadHistory();
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchHistory(50);
      setHistory(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    initSystemStatus();
    const interval = setInterval(initSystemStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime subscription for live prediction history updates
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('realtime_prediction_history')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prediction_history' },
        (payload) => {
          if (payload.new) {
            setHistory((prev) => {
              if (prev.some((item) => item.id === payload.new.id)) {
                return prev;
              }
              return [payload.new, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Listen to browser forward/back buttons for /profile route
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/profile') {
        setActiveTab('profile');
      } else if (activeTab === 'profile') {
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  const navigateToTab = (tabId, path = null) => {
    setActiveTab(tabId);
    if (path) {
      window.history.pushState(null, '', path);
    } else if (tabId === 'profile') {
      window.history.pushState(null, '', '/profile');
    } else if (window.location.pathname === '/profile') {
      window.history.pushState(null, '', '/');
    }
  };

  // Image Handlers
  const handleImageSelected = (file) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setImageAnalysisResult(null);
    setErrorMessage(null);
  };

  const handleImageRemoved = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
    setImageAnalysisResult(null);
  };

  const handleQuickAnalyzeImage = async () => {
    if (!imageFile) return;
    setAnalyzingImage(true);
    setErrorMessage(null);
    try {
      // Execute both Rice Quality Grading and Rice Variety Identification in parallel
      const [varRes, qualRes] = await Promise.all([
        predictImage(imageFile).catch((err) => ({ error: err.message })),
        predictQuality(imageFile).catch((err) => ({ error: err.message }))
      ]);

      const hasInsect = Boolean(varRes.has_insect || qualRes.has_insect);
      const insectMessage = varRes.insect_message || qualRes.insect_message || (hasInsect ? 'Found insect' : null);
      const insectType = varRes.insect_type || qualRes.insect_type || (hasInsect ? 'Rice Weevil' : null);
      const insectConfidence = varRes.insect_confidence || qualRes.insect_confidence || null;

      const mergedResult = {
        ...varRes,
        has_insect: hasInsect,
        insect_detected: hasInsect,
        insect_message: insectMessage,
        insect_type: insectType,
        insect_confidence: insectConfidence,
        qualityDetails: qualRes.error ? null : qualRes,
        predicted_quality_grade: qualRes.quality_grade,
        detected_condition: qualRes.detected_condition,
        quality_level: qualRes.quality_level,
        quality_confidence: qualRes.confidence,
        quality_probabilities: qualRes.class_probabilities,
        defects_detected: qualRes.defects_detected || (hasInsect ? [`Found insect: ${insectType}`] : []),
        quality_disclaimer: qualRes.disclaimer
      };

      setImageAnalysisResult(mergedResult);

      if (varRes.predicted_variety || varRes.detected_variety) {
        setFormData((prev) => ({
          ...prev,
          variety: varRes.predicted_variety || varRes.detected_variety
        }));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Image analysis failed.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Form Handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyPreset = (preset) => {
    setFormData({
      variety: preset.variety,
      temperature: preset.temperature,
      humidity: preset.humidity,
      moisture: preset.moisture,
      storageDays: preset.storageDays,
      co2: preset.co2 || '',
      o2: preset.o2 || ''
    });
  };

  // Main Submit Handler (Combined Multimodal Prediction)
  const handleAnalyzeRice = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await predictCombined({
        imageFile: imageFile,
        variety: formData.variety,
        temperature: formData.temperature,
        humidity: formData.humidity,
        moisture: formData.moisture,
        storageDays: formData.storageDays,
        co2: formData.co2,
        o2: formData.o2
      });
      setResults(res);
      loadHistory();
      // Scroll to results if needed
      setTimeout(() => {
        const elem = document.getElementById('evaluation-results-section');
        if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete multimodal analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Storage Only Evaluation (Tabular)
  const handleAnalyzeStorageOnly = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await predictCombined({
        imageFile: null,
        variety: formData.variety,
        temperature: formData.temperature,
        humidity: formData.humidity,
        moisture: formData.moisture,
        storageDays: formData.storageDays,
        co2: formData.co2,
        o2: formData.o2
      });
      setResults(res);
      loadHistory();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete storage analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all prediction history? This action cannot be undone.')) {
      try {
        await clearPredictionHistory();
        setHistory([]);
      } catch (err) {
        alert('Failed to clear history: ' + err.message);
      }
    }
  };

  // Page title metadata mapping
  const getPageMeta = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'SmartRice Overview',
          subtitle: 'Monitor rice quality, storage conditions and prediction insights.'
        };
      case 'rice-analysis':
        return {
          title: 'Rice Analysis',
          subtitle: 'Upload grain imagery and configure warehouse storage parameters.'
        };
      case 'predictions':
        return {
          title: 'Storage Condition Analysis',
          subtitle: 'Tabular evaluation for shelf-life estimation and spoilage risk.'
        };
      case 'history':
        return {
          title: 'Prediction History',
          subtitle: 'Review previous SmartRice analyses.'
        };
      case 'reports':
        return {
          title: 'Storage Quality & Risk Reports',
          subtitle: 'Comprehensive analytical summaries and audit reports.'
        };
      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Appearance, account credentials, and system diagnostics.'
        };
      case 'profile':
        return {
          title: 'Profile',
          subtitle: 'Manage your personal information and account details.'
        };
      default:
        return { title: 'Dashboard', subtitle: '' };
    }
  };

  return (
    <div className="industrial-app-container">
      {/* Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        historyCount={history.length}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        backendOnline={backendOnline}
      />

      {/* Main App Layout */}
      <div className={`app-main-viewport ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          pageMeta={getPageMeta()}
          backendOnline={backendOnline}
          onOpenModelStatus={() => setShowModelModal(true)}
          onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNavigateProfile={() => navigateToTab('profile', '/profile')}
          onNavigateSettings={() => navigateToTab('settings')}
        />

        {/* Tab View Content */}
        <main className="app-stage-content" id="main-content" tabIndex={-1}>
          {activeTab === 'dashboard' && (
            <DashboardView
              history={history}
              formData={formData}
              latestResult={results}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'rice-analysis' && (
            <RiceAnalysisView
              imageFile={imageFile}
              previewUrl={previewUrl}
              onImageSelected={handleImageSelected}
              onImageRemoved={handleImageRemoved}
              onQuickAnalyzeImage={handleQuickAnalyzeImage}
              analyzingImage={analyzingImage}
              imageAnalysisResult={imageAnalysisResult}
              formData={formData}
              onFormChange={handleFormChange}
              onApplyPreset={handleApplyPreset}
              onSubmitAnalysis={handleAnalyzeRice}
              isAnalyzing={isAnalyzing}
              results={results}
              errorMessage={errorMessage}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'predictions' && (
            <PredictionsView
              formData={formData}
              onFormChange={handleFormChange}
              onApplyPreset={handleApplyPreset}
              onSubmitStorageAnalysis={handleAnalyzeStorageOnly}
              isAnalyzing={isAnalyzing}
              results={results}
              errorMessage={errorMessage}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              history={history}
              loading={loadingHistory}
              onClear={handleClearHistory}
              onRefresh={loadHistory}
              externalSearch={searchQuery}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView history={history} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              modelStatus={modelStatus}
              backendOnline={backendOnline}
              onRefreshStatus={initSystemStatus}
              onNavigateProfile={() => navigateToTab('profile', '/profile')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              onCancel={() => navigateToTab('dashboard', '/')}
              onSaved={() => {}}
            />
          )}
        </main>
      </div>

      {/* ML / DL Model Diagnostic Modal */}
      <ModelStatusModal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        modelStatus={modelStatus}
        onRefresh={initSystemStatus}
      />
    </div>
  );
}
