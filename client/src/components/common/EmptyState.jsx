import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items matching the selected criteria.',
  action
}) => {
  return (
    <div className="py-12 px-4 text-center border border-dashed border-gov-border rounded-sm bg-slate-50/50 my-2">
      <div className="w-10 h-10 rounded-sm bg-white border border-gov-border flex items-center justify-center mx-auto text-gov-textLight mb-2.5">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="text-sm font-bold text-gov-text">{title}</h3>
      <p className="text-xs text-gov-textMuted mt-1 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-3.5">
          {action}
        </div>
      )}
    </div>
  );
};
