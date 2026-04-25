import { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

const icons = { success: CheckCircle, warning: AlertTriangle, error: AlertCircle, info: Info };

export function Alert({ variant = 'info', title, children, onClose, className = '' }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div className={`ui-alert ui-alert--${variant} ${className}`} role="alert">
      <Icon size={17} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>}
        <div style={{ opacity: 0.9 }}>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, flexShrink: 0 }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
