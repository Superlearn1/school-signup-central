
import React from 'react';
import { Check } from 'lucide-react';
import { StepIndicatorProps } from '@/types';

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <div
              className={`step-line ${index <= currentStep ? 'completed' : ''}`}
            ></div>
          )}
          <div className="step">
            <div
              className={`step-circle ${
                index < currentStep
                  ? 'completed'
                  : index === currentStep
                  ? 'active'
                  : ''
              }`}
            >
              {index < currentStep ? (
                <Check size={16} />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span className="text-xs mt-1">{step}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;
