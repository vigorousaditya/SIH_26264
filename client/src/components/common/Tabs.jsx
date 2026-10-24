import React from 'react';

export const Tabs = ({ tabs = [], activeTab, onChange, className = '' }) => {
  return (
    <div className={`border-b border-gov-border flex items-center gap-1 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none ${
              isActive
                ? 'border-gov-saffron text-gov-navy bg-white -mb-[1px]'
                : 'border-transparent text-gov-textMuted hover:text-gov-text hover:border-slate-300'
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xxs px-1.5 py-0.2 rounded-xs font-mono font-bold ${
                isActive ? 'bg-gov-navy text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
