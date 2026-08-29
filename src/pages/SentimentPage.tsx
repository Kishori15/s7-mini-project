import React, { useState, useMemo } from 'react';
import { useDataset } from '../context/DatasetContext';
import { EmptyState } from '../components/common/EmptyState';
import { Cpu, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Smile, Meh, Frown, CheckCircle2 } from 'lucide-react';
import { ReviewRecord, SentimentType } from '../types';

export const SentimentPage: React.FC = () => {
  const { datasetId, analytics } = useDataset();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('ALL');
  const [selectedRating, setSelectedRating] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  if (!datasetId || !analytics) {
    return (
      <div className="p-8">
        <EmptyState
          title="No Sentiment Data Available"
          description="Upload and process a customer feedback CSV dataset to inspect DistilBERT sentiment classifications."
          actionText="Upload Dataset"
          actionHref="/upload"
        />
      </div>
    );
  }

  const { rows, sentiment_distribution, metrics } = analytics;

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      // Search
      if (searchTerm) {
        const text = (r.review_text || '').toLowerCase();
        const id = (r.review_id || '').toLowerCase();
        const prod = (r.product_name || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        if (!text.includes(term) && !id.includes(term) && !prod.includes(term)) {
          return false;
        }
      }
      // Sentiment
      if (selectedSentiment !== 'ALL' && r.sentiment !== selectedSentiment) {
        return false;
      }
      // Rating
      if (selectedRating !== 'ALL') {
        const targetRating = parseInt(selectedRating);
        if (Math.round(r.rating || 0) !== targetRating) {
          return false;
        }
      }
      return true;
    });
  }, [rows, searchTerm, selectedSentiment, selectedRating]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  const getSentimentBadge = (sentiment: SentimentType, confidence?: number | null) => {
    if (sentiment === 'Positive') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <Smile className="w-3.5 h-3.5" />
          <span>Positive</span>
          {confidence && <span className="text-[10px] opacity-75 font-mono">({Math.round(confidence * 100)}%)</span>}
        </span>
      );
    }
    if (sentiment === 'Negative') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
          <Frown className="w-3.5 h-3.5" />
          <span>Negative</span>
          {confidence && <span className="text-[10px] opacity-75 font-mono">({Math.round(confidence * 100)}%)</span>}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Meh className="w-3.5 h-3.5" />
        <span>Neutral</span>
        {confidence && <span className="text-[10px] opacity-75 font-mono">({Math.round(confidence * 100)}%)</span>}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Page Header with DistilBERT Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sentiment Analysis</h2>
            <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200/60 flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>DistilBERT SST-2</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review-level classification executed locally on CPU with SST-2 neutral-thresholding. No Gemini API tokens used for sentiment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="font-semibold text-slate-800">100% Classified</div>
              <div className="text-[10px] text-slate-400 font-mono">{metrics.total_reviews} reviews analyzed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Sentiment Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            <span>Positive Feedback</span>
            <Smile className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {sentiment_distribution.counts.Positive.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
              {sentiment_distribution.percentages.Positive}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Reviews expressing overall praise, high satisfaction, or strong endorsement.</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs bg-gradient-to-b from-slate-50/50 to-white">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <span>Neutral / Mixed</span>
            <Meh className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {sentiment_distribution.counts.Neutral.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
              {sentiment_distribution.percentages.Neutral}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Balanced, factual, or mixed reviews falling below the 0.60 SST-2 polarity threshold.</p>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-2xl p-5 shadow-xs bg-gradient-to-b from-rose-50/20 to-white">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 uppercase tracking-wider">
            <span>Negative Feedback</span>
            <Frown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {sentiment_distribution.counts.Negative.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg">
              {sentiment_distribution.percentages.Negative}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Customer dissatisfaction, complaints, defect reports, or critical friction points.</p>
        </div>
      </div>

      {/* Review-Level Exploration Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search feedback text, product, or review ID..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Sentiment:</span>
            </div>
            <select
              value={selectedSentiment}
              onChange={e => {
                setSelectedSentiment(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Sentiments</option>
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Negative">Negative</option>
            </select>

            <select
              value={selectedRating}
              onChange={e => {
                setSelectedRating(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Stars</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        {/* Results Counter */}
        <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
          <span>
            Showing <span className="font-semibold text-slate-800">{filteredRows.length}</span> matching feedback records
          </span>
          <span className="text-[11px] text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="px-4 py-3 w-28 whitespace-nowrap">Review ID</th>
                <th className="px-4 py-3">Customer Feedback Text</th>
                <th className="px-4 py-3 w-24 whitespace-nowrap">Rating</th>
                <th className="px-4 py-3 w-36 whitespace-nowrap">Sentiment</th>
                <th className="px-4 py-3 w-32 whitespace-nowrap">Product / Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((r, idx) => (
                  <tr key={r.review_id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {r.review_id}
                    </td>
                    <td className="px-4 py-3 max-w-lg leading-relaxed text-slate-800">
                      {r.review_text}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.rating !== null && r.rating !== undefined ? (
                        <span className="font-semibold text-slate-900 flex items-center gap-1">
                          <span>{r.rating}</span>
                          <span className="text-amber-500">★</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getSentimentBadge(r.sentiment, r.sentiment_confidence)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {r.product_name && r.product_name !== 'Unknown Product' ? (
                        <span className="font-medium text-slate-800">{r.product_name}</span>
                      ) : r.category && r.category !== 'Uncategorized' ? (
                        <span className="text-slate-600">{r.category}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 italic">
                    No customer feedback records matched the search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
