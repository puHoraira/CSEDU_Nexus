import { ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { renderIconProp } from '../../lib/iconUtils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg';

type BaseProps = {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: unknown;
  rightIcon?: unknown;
  fullWidth?: boolean;
};

type AsButton = BaseProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & { href?: never };
type AsLink   = BaseProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & { href: string };

export type ButtonProps = AsButton | AsLink;

function buildClass(variant: Variant, size: Size, isLoading: boolean, fullWidth: boolean, extra?: string) {
  return [
    'ui-btn',
    `ui-btn--${variant}`,
    size !== 'md' ? `ui-btn--${size}` : '',
    isLoading ? 'ui-btn--loading' : '',
    fullWidth ? 'ui-btn--full' : '',
    extra || '',
  ].filter(Boolean).join(' ');
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, fullWidth = false, children, className, ...props }, ref) => {
    const cls = buildClass(variant, size, isLoading, fullWidth, className as string);
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 15;

    const content = (
      <>
        {leftIcon  && <span style={{ display: 'inline-flex' }}>{renderIconProp(leftIcon, iconSize)}</span>}
        {children}
        {rightIcon && <span style={{ display: 'inline-flex' }}>{renderIconProp(rightIcon, iconSize)}</span>}
      </>
    );

    if ('href' in props && props.href) {
      const { href, ...rest } = props as AsLink;
      return <Link to={href} ref={ref as any} className={cls} {...rest}>{content}</Link>;
    }

    const { disabled, ...rest } = props as AsButton;
    return (
      <button ref={ref as any} className={cls} disabled={disabled || isLoading} {...rest}>
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
