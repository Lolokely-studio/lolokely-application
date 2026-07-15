const SIZE_MAP = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const LINE_WIDTHS = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3'];

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--surface-muted)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 'md', className = '' }) {
  return (
    <Skeleton
      className={`shrink-0 rounded-full ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
    />
  );
}

export default Skeleton;
