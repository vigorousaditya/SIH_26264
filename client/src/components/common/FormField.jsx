import React from 'react';

export const FormField = ({
  label,
  required = false,
  error,
  helpText,
  id,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-gov-text">
          {label} {required && <span className="text-status-overdue font-bold" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {helpText && !error && (
        <p className="text-xxs text-gov-textLight">{helpText}</p>
      )}
      {error && (
        <p className="text-xxs font-semibold text-status-overdue flex items-center gap-1" role="alert">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
};
