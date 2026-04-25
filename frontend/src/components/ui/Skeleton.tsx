import { HTMLAttributes, forwardRef } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  rounded?: boolean;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, circle, rounded, style, ...props }, ref) => (
    <div
      ref={ref}
      className="skeleton"
      style={{
        width: width ?? '100%',
        height: height ?? '1em',
        borderRadius: circle ? '50%' : rounded ? 999 : 8,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
);
Skeleton.displayName = 'Skeleton';

export function SkeletonCard() {
  return (
    <div className="ui-card">
      <Skeleton height={180} style={{ borderRadius: '20px 20px 0 0', marginBottom: 16 }} />
      <Skeleton height={20} width="70%" style={{ marginBottom: 10 }} />
      <Skeleton height={14} style={{ marginBottom: 6 }} />
      <Skeleton height={14} width="80%" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton width={40} height={40} circle />
          <div style={{ flex: 1 }}>
            <Skeleton height={14} width="60%" style={{ marginBottom: 6 }} />
            <Skeleton height={12} width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {Array.from({ length: columns }).map((_, i) => <Skeleton key={i} height={14} style={{ flex: 1 }} />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12 }}>
          {Array.from({ length: columns }).map((_, j) => <Skeleton key={j} height={14} style={{ flex: 1 }} />)}
        </div>
      ))}
    </div>
  );
}
