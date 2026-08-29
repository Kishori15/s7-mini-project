import React from 'react';
import { useDataset } from '../../context/DatasetContext';
import { Download, FileText, RefreshCw, Cpu, Sparkles } from 'lucide-react';
import { getDownloadUrl } from '../../services/api';

export const Header: React.FC<{ onToggleSidebar?: () => void }> = () => {
  const { datasetId, filename, recordCount, analytics, resetDataset } = useDataset();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Customer Feedback Intelligence</span>
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            Local DistilBERT NLP + Gemini AI Executive Insights
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {datasetId && (
          <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200/80 px-3 py-1.5 rounded-lg text-xs">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-800 max-w-[140px] truncate" title={filename || 'Dataset'}>
              {filename || 'dataset.csv'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-mono">
              {(analytics?.total_records || recordCount || 0).toLocaleString()} reviews
            </span>
          </div>
        )}

        {datasetId && analytics && (
          <a
            href={getDownloadUrl(datasetId)}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
            title="Download enriched CSV with sentiment tags"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Download CSV</span>
          </a>
        )}

        {datasetId && (
          <button
            onClick={resetDataset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Upload a new dataset"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Dataset</span>
          </button>
        )}
      </div>
    </header>
  );
};
