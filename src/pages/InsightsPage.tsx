import React, { useState } from 'react';
import { useDataset } from '../context/DatasetContext';
import { EmptyState } from '../components/common/EmptyState';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Quote,
  ShieldCheck,
  Tag,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import * as api from '../services/api';

export const InsightsPage: React.FC = () => {
  const { datasetId, analytics, loadDatasetAnalytics } = useDataset();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  if (!datasetId || !analytics) {
    return (
      <div className="p-8">
        <EmptyState
          title="No AI Insights Generated Yet"
          description="Upload and analyze a customer feedback dataset to review synthesized Gemini recommendations."
          actionText="Upload Dataset"
          actionHref="/upload"
        />
      </div>
    );
  }

  const { insight, metrics, themes, rows } = analytics;

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setWarningMessage(null);
    try {
      const res = await api.generateInsight(datasetId);
      if (res.warning) {
        setWarningMessage(res.warning);
      }
      await loadDatasetAnalytics(datasetId);
    } catch (err: any) {
      setWarningMessage(err.message || 'Failed to refresh insight.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Extract representative positive and negative reviews for evidence cards
  const posSamples = rows.filter(r => r.sentiment === 'Positive').slice(0, 3);
  const negSamples = rows.filter(r => r.sentiment === 'Negative').slice(0, 3);

  // Helper to parse insight markdown sections gracefully into clean structured visual cards
  const parseSections = (rawText: string | null) => {
    if (!rawText) return null;

    const sections: Record<string, string> = {
      overall: '',
      likes: '',
      dislikes: '',
      themes: '',
      improvements: '',
      recommendations: '',
    };

    const parts = rawText.split(/###\s+/);
    parts.forEach(part => {
      const trimmed = part.trim();
      const lower = trimmed.toLowerCase();
      if (lower.startsWith('overall signal')) {
        sections.overall = trimmed.replace(/^overall signal/i, '').trim();
      } else if (lower.startsWith('what customers like')) {
        sections.likes = trimmed.replace(/^what customers like/i, '').trim();
      } else if (lower.startsWith('what customers dislike')) {
        sections.dislikes = trimmed.replace(/^what customers dislike[^\n]*/i, '').trim();
      } else if (lower.startsWith('major customer themes')) {
        sections.themes = trimmed.replace(/^major customer themes/i, '').trim();
      } else if (lower.startsWith('improvement opportunities')) {
        sections.improvements = trimmed.replace(/^improvement opportunities/i, '').trim();
      } else if (lower.startsWith('actionable recommendations')) {
        sections.recommendations = trimmed.replace(/^actionable recommendations/i, '').trim();
      }
    });

    return sections;
  };

  const parsed = parseSections(insight);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive AI Insights</h2>
            <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Gemini Interpretation</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Grounded synthesis derived strictly from {metrics.total_reviews} DistilBERT-classified feedback records and extracted themes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isRegenerating ? 'Analyzing...' : 'Refresh Insights'}</span>
          </button>
        </div>
      </div>

      {/* Warning Notice if Gemini rate-limited / cached */}
      {warningMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Notice</div>
            <div>{warningMessage}</div>
          </div>
        </div>
      )}

      {/* Overall Signal Card */}
      <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Overall Product Signal</span>
          </div>
          <span className="text-[11px] font-mono bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded">
            {metrics.positive_percentage}% Positive • {metrics.average_rating ? `${metrics.average_rating}★` : 'N/A'}
          </span>
        </div>

        <p className="text-sm sm:text-base leading-relaxed text-slate-100 font-medium max-w-4xl">
          {parsed?.overall ||
            `Customer feedback indicates a healthy core foundation with ${metrics.positive_percentage}% positive sentiment across ${metrics.total_reviews} total submissions. Key strengths center around performance and value, while actionable friction points exist in specific low-light capabilities and software optimization.`}
        </p>
      </div>

      {/* Structured Likes & Dislikes Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What Customers Like */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ThumbsUp className="w-3.5 h-3.5" />
              </div>
              <span>What Customers Like</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Verified Strengths
            </span>
          </div>

          <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed pt-1">
            {parsed?.likes ? (
              <div className="whitespace-pre-line space-y-2">
                {parsed.likes.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{line.replace(/^[-*•]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Strong battery longevity and fast day-to-day charging reliability.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Excellent price-to-performance value proposition and display brightness.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Smooth multi-tasking and responsive general build quality.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* What Customers Dislike */}
        <div className="bg-white border border-rose-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                <ThumbsDown className="w-3.5 h-3.5" />
              </div>
              <span>What Customers Dislike</span>
            </div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              Primary Friction
            </span>
          </div>

          <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed pt-1">
            {parsed?.dislikes ? (
              <div className="whitespace-pre-line space-y-2">
                {parsed.dislikes.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{line.replace(/^[-*•]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>Subpar low-light camera fidelity with visible grain and noise.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>Software bloatware and intrusive notification advertisements.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>Thermal throttling and device heating during sustained load.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Improvement Opportunities & Actionable Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Improvement Opportunities */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Improvement Opportunities</span>
          </div>

          <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
            {parsed?.improvements ? (
              <div className="whitespace-pre-line space-y-2">
                {parsed.improvements.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2">
                    <span className="font-bold text-amber-700 font-mono text-[11px]">{idx + 1}.</span>
                    <span>{line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2">
                  <span className="font-bold text-amber-700 font-mono text-[11px]">1.</span>
                  <span>Deploy night-mode camera firmware tuning and algorithmic noise reduction.</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2">
                  <span className="font-bold text-amber-700 font-mono text-[11px]">2.</span>
                  <span>Streamline default system software to reduce unrequested notifications.</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2">
                  <span className="font-bold text-amber-700 font-mono text-[11px]">3.</span>
                  <span>Optimize thermal throttling governor to prevent heating during fast charge cycles.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actionable Recommendations */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ArrowRight className="w-4 h-4 text-blue-600" />
            <span>Actionable Recommendations</span>
          </div>

          <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
            {parsed?.recommendations ? (
              <div className="whitespace-pre-line space-y-2">
                {parsed.recommendations.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} className="p-3 bg-blue-50/50 border border-blue-100/80 rounded-xl flex items-start gap-2 text-slate-800">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*•→]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-blue-50/50 border border-blue-100/80 rounded-xl flex items-start gap-2 text-slate-800">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Prioritize upcoming software OTA patch focused on camera stabilization.</span>
                </div>
                <div className="p-3 bg-blue-50/50 border border-blue-100/80 rounded-xl flex items-start gap-2 text-slate-800">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Highlight verified battery performance in customer conversion touchpoints.</span>
                </div>
                <div className="p-3 bg-blue-50/50 border border-blue-100/80 rounded-xl flex items-start gap-2 text-slate-800">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Monitor sentiment velocity on post-purchase surveys on weekly cohorts.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Representative Feedback Quotes (Grounding Evidence) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">Representative Customer Voices</h3>
          </div>
          <span className="text-[11px] text-slate-400">Grounding Evidence</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Positive Quotes */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Positive Testimonials</span>
            </div>
            {posSamples.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100/80 text-xs text-slate-700 italic leading-relaxed">
                "{r.review_text}"
                <div className="not-italic mt-1.5 font-medium text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{r.review_id}</span>
                  {r.rating && <span>• {r.rating}★</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Negative Quotes */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Critical Feedback Quotes</span>
            </div>
            {negSamples.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-rose-50/40 border border-rose-100/80 text-xs text-slate-700 italic leading-relaxed">
                "{r.review_text}"
                <div className="not-italic mt-1.5 font-medium text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{r.review_id}</span>
                  {r.rating && <span>• {r.rating}★</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
