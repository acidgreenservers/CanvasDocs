import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-1 resize-vertical ${className}`}
      {...props}
    />
  );
}