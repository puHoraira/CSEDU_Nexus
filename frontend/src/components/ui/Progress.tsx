interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

const heights = { sm: 4, md: 8, lg: 12 };
const colors = {
  primary: 'var(--gradient-primary)',
  success: 'linear-gradient(90deg,#10b981,#059669)',
  warning: 'linear-gradient(90deg,#f59e0b,#d97706)',
  error:   'linear-gradient(90deg,#ef4444,#dc2626)',
};

export function Progress({ value, max = 100, size = 'md', label, showLabel = false, color = 'primary', className = '' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const h = heights[size];

  return (
    <div className={className}>
      {(label || showLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {label && <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{label}</span>}
          {showLabel && <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{ width: '100%', height: h, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: colors[color], borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// Circular Progress
interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

const strokeColors = {
  primary: 'var(--accent)',
  success: '#10b981',
  warning: '#f59e0b',
  error:   '#ef4444',
};

export function CircularProgress({ value, size = 80, strokeWidth = 8, showLabel = true, color = 'primary' }: CircularProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--surface)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={strokeColors[color]} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {showLabel && (
        <span style={{ position: 'absolute', fontSize: size * 0.22, fontWeight: 700, color: 'var(--text)' }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
