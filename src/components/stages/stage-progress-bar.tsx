interface StageProgressBarProps {
  percent: number;
  label?: string;
  showLabel?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

const heightClass = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function StageProgressBar({
  percent,
  label,
  showLabel = false,
  height = 'md',
}: StageProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const displayPercent = Math.round(clamped * 10) / 10;

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-xs font-medium text-[#2C2A26]">{label}</span>
          )}
          {showLabel && (
            <span className="text-xs font-semibold text-[#8A9A7B] ml-auto">
              {displayPercent}%
            </span>
          )}
        </div>
      )}
      {/* Sand track */}
      <div
        className={`w-full rounded-full bg-[#D1BFA7] ${heightClass[height]}`}
        role="progressbar"
        aria-valuenow={displayPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${displayPercent}% complete`}
      >
        {/* Sage fill */}
        <div
          className={`rounded-full bg-[#8A9A7B] transition-all duration-300 ${heightClass[height]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
