import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`bg-white rounded-md border border-gov-border shadow-modal w-full ${maxWidth} transform transition-all overflow-hidden max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-gov-border flex items-center justify-between bg-gov-bg">
          <div>
            <h3 id="modal-title" className="text-sm font-bold text-gov-navy leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xxs text-gov-textMuted mt-0.5">{subtitle}</p>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gov-textLight hover:text-gov-text p-1 rounded-xs hover:bg-slate-200/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto text-xs">
          {children}
        </div>
      </div>
    </div>
  );
};
