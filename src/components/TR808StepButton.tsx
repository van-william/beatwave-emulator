
import React from 'react';
import { cn } from '@/lib/utils';

interface TR808StepButtonProps {
  active: boolean;
  onClick: () => void;
  isCurrentStep?: boolean;
  label?: string | number;
}

const TR808StepButton: React.FC<TR808StepButtonProps> = ({
  active,
  onClick,
  isCurrentStep = false,
  label
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'tr808-step-button relative',
        active ? 'active' : '',
        isCurrentStep && 'ring-2 ring-tr808-orange-light ring-offset-1 ring-offset-tr808-panel'
      )}
    >
      {label !== undefined && (
        <span className="absolute bottom-0.5 text-[0.6rem] opacity-60">
          {label}
        </span>
      )}
      <div 
        className={cn(
          'tr808-led absolute top-1 right-1',
          isCurrentStep ? 'tr808-led-on animate-pulse-light' : 'tr808-led-off'
        )}
      />
    </button>
  );
};

export default TR808StepButton;
