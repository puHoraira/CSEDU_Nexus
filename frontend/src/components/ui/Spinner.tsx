import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
}

const sizes = { sm: 16, md: 24, lg: 36, xl: 48 };

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <div className="ui-spinner" role="status" aria-label={label || 'Loading'}>
      <Loader2 size={sizes[size]} className="ui-spinner__icon" />
      {label && <span className="ui-text-sm ui-text-muted">{label}</span>}
    </div>
  );
}

export function SpinnerOverlay({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1060,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        padding: 32, background: 'var(--panel-strong)', borderRadius: 24,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
      }}>
        <Spinner size="xl" />
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
      </div>
    </div>
  );
}
