
import React from 'react';
import { cn } from '@/lib/utils';

interface TR808ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'orange' | 'amber';
  active?: boolean;
}

const TR808Button: React.FC<TR808ButtonProps> = ({
  onClick,
  children,
  className,
  variant = 'default',
  active = false
}) => {
  const variantClasses = {
    default: 'bg-gradient-to-b from-tr808-silver to-tr808-silver-dark text-tr808-body',
    orange: 'bg-gradient-to-b from-tr808-orange to-tr808-orange-light text-white',
    amber: 'bg-gradient-to-b from-tr808-amber to-[#FFD280] text-tr808-body'
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'tr808-button',
        variantClasses[variant],
        active ? 'shadow-tr808-pressed transform-none' : '',
        className
      )}
    >
      {children}
    </button>
  );
};

export default TR808Button;
