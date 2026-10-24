import React from 'react';

export const Button = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'danger', 'link', 'outline'
  size = 'md',        // 'sm', 'md', 'lg'
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  title,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gov-saffron disabled:opacity-60 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 rounded-sm gap-1.5 leading-tight',
    md: 'text-xs px-3.5 py-1.5 rounded-sm gap-2 leading-tight',
    lg: 'text-sm px-4 py-2 rounded-sm gap-2'
  };

  const variantClasses = {
    primary: 'bg-gov-saffron hover:bg-gov-saffronHover text-white border-gov-saffronHover shadow-card font-semibold active:bg-gov-saffronHover',
    secondary: 'bg-white hover:bg-slate-50 text-gov-text border-gov-border shadow-card hover:border-slate-300 active:bg-slate-100',
    navy: 'bg-gov-navy hover:bg-gov-navyLight text-white border-gov-navyDark shadow-card font-semibold active:bg-gov-navyDark',
    danger: 'bg-status-overdueBg hover:bg-red-100 text-status-overdue border-status-overdueBorder font-medium',
    link: 'bg-transparent hover:underline text-gov-navy border-transparent p-0 shadow-none font-semibold',
    outline: 'bg-transparent hover:bg-gov-navyMuted text-gov-navy border-gov-navy font-semibold'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );
};
