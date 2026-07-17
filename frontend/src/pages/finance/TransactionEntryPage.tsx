import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, CheckCircle, ArrowLeft, BookOpen, FileText } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { useCreateTransaction, useFinanceCategories } from './useFinanceQueries';
import { DEFAULT_CATEGORIES } from './constants';
import type { TransactionType } from './types';

export function TransactionEntryPage() {
  const [type, setType] = useState<TransactionType>('Income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Donation');
  const [customCategory, setCustomCategory] = useState('');
  const [reference, setReference] = useState('');
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().split('T')[0]);
  const [requiresCheque, setRequiresCheque] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  const { data: serverCategories } = useFinanceCategories();
  const createMutation = useCreateTransaction();

  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...(serverCategories ?? [])])).sort();

  function resetForm() {
    setType('Income');
    setAmount('');
    setCategory('Donation');
    setCustomCategory('');
    setReference('');
    setOccurredOn(new Date().toISOString().split('T')[0]);
    setRequiresCheque(false);
    setValidationError('');
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setValidationError('Amount must be greater than 0');
      return;
    }
    const finalCategory = category === '__custom__' ? customCategory.trim() : category;
    if (!finalCategory || finalCategory.length < 2) {
      setValidationError('Category must be at least 2 characters');
      return;
    }
    if (!reference.trim() || reference.trim().length < 2) {
      setValidationError('Reference must be at least 2 characters');
      return;
    }

    createMutation.mutate(
      {
        type,
        amount: numAmount,
        category: finalCategory,
        reference: reference.trim(),
        occurredOn: new Date(occurredOn).toISOString(),
        requiresCheque,
      },
      {
        onSuccess: () => setSuccess(true),
        onError: (err: any) => setValidationError(err?.message || 'Failed to create transaction'),
      }
    );
  }

  if (success) {
    return (
      <div className="ui-page">
        <PageHeader title="Transaction Created" description="The transaction has been recorded in the ledger" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ui-card"
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ padding: 16, borderRadius: '50%', background: 'rgba(16,185,129,0.12)' }}>
              <CheckCircle size={40} style={{ color: '#10b981' }} />
            </div>
          </div>
          <h3 style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text)' }}>Transaction Saved</h3>
          <p className="ui-text-sm ui-text-muted" style={{ marginBottom: 24 }}>
            {type} of ৳{parseFloat(amount).toLocaleString()} has been recorded successfully.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" leftIcon={PlusCircle} onClick={resetForm}>Add Another</Button>
            <Button variant="outline" leftIcon={BookOpen} href="/dashboard/finance/ledger">View Ledger</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <PageHeader
        title="New Transaction"
        description="Add income or expenditure to the club ledger"
        actions={<Button variant="ghost" leftIcon={ArrowLeft} href="/dashboard/finance">Back to Finance</Button>}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="ui-card"
      >
        <div className="ui-card__header">
          <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} /> Transaction Details
          </h3>
        </div>
        <div className="ui-card__body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Type Toggle */}
            <div>
              <label className="ui-text-sm ui-text-muted" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Transaction Type
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setType('Income')}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: 12, border: '2px solid',
                    borderColor: type === 'Income' ? '#10b981' : 'var(--border)',
                    background: type === 'Income' ? 'rgba(16,185,129,0.08)' : 'transparent',
                    color: type === 'Income' ? '#10b981' : 'var(--muted)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  <TrendingUp size={18} /> Income
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setType('Expenditure')}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: 12, border: '2px solid',
                    borderColor: type === 'Expenditure' ? '#ef4444' : 'var(--border)',
                    background: type === 'Expenditure' ? 'rgba(239,68,68,0.08)' : 'transparent',
                    color: type === 'Expenditure' ? '#ef4444' : 'var(--muted)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  <TrendingDown size={18} /> Expenditure
                </motion.button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="ui-text-sm ui-text-muted" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Amount (BDT)
              </label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="number"
                  className="ui-input"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="ui-text-sm ui-text-muted" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Category
              </label>
              <select
                className="ui-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">Custom...</option>
              </select>
              {category === '__custom__' && (
                <input
                  className="ui-input"
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  style={{ marginTop: 8 }}
                  required
                />
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="ui-text-sm ui-text-muted" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Reference / Description
              </label>
              <textarea
                className="ui-input"
                rows={3}
                placeholder="e.g. Membership fee from batch 2022"
                value={reference}
                onChange={e => setReference(e.target.value)}
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="ui-text-sm ui-text-muted" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Date
              </label>
              <input
                type="date"
                className="ui-input"
                value={occurredOn}
                onChange={e => setOccurredOn(e.target.value)}
                required
              />
            </div>

            {/* Cheque Toggle */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 10, background: 'var(--surface)', cursor: 'pointer',
              }}
              onClick={() => setRequiresCheque(!requiresCheque)}
            >
              <div
                style={{
                  width: 20, height: 20, borderRadius: 6, border: '2px solid',
                  borderColor: requiresCheque ? '#6366f1' : 'var(--border)',
                  background: requiresCheque ? '#6366f1' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {requiresCheque && <CheckCircle size={12} style={{ color: '#fff' }} />}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>
                  Requires Cheque Approval
                </p>
                <p className="ui-text-xs ui-text-muted" style={{ margin: '2px 0 0' }}>
                  This transaction will need to be signed by the Moderator or Chief Patron
                </p>
              </div>
            </div>

            {/* Error */}
            {(validationError || createMutation.isError) && (
              <Alert variant="error" title="Error">
                {validationError || 'Failed to save transaction. Please try again.'}
              </Alert>
            )}

            {/* Submit */}
            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <Button
                type="submit"
                variant="primary"
                leftIcon={PlusCircle}
                isLoading={createMutation.isPending}
                style={{ flex: 1 }}
              >
                Save Transaction
              </Button>
              <Button variant="ghost" href="/dashboard/finance">Cancel</Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
