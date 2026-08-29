import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Sparkles, UploadCloud, Database, Cpu, MessageSquare } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export const Sidebar: React.FC = () => {
  const { datasetId, filename, analytics } = useDataset();

  const navItems = [
    {
      to: '/upload',
      label: 'Upload & Map',
      icon: UploadCloud,
      badge: datasetId ? 'Ready' : null,
    },
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      disabled: !datasetId || !analytics,
    },
    {
      to: '/sentiment',
      label: 'Sentiment Analysis',
      icon: BarChart3,
      disabled: !datasetId || !analytics,
      tag: 'DistilBERT',
    },
    {
      to: '/insights',
      label: 'AI Insights',
      icon: Sparkles,
      disabled: !datasetId || !analytics,
      tag: 'Gemini',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm tracking-tight">FeedbackAI</div>
            <div className="text-[11px] text-slate-500 font-medium">Customer Analytics</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            if (item.disabled) {
              return (
                <div
                  key={item.to}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-slate-300 cursor-not-allowed select-none"
                  title="Complete dataset processing to unlock"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-300" />
                    <span>{item.label}</span>
                  </div>
                  {item.tag && (
                    <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {item.tag}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{item.label}</span>
                </div>
                {item.tag && (
                  <span className="text-[10px] bg-blue-100/70 text-blue-700 font-semibold px-1.5 py-0.5 rounded font-mono">
                    {item.tag}
                  </span>
                )}
                {item.badge && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Dataset Footprint */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Active Dataset</span>
        </div>
        {filename ? (
          <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 text-xs space-y-1">
            <div className="font-semibold text-slate-800 truncate" title={filename}>
              {filename}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Status</span>
              <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                {analytics ? 'Analyzed' : 'Mapped'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No dataset active.</div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span>NLP Engine:</span>
          </div>
          <span className="font-mono text-slate-700 font-medium">DistilBERT</span>
        </div>
      </div>
    </aside>
  );
};
