import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataset } from '../context/DatasetContext';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Table,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  RotateCcw,
  XCircle,
  Eye,
  Check
} from 'lucide-react';
import { ProcessingOverlay } from '../components/common/ProcessingOverlay';

const FIELD_DESCRIPTIONS: Record<string, { label: string; desc: string; required?: boolean }> = {
  review_text: { label: 'Review / Feedback Text', desc: 'Main customer feedback content for sentiment & insights', required: true },
  rating: { label: 'Rating (1–5 Stars)', desc: 'Numeric star rating or satisfaction score' },
  review_date: { label: 'Review Date', desc: 'Date of review submission for trend analysis' },
  product_name: { label: 'Product Name', desc: 'Product identifier, model, or title' },
  brand: { label: 'Brand / Manufacturer', desc: 'Company, vendor, or manufacturer name' },
  category: { label: 'Category', desc: 'Product department, type, or segment' },
  review_id: { label: 'Review ID', desc: 'Unique record identifier or ticket number' },
  sentiment: { label: 'Sentiment (if in CSV)', desc: 'Existing sentiment tag (optional)' },
};

const SAMPLE_CSV = `Review ID,Customer Review,Rating,Review Date,Product Name,Category
R101,"The battery life on this device is truly exceptional. It easily lasts two full days with heavy usage. Very satisfied!",5,2024-03-01,Redmi 6 Pro,Electronics
R102,"Terrible camera quality in low light. Pictures come out blurry and grainy. Quite disappointed with the purchase.",1,2024-03-02,Redmi 6 Pro,Electronics
R103,"Good value for money. Screen is crisp and bright, but the speaker volume could be a bit louder.",4,2024-03-03,Redmi 6 Pro,Electronics
R104,"The software has too many intrusive ads and bloatware. It slows down the entire user interface.",2,2024-03-05,Redmi 6 Pro,Electronics
R105,"Fast charging and smooth performance for daily multitasking. Recommended for students and professionals.",5,2024-03-07,Redmi 6 Pro,Electronics
R106,"Decent build quality for the price. Not the fastest phone on the market, but gets standard tasks done reliably.",3,2024-03-10,Redmi 6 Pro,Electronics
R107,"Phone started heating up significantly while playing basic games or charging. Heating issue needs addressing.",2,2024-03-12,Redmi 6 Pro,Electronics
R108,"Outstanding display colors and sleek lightweight design. Really impressed by the overall feel.",5,2024-03-15,Redmi 6 Pro,Electronics
R109,"Fingerprint sensor is slightly sluggish and fails every few attempts. Average device overall.",3,2024-03-18,Redmi 6 Pro,Electronics
R110,"Best budget smartphone I have owned. Battery backup, call reception, and speed are all top notch!",5,2024-03-20,Redmi 6 Pro,Electronics`;

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    datasetId,
    filename,
    fileSize,
    recordCount,
    rawColumns,
    suggestedMapping,
    mapping,
    previewRows,
    processingStep,
    processingError,
    handleFileUpload,
    updateMapping,
    resetToSuggestedMapping,
    clearAllMappings,
    runFullAnalysisWorkflow,
    resetDataset,
  } = useDataset();

  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setLocalError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setLocalError('Please upload a valid .csv file format.');
        return;
      }
      handleFileUpload(file).catch(err => setLocalError(err.message));
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileUpload(file).catch(err => setLocalError(err.message));
    }
  };

  const loadSampleData = () => {
    setLocalError(null);
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const file = new File([blob], 'customer_reviews_sample.csv', { type: 'text/csv' });
    handleFileUpload(file).catch(err => setLocalError(err.message));
  };

  const handleStartAnalysis = async () => {
    if (!mapping?.review_text) {
      setLocalError('Please map the required Review Text field to continue.');
      return;
    }
    setLocalError(null);
    const success = await runFullAnalysisWorkflow();
    if (success) {
      navigate('/dashboard');
    }
  };

  // Helper to get sample preview value for a given column name
  const getSampleValueForColumn = (colName: string | null): string | null => {
    if (!colName || !previewRows || previewRows.length === 0) return null;
    for (const row of previewRows) {
      const val = row[colName];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val);
      }
    }
    return null;
  };

  // Compute mapping stats
  const totalFields = Object.keys(FIELD_DESCRIPTIONS).length;
  const mappedCount = mapping ? Object.values(mapping).filter(Boolean).length : 0;
  const autoMappedCount = suggestedMapping ? Object.values(suggestedMapping).filter(Boolean).length : 0;

  // Build reverse map from CSV column to assigned Standard Field label
  const columnToFieldLabelMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (mapping) {
      Object.entries(mapping).forEach(([fieldKey, colName]) => {
        if (colName) {
          map[colName] = FIELD_DESCRIPTIONS[fieldKey]?.label || fieldKey;
        }
      });
    }
    return map;
  }, [mapping]);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Upload & Configure Dataset</h2>
        <p className="text-xs text-slate-500 mt-1">
          Import your customer review CSV. Columns are automatically mapped upon upload, and you can freely adjust or override any mapping.
        </p>
      </div>

      {/* Upload Box / Dropzone */}
      {!datasetId ? (
        <div className="space-y-4">
          <div
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all bg-white ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Drag & drop your customer feedback CSV here
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Automatic column detection instantly matches feedback, ratings, dates, and products
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              Browse Files
            </button>
          </div>

          {/* Sample Dataset Button */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>Want to test quickly?</span>
            <button
              type="button"
              onClick={loadSampleData}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Sample Review Dataset (Redmi 6 Pro)
            </button>
          </div>
        </div>
      ) : (
        /* File Meta Card */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{filename}</span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                <span>{(fileSize / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span className="font-mono text-slate-700 font-medium">{recordCount.toLocaleString()} rows</span>
                <span>•</span>
                <span>{rawColumns.length} columns detected</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetDataset}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change File</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Notices */}
      {(localError || processingError) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Attention Required</div>
            <div>{localError || processingError}</div>
          </div>
        </div>
      )}

      {/* Column Mapping Section */}
      {datasetId && mapping && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Automatic Mapping Announcement Banner */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-900 flex items-center gap-2">
                  <span>Automatic Column Mapping Applied</span>
                  <span className="bg-blue-200/70 text-blue-800 text-[10px] px-2 py-0.2 rounded-full font-semibold">
                    {mappedCount} of {totalFields} mapped
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Columns were automatically matched from your CSV. If you are satisfied, click <span className="font-semibold">Process Dataset</span> below. You can also customize or change any column mapping if needed.
                </p>
              </div>
            </div>

            {/* Quick Mapping Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={resetToSuggestedMapping}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Restore the initial auto-detected mappings"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Auto-Mapped</span>
              </button>
              <button
                type="button"
                onClick={clearAllMappings}
                className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all mappings to select manually"
              >
                <XCircle className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Review & Customize Column Mappings</h3>
            </div>
            <div className="text-[11px] text-slate-500">
              <span className="text-amber-600 font-semibold">*</span> <span className="font-medium text-slate-700">Review Text</span> is required for DistilBERT & Gemini NLP
            </div>
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(FIELD_DESCRIPTIONS).map(([fieldKey, info]) => {
              const selectedValue = mapping[fieldKey] || '';
              const suggestedValue = suggestedMapping?.[fieldKey] || '';
              const isRequired = info.required;
              const isMapped = !!selectedValue;
              const isAutoDetected = isMapped && selectedValue === suggestedValue;
              const isCustomOverride = isMapped && selectedValue !== suggestedValue;
              const sampleVal = getSampleValueForColumn(selectedValue);

              return (
                <div
                  key={fieldKey}
                  className={`border rounded-xl p-4 transition-all flex flex-col justify-between ${
                    isRequired && !isMapped
                      ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300/50'
                      : isCustomOverride
                      ? 'border-indigo-200 bg-indigo-50/20'
                      : isAutoDetected
                      ? 'border-slate-200 bg-slate-50/40'
                      : 'border-slate-200/60 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{info.label}</span>
                        {isRequired ? (
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                        )}
                      </label>

                      {/* Mapping Status Badge */}
                      {isAutoDetected && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Auto-Mapped
                        </span>
                      )}
                      {isCustomOverride && (
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5 text-indigo-600" /> Custom Mapped
                        </span>
                      )}
                      {!isMapped && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                          Unmapped
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">{info.desc}</p>
                  </div>

                  <div className="space-y-2 mt-1">
                    <select
                      value={selectedValue}
                      onChange={e => updateMapping(fieldKey, e.target.value || null)}
                      className={`w-full text-xs rounded-lg px-3 py-2 border bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer transition-colors ${
                        isRequired && !selectedValue
                          ? 'border-amber-300 ring-1 ring-amber-200'
                          : isCustomOverride
                          ? 'border-indigo-300 text-indigo-950 font-semibold'
                          : 'border-slate-300'
                      }`}
                    >
                      <option value="">-- Do not map --</option>
                      {rawColumns.map(col => (
                        <option key={col} value={col}>
                          {col} {suggestedValue === col ? '(Auto-Detected)' : ''}
                        </option>
                      ))}
                    </select>

                    {/* Live Sample Value Preview */}
                    {isMapped && sampleVal && (
                      <div className="text-[11px] bg-white border border-slate-200/80 rounded-md p-2 flex items-start gap-1.5 text-slate-600">
                        <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="truncate">
                          <span className="font-semibold text-slate-700">Sample: </span>
                          <span className="italic text-slate-600" title={sampleVal}>"{sampleVal}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Trigger */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Clicking Process will automatically run DistilBERT sentiment scoring and Gemini business insights.</span>
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={!mapping.review_text}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                mapping.review_text
                  ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-500/20'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <span>Process Dataset & Launch Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Data Preview Table with Active Mapping Annotations */}
      {datasetId && previewRows.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Dataset Preview (First 10 Rows)</h3>
            </div>
            <div className="text-[11px] text-slate-500">
              Headers show current mapping assignments
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  {rawColumns.map(col => {
                    const mappedFieldLabel = columnToFieldLabelMap[col];
                    return (
                      <th key={col} className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{col}</div>
                        {mappedFieldLabel ? (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            <Check className="w-2.5 h-2.5" />
                            <span>{mappedFieldLabel}</span>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] font-normal text-slate-400 italic">
                            Unmapped
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    {rawColumns.map(col => (
                      <td key={col} className="px-4 py-2.5 max-w-xs truncate" title={String(row[col] ?? '')}>
                        {String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Processing Screen Overlay */}
      <ProcessingOverlay
        step={processingStep}
        error={processingError}
        onRetry={handleStartAnalysis}
      />
    </div>
  );
};
