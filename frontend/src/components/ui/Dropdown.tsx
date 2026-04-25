import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { renderIconProp } from '../../lib/iconUtils';

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'start', side = 'bottom', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const tr = triggerRef.current!.getBoundingClientRect();
      const dr = dropRef.current?.getBoundingClientRect();
      const top  = side === 'bottom' ? tr.bottom + 6 : tr.top - (dr?.height ?? 0) - 6;
      const left = align === 'end' ? tr.right - (dr?.width ?? 0) : align === 'center' ? tr.left + tr.width / 2 - (dr?.width ?? 0) / 2 : tr.left;
      setPos({ top, left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open, align, side]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <>
      <div ref={triggerRef} onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropRef}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'fixed', top: pos.top, left: pos.left, zIndex: 1060,
              minWidth: 200, background: 'var(--panel-strong)', border: '1px solid var(--border)',
              borderRadius: 14, boxShadow: 'var(--shadow)', padding: '6px 0',
            }}
            className={className}
          >
            {children}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: unknown;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}

export function DropdownItem({ children, onClick, icon, disabled, destructive, className = '' }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', fontSize: '0.875rem', textAlign: 'left',
        border: 'none', background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        color: destructive ? '#ef4444' : 'var(--text)',
        opacity: disabled ? 0.5 : 1, transition: 'background 0.15s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = destructive ? 'rgba(239,68,68,0.1)' : 'var(--surface)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{renderIconProp(icon, 15)}</span>}
      <span style={{ flex: 1 }}>{children}</span>
    </button>
  );
}

export function DropdownSeparator() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </div>
  );
}
