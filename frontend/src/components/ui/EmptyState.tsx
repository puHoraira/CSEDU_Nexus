import { ReactNode } from 'react';
import { Inbox, AlertCircle } from 'lucide-react';
import { renderIconProp } from '../../lib/iconUtils';

export interface EmptyStateProps {
  icon?: unknown;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({ icon, title, description, action, size = 'md' }: EmptyStateProps) {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 64 : 48;
  const sizeClass = size === 'sm' ? 'ui-empty--sm' : size === 'lg' ? 'ui-empty--lg' : '';

  return (
    <div className={`ui-empty ${sizeClass}`}>
      <div className="ui-empty__icon">
        {icon ? renderIconProp(icon, iconSize) : <Inbox size={iconSize} strokeWidth={1.5} />}
      </div>
      <h3 className="ui-empty__title">{title}</h3>
      {description && <p className="ui-empty__desc">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description = 'An error occurred. Please try again.', onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? (
        <button onClick={onRetry} className="ui-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          Try again
        </button>
      ) : undefined}
    />
  );
}
