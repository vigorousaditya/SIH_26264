import React from 'react';
import { Breadcrumb } from './Breadcrumb';

export const PageHeader = ({
  title,
  subtitle,
  badge,
  breadcrumbs = [],
  breadcrumb,
  actions,
  className = ''
}) => {
  const activeCrumbs = breadcrumbs && breadcrumbs.length > 0 
    ? breadcrumbs 
    : (breadcrumb || []);

  const badgeText = typeof badge === 'object' && badge !== null ? badge.text : badge;
  const badgeVariant = typeof badge === 'object' && badge !== null ? (badge.variant || 'navy') : 'navy';

  let badgeClasses = 'bg-gov-navyMuted text-gov-navy border-gov-navyLight/30';
  if (badgeVariant === 'neutral') {
    badgeClasses = 'bg-gov-borderLight text-gov-textMuted border-gov-border';
  } else if (badgeVariant === 'saffron') {
    badgeClasses = 'bg-gov-saffron/10 text-gov-saffronHover border-gov-saffron/30';
  } else if (badgeVariant === 'red') {
    badgeClasses = 'bg-status-overdueBg text-status-overdue border-status-overdueBorder';
  }

  return (
    <div className={`border-b border-gov-border pb-3 mb-4 bg-white -mx-6 -mt-6 px-6 pt-4 shadow-sm ${className}`}>
      {activeCrumbs.length > 0 && <Breadcrumb items={activeCrumbs} />}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-gov-navy tracking-tight leading-snug">
              {title}
            </h1>
            {badgeText && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-xs border ${badgeClasses}`}>
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gov-textMuted mt-0.5 max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
