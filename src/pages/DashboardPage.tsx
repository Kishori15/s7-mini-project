import React from 'react';
import { Link } from 'react-router-dom';
import { useDataset } from '../context/DatasetContext';
import { MetricCard } from '../components/common/MetricCard';
import { EmptyState } from '../components/common/EmptyState';
import {
  MessageSquare,
  Star,
  Smile,
  Meh,
  Frown,
  TrendingUp,
  Download,
  Sparkles,
  Layers,
  Tag,
  ArrowRight,
  PackageCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { getDownloadUrl } from '../services/api';

const SENTIMENT_COLORS = {
  Positive: '#10b981', // emerald-500
  Neutral: '#94a3b8',  // slate-400
  Negative: '#f43f5e', // rose-500
};

export const DashboardPage: React.FC = () => {
  const { datasetId, filename, analytics } = useDataset();

  if (!datasetId || !analytics) {
    return (
      <div className="p-8">
        <EmptyState
          title="No Analyzed Dataset Found"
          description="Upload a customer feedback CSV and map columns to generate dashboard analytics."
          actionText="Upload Dataset"
          actionHref="/upload"
        />
      </div>
    );
  }

  const {
    metrics,
    sentiment_distribution,
    rating_distribution,
    category_distribution,
    product_distribution,
    date_trend,
    themes,
  } = analytics;

  const pieData = [
    { name: 'Positive', value: sentiment_distribution?.counts?.Positive || 0, color: SENTIMENT_COLORS.Positive },
    { name: 'Neutral', value: sentiment_distribution?.counts?.Neutral || 0, color: SENTIMENT_COLORS.Neutral },
    { name: 'Negative', value: sentiment_distribution?.counts?.Negative || 0, color: SENTIMENT_COLORS.Negative },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Analytics Overview</h2>
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              Live Analysis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Synthesized insights for <span className="font-semibold text-slate-700">{filename}</span> powered by DistilBERT classification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/insights"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>View AI Insights</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
          <a
            href={getDownloadUrl(datasetId)}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Reviews"
          value={metrics.total_reviews.toLocaleString()}
          subtext={`${metrics.total_products || 1} product(s) tracked`}
          icon={MessageSquare}
          accentColor="blue"
        />
        <MetricCard
          label="Average Rating"
          value={metrics.average_rating ? `${metrics.average_rating} ★` : 'N/A'}
          subtext="Out of 5.0 maximum"
          icon={Star}
          accentColor="amber"
          trend={metrics.average_rating && metrics.average_rating >= 4 ? 'positive' : metrics.average_rating && metrics.average_rating < 3 ? 'negative' : 'neutral'}
          trendValue={metrics.average_rating && metrics.average_rating >= 4 ? 'High Score' : metrics.average_rating && metrics.average_rating < 3 ? 'Needs Action' : 'Moderate'}
        />
        <MetricCard
          label="Positive Feedback"
          value={metrics.positive_reviews.toLocaleString()}
          subtext={`${metrics.positive_percentage}% of total feedback`}
          icon={Smile}
          accentColor="emerald"
          trend="positive"
          trendValue={`${metrics.positive_percentage}%`}
        />
        <MetricCard
          label="Neutral Feedback"
          value={metrics.neutral_reviews.toLocaleString()}
          subtext={`${metrics.neutral_percentage}% of total feedback`}
          icon={Meh}
          accentColor="slate"
        />
        <MetricCard
          label="Negative Feedback"
          value={metrics.negative_reviews.toLocaleString()}
          subtext={`${metrics.negative_percentage}% of total feedback`}
          icon={Frown}
          accentColor="rose"
          trend={metrics.negative_percentage > 25 ? 'negative' : 'neutral'}
          trendValue={`${metrics.negative_percentage}%`}
        />
      </div>

      {/* Main Charts: Rating Distribution & Sentiment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rating Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Review volume segmented by 1-star to 5-star customer ratings</p>
            </div>
            <div className="text-xs font-mono font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              1★ to 5★ Scale
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rating_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="rating"
                  tickFormatter={val => `${val} ★`}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-lg">
                          <div className="font-bold">{data.rating} Stars Rating</div>
                          <div className="mt-1 text-slate-300">
                            Count: <span className="text-white font-mono font-semibold">{data.count} reviews</span> ({data.percentage}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Donut Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Sentiment Split</h3>
              <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                DistilBERT SST-2
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Automated NLP sentiment categorization</p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2 rounded-lg shadow-md">
                          <span className="font-semibold">{data.name}:</span> {data.value} reviews
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold text-slate-900">
                {metrics.positive_percentage}%
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Positive
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 text-xs">
            <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <div className="text-emerald-800 font-bold">{sentiment_distribution?.percentages?.Positive || 0}%</div>
              <div className="text-[10px] text-emerald-600 font-medium">Positive</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
              <div className="text-slate-800 font-bold">{sentiment_distribution?.percentages?.Neutral || 0}%</div>
              <div className="text-[10px] text-slate-500 font-medium">Neutral</div>
            </div>
            <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100">
              <div className="text-rose-800 font-bold">{sentiment_distribution?.percentages?.Negative || 0}%</div>
              <div className="text-[10px] text-rose-600 font-medium">Negative</div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Trends (if date column provided) */}
      {date_trend && date_trend.length > 1 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Review Volume & Feedback Trend</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Timeline of feedback submission velocity and sentiment volume</p>
            </div>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={date_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-lg space-y-1">
                          <div className="font-bold">{data.date}</div>
                          <div>Total Reviews: <span className="font-mono">{data.count}</span></div>
                          <div className="text-emerald-400">Positive: {data.positive}</div>
                          <div className="text-rose-400">Negative: {data.negative}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Total Reviews" />
                <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Positive" />
                <Line type="monotone" dataKey="negative" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Negative" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Extracted Customer Themes & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Extracted Themes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Extracted Customer Themes</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">High-frequency keywords & sentiment polarity across feedback</p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
              Local NLP
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {themes && themes.length > 0 ? (
              themes.slice(0, 7).map(theme => (
                <div key={theme.theme} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 capitalize">{theme.theme}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({theme.total} mentions)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      +{theme.positive}
                    </span>
                    {theme.neutral > 0 && (
                      <span className="text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded font-medium">
                        ~{theme.neutral}
                      </span>
                    )}
                    <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-medium">
                      -{theme.negative}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic py-4 text-center">
                No dominant themes found in current dataset.
              </div>
            )}
          </div>
        </div>

        {/* Product / Category Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Segment Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across mapped products & categories</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {((product_distribution && product_distribution.length > 0 ? product_distribution : category_distribution) || []).slice(0, 5).map(item => (
              <div key={item.name} className="p-3 rounded-xl border border-slate-200/70 bg-white space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate max-w-[200px]" title={item.name}>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.avg_rating !== null && (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                        {item.avg_rating} ★
                      </span>
                    )}
                    <span className="font-mono text-slate-500 font-medium">
                      {item.count} reviews
                    </span>
                  </div>
                </div>
                {/* Sentiment Mini Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(item.positive / (item.count || 1)) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Positive: ${item.positive}`}
                  />
                  <div
                    style={{ width: `${(item.neutral / (item.count || 1)) * 100}%` }}
                    className="bg-slate-300 h-full"
                    title={`Neutral: ${item.neutral}`}
                  />
                  <div
                    style={{ width: `${(item.negative / (item.count || 1)) * 100}%` }}
                    className="bg-rose-500 h-full"
                    title={`Negative: ${item.negative}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
