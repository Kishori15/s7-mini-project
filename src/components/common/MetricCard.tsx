import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: 'positive' | 'negative' | 'neutral';
  trendValue?: string;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  accentColor = 'slate',
}) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const iconBgMap = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          {label}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgMap[accentColor]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </div>
        {trendValue && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              trend === 'positive'
                ? 'text-emerald-700 bg-emerald-50'
                : trend === 'negative'
                ? 'text-rose-700 bg-rose-50'
                : 'text-slate-600 bg-slate-100'
            }`}
          >
            {trendValue}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-1.5 text-xs text-slate-500 font-medium">
          {subtext}
        </div>
      )}
    </div>
  );
};
