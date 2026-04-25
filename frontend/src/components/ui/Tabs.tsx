import { ReactNode, useState, createContext, useContext } from 'react';
import { motion } from 'framer-motion';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within a Tabs component');
  return ctx;
}

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value: controlled, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;

  const handleChange = (v: string) => {
    if (controlled === undefined) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ activeTab: value, setActiveTab: handleChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: 4,
        background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
      }}
      className={className}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, disabled, className = '' }: { value: string; children: ReactNode; disabled?: boolean; className?: string }) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      style={{
        position: 'relative', padding: '7px 16px', fontSize: '0.875rem', fontWeight: 500,
        borderRadius: 9, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: 'transparent', color: isActive ? 'var(--text)' : 'var(--muted)',
        opacity: disabled ? 0.5 : 1, transition: 'color 0.18s',
        fontFamily: 'inherit',
      }}
      className={className}
    >
      {isActive && (
        <motion.div
          layoutId="activeTab"
          style={{ position: 'absolute', inset: 0, background: 'var(--panel-strong)', borderRadius: 9, boxShadow: 'var(--shadow-sm)' }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        />
      )}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  );
}

export function TabsContent({ value, children, className = '' }: { value: string; children: ReactNode; className?: string }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;

  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
