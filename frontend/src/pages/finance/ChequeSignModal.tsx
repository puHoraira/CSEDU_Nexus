import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileCheck, Calendar, Tag, DollarSign, User, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useSignCheque } from './useFinanceQueries';
import type { Transaction } from './types';

interface ChequeSignModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function ChequeSignModal({ transaction, onClose }: ChequeSignModalProps) {
  const [note, setNote] = useState('');
  const signMutation = useSignCheque();

  if (!transaction) return null;

  const handleSign = () => {
    signMutation.mutate(
      { transactionId: transaction._id, note },
      {
        onSuccess: () => {
          setNote('');
          onClose();
        },
      }
    );
  };

  const createdByName =
    typeof transaction.createdBy === 'object' && transaction.createdBy
      ? `${transaction.createdBy.firstName} ${transaction.createdBy.lastName}`
      : 'Unknown';

  return (
    <AnimatePresence>
      <div
        className="ui-modal-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--panel)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(245,158,11,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <FileCheck size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                Sign Cheque
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--surface)',
                border: 'none',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                color: 'var(--muted)',
                display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Transaction details */}
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <DetailRow
                icon={<DollarSign size={15} />}
                label="Amount"
                value={`৳${transaction.amount.toLocaleString()}`}
                highlight={transaction.type === 'Income' ? '#10b981' : '#ef4444'}
              />
              <DetailRow icon={<Tag size={15} />} label="Category" value={transaction.category} />
              <DetailRow icon={<FileCheck size={15} />} label="Reference" value={transaction.reference} />
              <DetailRow
                icon={<Calendar size={15} />}
                label="Date"
                value={new Date(transaction.occurredOn).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              />
              <DetailRow icon={<User size={15} />} label="Recorded by" value={createdByName} />
            </div>

            {/* Note input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this approval..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: '0.88rem',
                  color: 'var(--text)',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Warning */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '12px 14px',
                background: 'rgba(245,158,11,0.08)',
                borderRadius: 10,
                fontSize: '0.82rem',
                color: '#f59e0b',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>This action is irreversible. Once signed, the cheque cannot be unsigned.</span>
            </div>

            {signMutation.isError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.1)',
                  borderRadius: 10,
                  fontSize: '0.84rem',
                  color: '#ef4444',
                }}
              >
                Failed to sign cheque. Please try again.
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="warning"
              leftIcon={FileCheck}
              isLoading={signMutation.isPending}
              onClick={handleSign}
            >
              Sign Cheque
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'var(--muted)',
          minWidth: 80,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '0.88rem',
          fontWeight: 600,
          color: highlight || 'var(--text)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
