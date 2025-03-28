import React from 'react';
import { cn } from '@/lib/utils';

interface TR808ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

export const TR808Button: React.FC<TR808ButtonProps> = ({
  children,
  onClick,
  active = false,
  disabled = false,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-medium transition-colors
        ${active ? 'bg-tr808-orange text-white' : 'bg-tr808-black/90 text-tr808-cream border border-tr808-orange'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-tr808-orange-light'}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
