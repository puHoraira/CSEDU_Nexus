import { ReactNode } from 'react';

/**
 * Detects if a value is a React component (function or forwardRef/memo object).
 * Lucide icons are ForwardRefExoticComponent — typeof === 'object' with $$typeof symbol.
 */
export function isReactComponent(value: unknown): boolean {
  if (!value || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return false;
  }
  if (typeof value === 'function') return true;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // forwardRef and memo components have $$typeof
    if ('$$typeof' in obj) return true;
    // Some older patterns expose render directly
    if ('render' in obj) return true;
  }
  return false;
}

/**
 * Renders an icon prop safely:
 * - LucideIcon / React component → <Icon size={size} />
 * - ReactNode (already rendered) → returned as-is
 */
export function renderIconProp(icon: unknown, size = 18): ReactNode {
  if (!icon) return null;
  if (isReactComponent(icon)) {
    const Icon = icon as React.ElementType;
    return <Icon size={size} />;
  }
  return icon as ReactNode;
}
