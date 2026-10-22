/**
 * Smart Rice AI - Frontend API Service.
 * Connects React UI to FastAPI backend endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return response.json();
}

export async function getModelStatus() {
  const response = await fetch(`${API_BASE_URL}/model/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch model status: ${response.statusText}`);
  }
  return response.json();
}

export async function predictTabular(data) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Prediction error (${response.status})`);
  }
  return response.json();
}

export async function predictImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/predict/image`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Image prediction error (${response.status})`);
  }
  return response.json();
}

export async function predictQuality(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/predict/quality`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Quality prediction error (${response.status})`);
  }
  return response.json();
}

export async function getQualityModelStatus() {
  const response = await fetch(`${API_BASE_URL}/model/quality/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quality model status: ${response.statusText}`);
  }
  return response.json();
}

export async function predictCombined({ imageFile, variety, temperature, humidity, moisture, storageDays, co2, o2 }) {
  const formData = new FormData();
  if (imageFile) {
    formData.append('image', imageFile);
  }
  formData.append('rice_variety', variety);
  formData.append('temperature', temperature);
  formData.append('humidity', humidity);
  formData.append('moisture_content', moisture);
  formData.append('storage_days', storageDays);

  if (co2 !== undefined && co2 !== null && co2 !== '') {
    formData.append('co2', co2);
  }
  if (o2 !== undefined && o2 !== null && o2 !== '') {
    formData.append('o2', o2);
  }

  const response = await fetch(`${API_BASE_URL}/predict/combined`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Combined prediction error (${response.status})`);
  }
  return response.json();
}

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export async function fetchHistory(limit = 50) {
  // 1. Try FastAPI backend (which syncs Supabase & SQLite)
  try {
    const response = await fetch(`${API_BASE_URL}/history?limit=${limit}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (backendErr) {
    console.warn('[History] Backend fetch failed, checking direct Supabase client:', backendErr);
  }

  // 2. Direct Supabase fallback
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .table('prediction_history')
        .select('*')
        .order('id', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data;
      }
    } catch (sbErr) {
      console.warn('[History] Direct Supabase fetch error:', sbErr);
    }
  }

  return [];
}

export async function clearPredictionHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/history`, {
      method: 'DELETE',
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (backendErr) {
    console.warn('[Clear History] Backend failed, clearing direct Supabase:', backendErr);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.table('prediction_history').delete().gt('id', 0);
    } catch (sbErr) {
      console.warn('[Clear History] Supabase direct clear error:', sbErr);
    }
  }

  return { status: 'success', message: 'Prediction history cleared.' };
}
