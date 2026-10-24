import React from 'react';

export const Skeleton = ({ className = '', rows = 1 }) => {
  if (rows > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className={`h-4 bg-slate-200/70 animate-pulse rounded-xs ${className}`} />
        ))}
      </div>
    );
  }
  return <div className={`h-4 bg-slate-200/70 animate-pulse rounded-xs ${className}`} />;
};

export const TableSkeleton = ({ columns = 5, rows = 6 }) => {
  return (
    <div className="w-full border border-gov-border rounded-sm bg-white overflow-hidden">
      <div className="h-8 bg-slate-100/80 border-b border-gov-border animate-pulse" />
      <div className="divide-y divide-gov-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className="h-3.5 bg-slate-200/60 rounded-xs animate-pulse flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
