import { HTMLAttributes, forwardRef, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  noPad?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', noPad, children, ...props }, ref) => (
    <div ref={ref} className={`ui-card ${className}`} {...props}>{children}</div>
  )
);
Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`ui-card__header ${className}`} {...props}>{children}</div>
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}
export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => (
    <h3 ref={ref} className={`ui-card__title ${className}`} {...props}>{children}</h3>
  )
);
CardTitle.displayName = 'CardTitle';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
}
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', flush, children, ...props }, ref) => (
    <div ref={ref} className={`${flush ? 'ui-card__body--flush' : 'ui-card__body'} ${className}`} {...props}>{children}</div>
  )
);
CardContent.displayName = 'CardContent';

// Alias
export const CardBody = CardContent;

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`ui-card__footer ${className}`} {...props}>{children}</div>
  )
);
CardFooter.displayName = 'CardFooter';
