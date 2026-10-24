import React from 'react';

/**
 * Rectangular, 2px radius, subtle tinted background, 1px border.
 * Designed for internal Indian administrative systems (NIC / GIGW standard).
 */
export const StatusBadge = ({ status }) => {
  let style = 'bg-status-transferredBg text-status-transferred border-status-transferredBorder';

  switch (status) {
    case 'Pending':
      style = 'bg-status-pendingBg text-status-pending border-status-pendingBorder';
      break;
    case 'Under Process':
      style = 'bg-status-processBg text-status-process border-status-processBorder';
      break;
    case 'Transferred':
      style = 'bg-slate-100 text-slate-700 border-slate-300';
      break;
    case 'Escalated':
      style = 'bg-status-escalatedBg text-status-escalated border-status-escalatedBorder font-semibold';
      break;
    case 'Disposed':
      style = 'bg-status-disposedBg text-status-disposed border-status-disposedBorder font-semibold';
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xxs font-medium rounded-xs border uppercase tracking-wider ${style}`}>
      {status}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (priority) {
    case 'Low':
      style = 'bg-slate-50 text-slate-600 border-slate-200';
      break;
    case 'Medium':
      style = 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
      break;
    case 'High':
      style = 'bg-amber-50 text-amber-900 border-amber-300 font-semibold';
      break;
    case 'Critical':
      style = 'bg-red-50 text-red-900 border-red-300 font-bold';
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-xxs rounded-xs border uppercase tracking-wider ${style}`}>
      {priority}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  let text = 'Official';
  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  if (role === 'admin') {
    text = 'Administrator';
    style = 'bg-gov-navyMuted text-gov-navy border-slate-300 font-semibold';
  } else if (role === 'senior_officer') {
    text = 'Senior Officer';
    style = 'bg-amber-50 text-amber-900 border-amber-200 font-semibold';
  } else if (role === 'official') {
    text = 'Bureau Official';
    style = 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-xxs rounded-xs border uppercase tracking-wider ${style}`}>
      {text}
    </span>
  );
};
