import { HTMLAttributes, forwardRef } from 'react';
import { renderIconProp } from '../../lib/iconUtils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  icon?: unknown;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', icon, children, className = '', ...props }, ref) => (
    <span
      ref={ref}
      className={`ui-badge ui-badge--${variant} ${size === 'sm' ? 'ui-badge--sm' : ''} ${className}`}
      {...props}
    >
      {icon && renderIconProp(icon, 11)}
      {children}
    </span>
  )
);

Badge.displayName = 'Badge';
