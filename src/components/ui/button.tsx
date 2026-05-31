import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_STYLES: Record<string, string> = {
  primary: 'text-white font-semibold shadow-[0_4px_12px_rgba(59,110,248,0.3)]',
  danger: 'text-white font-semibold shadow-[0_4px_12px_rgba(220,38,38,0.3)]',
  ghost: 'bg-[#21262d] text-[#e6edf3] border border-[#30363d] hover:bg-[#30363d] hover:border-[#484f58]',
  default: 'text-white font-semibold shadow-[0_4px_12px_rgba(59,110,248,0.3)]',
};

export function Button({ 
  children, 
  className = '', 
  variant = 'default',
  size = 'md',
  ...props 
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all ${sizeClasses[size]} ${VARIANT_STYLES[variant]} ${className}`}
      style={{ background: variant === 'primary' || variant === 'default' ? '#3b6ef8' : variant === 'danger' ? '#dc2626' : variant === 'ghost' ? undefined : '#3b6ef8' }}
      onMouseEnter={(e) => {
        if (variant !== 'ghost') {
          e.currentTarget.style.background = variant === 'danger' ? '#b91c1c' : '#2d5ce8';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant !== 'ghost') {
          e.currentTarget.style.background = variant === 'danger' ? '#dc2626' : '#3b6ef8';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}