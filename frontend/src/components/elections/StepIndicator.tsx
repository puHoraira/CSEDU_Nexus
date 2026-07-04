import { Check } from 'lucide-react';

/**
 * Steps reflect the actual voting flow:
 *   0 — Camera setup
 *   1 — Recording & Voting (simultaneous — voter selects candidate and votes while being recorded)
 *   2 — Uploading (recording uploads after vote is cast)
 *   3 — Done
 */
const STEPS = ['Camera', 'Record & Vote', 'Uploading', 'Done'] as const;

export interface StepIndicatorProps {
  currentStep: 0 | 1 | 2 | 3;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center w-full px-4 py-3">
      {STEPS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isCurrent   = index === currentStep;
        const isFuture    = index > currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={[
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300',
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1'
                      : 'bg-gray-200 text-gray-400',
                ].join(' ')}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted
                  ? <Check size={14} strokeWidth={3} aria-hidden="true" />
                  : <span>{index + 1}</span>}
              </div>
              <span
                className={[
                  'text-xs font-medium whitespace-nowrap',
                  isCompleted ? 'text-blue-600' : isCurrent ? 'text-blue-700' : 'text-gray-400',
                  isFuture ? 'opacity-60' : '',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div
                className={[
                  'flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-300',
                  index < currentStep ? 'bg-blue-500' : 'bg-gray-200',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
