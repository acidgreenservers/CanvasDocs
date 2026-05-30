import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-1 ${className}`}
      {...props}
    />
  );
}