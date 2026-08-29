import React from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText = 'Upload CSV Dataset',
  actionHref = '/upload',
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs my-8">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
        <FileQuestion className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {actionHref && (
        <Link
          to={actionHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{actionText}</span>
        </Link>
      )}
    </div>
  );
};
