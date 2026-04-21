'use client';

import { cn } from '@/lib/utils';
import type { DrawingStatus } from '@/types';

interface DrawingStatusFlowProps {
  status: DrawingStatus;
}

const STEPS: { key: DrawingStatus | 'revised'; label: string }[] = [
  { key: 'not_started', label: 'Not Started' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
];

// Maps each status to which step index is "active"
const STATUS_STEP_INDEX: Record<DrawingStatus, number> = {
  not_started: 0,
  submitted: 1,
  approved: 2,
  revised: 1, // revised sits at submitted step but shows a branch
};

export function DrawingStatusFlow({ status }: DrawingStatusFlowProps) {
  const activeIndex = STATUS_STEP_INDEX[status];

  return (
    <div className="w-full">
      {/* Main horizontal timeline */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isComplete = activeIndex > index;
          const isCurrent = activeIndex === index && status !== 'revised';
          const isRevised = status === 'revised' && index === 1;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold shrink-0 transition-colors',
                    isComplete
                      ? 'bg-[#8A9A7B] border-[#8A9A7B] text-white'
                      : isCurrent
                        ? 'bg-white border-[#8A9A7B] text-[#8A9A7B]'
                        : isRevised
                          ? 'bg-amber-100 border-amber-500 text-amber-700'
                          : 'bg-white border-[#D1BFA7] text-[#D1BFA7]'
                  )}
                >
                  {isComplete ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium whitespace-nowrap',
                    isComplete
                      ? 'text-[#8A9A7B]'
                      : isCurrent
                        ? 'text-[#2C2A26]'
                        : isRevised
                          ? 'text-amber-700'
                          : 'text-muted-foreground'
                  )}
                >
                  {isRevised ? 'Revision' : step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 mt-[-14px]',
                    activeIndex > index ? 'bg-[#8A9A7B]' : 'bg-[#D1BFA7]'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Revised branch note */}
      {status === 'revised' && (
        <p className="text-[10px] text-amber-600 mt-1.5 text-center">
          Revision requested — upload new version to resubmit
        </p>
      )}
    </div>
  );
}
