import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AnalyticsResponse, ColumnMapping, ProcessingStep, UploadResponse } from '../types';
import * as api from '../services/api';

interface DatasetContextType {
  datasetId: string | null;
  filename: string | null;
  fileSize: number;
  recordCount: number;
  rawColumns: string[];
  suggestedMapping: ColumnMapping | null;
  mapping: ColumnMapping | null;
  previewRows: Record<string, any>[];
  analytics: AnalyticsResponse | null;
  processingStep: ProcessingStep;
  processingError: string | null;
  isProcessing: boolean;
  
  handleFileUpload: (file: File) => Promise<void>;
  updateMapping: (field: string, column: string | null) => void;
  resetToSuggestedMapping: () => void;
  clearAllMappings: () => void;
  runFullAnalysisWorkflow: () => Promise<boolean>;
  loadDatasetAnalytics: (id?: string) => Promise<void>;
  resetDataset: () => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'feedback_analytics_dataset_id';

export const DatasetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [datasetId, setDatasetId] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || null;
  });
  const [filename, setFilename] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [rawColumns, setRawColumns] = useState<string[]>([]);
  const [suggestedMapping, setSuggestedMapping] = useState<ColumnMapping | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    if (datasetId) {
      localStorage.setItem(LOCAL_STORAGE_KEY, datasetId);
      // Attempt load analytics if not yet loaded
      if (!analytics) {
        api.getAnalytics(datasetId).then(data => {
          setAnalytics(data);
          setFilename(data.filename);
          setRecordCount(data.total_records);
        }).catch(() => {
          // session expired on server restart
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setDatasetId(null);
        });
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [datasetId]);

  const handleFileUpload = async (file: File) => {
    setProcessingStep('uploading');
    setProcessingError(null);
    try {
      const data: UploadResponse = await api.uploadDataset(file);
      setDatasetId(data.dataset_id);
      setFilename(data.filename);
      setFileSize(data.file_size);
      setRecordCount(data.record_count);
      setRawColumns(data.columns);
      setSuggestedMapping(data.suggested_mapping);
      setMapping(data.suggested_mapping);
      setPreviewRows(data.preview || []);
      setAnalytics(null);
      setProcessingStep('idle');
    } catch (err: any) {
      setProcessingStep('error');
      setProcessingError(err.message || 'Failed to upload CSV');
      throw err;
    }
  };

  const updateMapping = (field: string, column: string | null) => {
    setMapping(prev => {
      const current = prev ? { ...prev } : ({} as ColumnMapping);
      current[field] = column;
      return current;
    });
  };

  const resetToSuggestedMapping = () => {
    if (suggestedMapping) {
      setMapping({ ...suggestedMapping });
    }
  };

  const clearAllMappings = () => {
    if (mapping) {
      const cleared = {} as ColumnMapping;
      Object.keys(mapping).forEach(key => {
        cleared[key] = null;
      });
      setMapping(cleared);
    }
  };

  const runFullAnalysisWorkflow = async (): Promise<boolean> => {
    if (!datasetId || !mapping) {
      setProcessingError('No dataset or mapping configured.');
      return false;
    }

    if (!mapping.review_text) {
      setProcessingError('Please select a column containing feedback or review text to continue.');
      return false;
    }

    setProcessingError(null);

    try {
      // Step 1: Process Dataset
      setProcessingStep('processing_dataset');
      await api.processDataset(datasetId, mapping);

      // Step 2: DistilBERT Sentiment Analysis
      setProcessingStep('running_distilbert');
      await api.analyzeSentiment(datasetId);

      // Step 3: Local theme extraction is done automatically, now generate insights
      setProcessingStep('generating_insights');
      try {
        await api.generateInsight(datasetId);
      } catch (insightErr) {
        console.warn('Gemini insight generation issue, continuing to dashboard:', insightErr);
      }

      // Step 4: Fetch full analytics
      setProcessingStep('completed');
      const fullAnalytics = await api.getAnalytics(datasetId);
      setAnalytics(fullAnalytics);
      setProcessingStep('idle');
      return true;
    } catch (err: any) {
      setProcessingStep('error');
      setProcessingError(err.message || 'Analysis pipeline encountered an error.');
      return false;
    }
  };

  const loadDatasetAnalytics = async (id?: string) => {
    const targetId = id || datasetId;
    if (!targetId) return;
    try {
      const data = await api.getAnalytics(targetId);
      setAnalytics(data);
      setFilename(data.filename);
      setRecordCount(data.total_records);
    } catch (err: any) {
      console.error('Failed to load dataset analytics:', err);
    }
  };

  const resetDataset = () => {
    setDatasetId(null);
    setFilename(null);
    setFileSize(0);
    setRecordCount(0);
    setRawColumns([]);
    setSuggestedMapping(null);
    setMapping(null);
    setPreviewRows([]);
    setAnalytics(null);
    setProcessingStep('idle');
    setProcessingError(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <DatasetContext.Provider
      value={{
        datasetId,
        filename,
        fileSize,
        recordCount,
        rawColumns,
        suggestedMapping,
        mapping,
        previewRows,
        analytics,
        processingStep,
        processingError,
        isProcessing: processingStep !== 'idle' && processingStep !== 'error',
        handleFileUpload,
        updateMapping,
        resetToSuggestedMapping,
        clearAllMappings,
        runFullAnalysisWorkflow,
        loadDatasetAnalytics,
        resetDataset,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};
