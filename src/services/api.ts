import { AnalyticsResponse, ColumnMapping, InsightResponse, ProcessResponse, SentimentResponse, UploadResponse } from '../types';

const API_BASE = '/api';

export async function uploadDataset(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/datasets`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to upload CSV file.' }));
    throw new Error(errorData.detail || 'Failed to upload CSV file.');
  }

  return res.json();
}

export async function processDataset(datasetId: string, mapping: ColumnMapping): Promise<ProcessResponse> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapping }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to process dataset.' }));
    throw new Error(errorData.detail || 'Failed to process dataset.');
  }

  return res.json();
}

export async function analyzeSentiment(datasetId: string): Promise<SentimentResponse> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Sentiment analysis could not be completed.' }));
    throw new Error(errorData.detail || 'Sentiment analysis could not be completed.');
  }

  return res.json();
}

export async function generateInsight(datasetId: string): Promise<InsightResponse> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'AI insight generation is unavailable.' }));
    throw new Error(errorData.detail || 'AI insight generation is unavailable.');
  }

  return res.json();
}

export async function getAnalytics(datasetId: string, page = 1, pageSize = 50): Promise<AnalyticsResponse> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/analytics?page=${page}&page_size=${pageSize}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch analytics.' }));
    throw new Error(errorData.detail || 'Failed to fetch analytics.');
  }

  return res.json();
}

export function getDownloadUrl(datasetId: string): string {
  return `${API_BASE}/datasets/${datasetId}/download`;
}
