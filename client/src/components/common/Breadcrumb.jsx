import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb = ({ items = [] }) => {
  return (
    <nav className="flex items-center text-xs text-gov-textLight space-x-1.5 mb-2 font-medium" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-gov-navy flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            {isLast || !item.path ? (
              <span className="text-gov-text font-semibold truncate max-w-[240px]">
                {item.label}
              </span>
            ) : (
              <Link to={item.path} className="hover:text-gov-navy truncate max-w-[200px]">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
