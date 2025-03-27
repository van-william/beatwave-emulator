import React from 'react';
import { cn } from '@/lib/utils';

export interface TR808ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'orange' | 'amber';
  disabled?: boolean;
}

const TR808Button: React.FC<TR808ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'default',
  disabled = false
}) => {
  const baseClasses = "px-3 py-2 rounded-md flex items-center justify-center transition-colors";
  const variantClasses = {
    default: "bg-tr808-panel hover:bg-tr808-silver-dark/30 text-tr808-silver",
    orange: "bg-tr808-orange hover:bg-tr808-orange/90 text-tr808-body",
    amber: "bg-tr808-amber hover:bg-tr808-amber/90 text-tr808-body"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        disabled && "opacity-50 cursor-not-allowed hover:bg-tr808-panel"
      )}
    >
      {children}
    </button>
  );
};

export default TR808Button;
