import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from 'react';
import { renderIconProp } from '../../lib/iconUtils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ElementType | ReactNode;
  isRequired?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leftIcon, isRequired, className = '', id, ...props }, ref) => {
    const inputId = id || `inp-${Math.random().toString(36).slice(2, 7)}`;
    return (
      <div className="ui-input-wrap">
        {label && (
          <label htmlFor={inputId} className="ui-input-label">
            {label}{isRequired && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
        )}
        <div className="ui-input-row">
          {leftIcon && <span className="ui-input-icon">{renderIconProp(leftIcon, 15)}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`ui-input ${leftIcon ? 'ui-input--icon' : ''} ${error ? 'ui-input--err' : ''} ${className}`}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          />
        </div>
        {error  && <span className="ui-input-error">{error}</span>}
        {!error && helper && <span className="ui-text-xs ui-text-muted">{helper}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, isRequired, rows = 4, className = '', id, ...props }, ref) => {
    const tid = id || `ta-${Math.random().toString(36).slice(2, 7)}`;
    return (
      <div className="ui-input-wrap">
        {label && (
          <label htmlFor={tid} className="ui-input-label">
            {label}{isRequired && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
        )}
        <textarea ref={ref} id={tid} rows={rows} className={`ui-textarea ${error ? 'ui-input--err' : ''} ${className}`} {...props} />
        {error && <span className="ui-input-error">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
