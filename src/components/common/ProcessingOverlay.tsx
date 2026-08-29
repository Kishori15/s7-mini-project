import React from 'react';
import { CheckCircle2, Circle, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { ProcessingStep } from '../../types';

interface ProcessingOverlayProps {
  step: ProcessingStep;
  error?: string | null;
  onRetry?: () => void;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ step, error, onRetry }) => {
  if (step === 'idle') return null;

  const isStepDone = (target: string) => {
    const order = ['uploading', 'processing_dataset', 'running_distilbert', 'generating_insights', 'completed'];
    const currentIndex = order.indexOf(step);
    const targetIndex = order.indexOf(target);
    return currentIndex > targetIndex || step === 'completed';
  };

  const isStepActive = (target: string) => {
    return step === target;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            {error ? (
              <AlertCircle className="w-6 h-6 text-rose-600" />
            ) : (
              <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {error ? 'Analysis Encountered an Error' : 'Analyzing Customer Feedback'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {error ? error : 'Executing automatic DistilBERT NLP and Gemini AI insights'}
          </p>
        </div>

        {/* Workflow Checklist */}
        <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs">
          {/* Step 1: Upload */}
          <div className="flex items-center gap-3">
            {isStepDone('uploading') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : isStepActive('uploading') ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
            )}
            <span className={isStepDone('uploading') ? 'text-slate-800 font-medium' : isStepActive('uploading') ? 'text-blue-700 font-semibold' : 'text-slate-400'}>
              Dataset uploaded & columns detected
            </span>
          </div>

          {/* Step 2: Processing Dataset */}
          <div className="flex items-center gap-3">
            {isStepDone('processing_dataset') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : isStepActive('processing_dataset') ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
            )}
            <span className={isStepDone('processing_dataset') ? 'text-slate-800 font-medium' : isStepActive('processing_dataset') ? 'text-blue-700 font-semibold' : 'text-slate-400'}>
              Data cleaning & column mapping confirmed
            </span>
          </div>

          {/* Step 3: DistilBERT Sentiment */}
          <div className="flex items-start gap-3">
            {isStepDone('running_distilbert') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : isStepActive('running_distilbert') ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
            )}
            <div>
              <div className={isStepDone('running_distilbert') ? 'text-slate-800 font-medium' : isStepActive('running_distilbert') ? 'text-blue-700 font-semibold' : 'text-slate-400'}>
                Running local DistilBERT sentiment analysis
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                No Gemini API usage for sentiment classification (Local SST-2 model)
              </div>
            </div>
          </div>

          {/* Step 4: Extracting Themes & Gemini Insights */}
          <div className="flex items-start gap-3">
            {isStepDone('generating_insights') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : isStepActive('generating_insights') ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
            )}
            <div>
              <div className={isStepDone('generating_insights') ? 'text-slate-800 font-medium' : isStepActive('generating_insights') ? 'text-blue-700 font-semibold' : 'text-slate-400'}>
                Extracting customer themes & generating AI insights
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Analyzing patterns, themes and representative feedback
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onRetry}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="mt-6 text-center text-xs text-slate-400">
            Please wait while the analytics dashboard is prepared...
          </div>
        )}
      </div>
    </div>
  );
};
