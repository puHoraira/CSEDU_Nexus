import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { batchToSession, YEAR_LABELS, YEAR_OPTIONS, getYearLabel } from '../../lib/academicYear';
import toast from 'react-hot-toast';

type YearCorrectionStatus = {
  status: 'None' | 'Pending' | 'Approved' | 'Rejected';
  requestedYear?: number;
  reason?: string;
  requestedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
};

type Props = {
  currentYear: number;
  batch: number;
  yearCorrectionRequest?: YearCorrectionStatus;
  onRefresh: () => void;
};

const STATUS_CONFIG = {
  None:     { color: 'var(--muted)', icon: null,        label: 'No request' },
  Pending:  { color: '#f59e0b',      icon: Clock,       label: 'Pending review' },
  Approved: { color: '#10b981',      icon: CheckCircle, label: 'Approved' },
  Rejected: { color: '#ef4444',      icon: XCircle,     label: 'Rejected' },
};

export function YearCorrectionRequest({ currentYear, batch, yearCorrectionRequest, onRefresh }: Props) {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [requestedYear, setRequestedYear] = useState<number>(currentYear);
  const [reason, setReason] = useState('');

  const status = yearCorrectionRequest?.status ?? 'None';
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;

  // Can submit any time EXCEPT when one is already Pending
  const canRequest = status !== 'Pending';
  const isReRequest = status === 'Approved';

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest('/membership/year-correction', {
        method: 'POST',
        token,
        body: JSON.stringify({ requestedYear, reason }),
      }),
    onSuccess: () => {
      toast.success('Year correction request submitted');
      setShowForm(false);
      setReason('');
      setRequestedYear(currentYear);
      onRefresh();
    },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  function handleSubmit() {
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('Please provide a reason (at least 5 characters)');
      return;
    }
    if (requestedYear === currentYear) {
      toast.error('Please select a different year');
      return;
    }
    submitMutation.mutate();
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header (always visible, click to expand) ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <GraduationCap size={18} />
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
            Academic Year
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>
            {getYearLabel(currentYear, batch)}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status !== 'None' && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: statusCfg.color,
                padding: '3px 8px',
                borderRadius: 6,
                background: `${statusCfg.color}18`,
              }}
            >
              {StatusIcon && <StatusIcon size={12} />}
              {statusCfg.label}
            </span>
          )}
          {expanded
            ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} />
            : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
          }
        </div>
      </button>

      {/* ── Expanded body ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>

              {/* Batch / Year info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0' }}>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Batch / Session
                  </p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                    {batch}{' '}
                    <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({batchToSession(batch)})</span>
                  </p>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current Year
                  </p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                    {YEAR_LABELS[currentYear] ?? `Year ${currentYear}`}
                  </p>
                </div>
              </div>

              {/* ── Status banners ── */}

              {status === 'Pending' && yearCorrectionRequest && (
                <div style={{ marginBottom: 12 }}>
                  <Alert variant="warning">
                    <Clock size={14} />
                    <div>
                      <strong>Request pending review</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>
                        Requested: {YEAR_LABELS[yearCorrectionRequest.requestedYear!]} — awaiting moderator approval.
                      </p>
                    </div>
                  </Alert>
                </div>
              )}

              {status === 'Approved' && yearCorrectionRequest && !showForm && (
                <div style={{ marginBottom: 12 }}>
                  <Alert variant="success">
                    <CheckCircle size={14} />
                    <div>
                      <strong>Year correction approved</strong>
                      {yearCorrectionRequest.reviewNote && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>{yearCorrectionRequest.reviewNote}</p>
                      )}
                    </div>
                  </Alert>
                </div>
              )}

              {status === 'Rejected' && yearCorrectionRequest && !showForm && (
                <div style={{ marginBottom: 12 }}>
                  <Alert variant="error">
                    <XCircle size={14} />
                    <div>
                      <strong>Request rejected</strong>
                      {yearCorrectionRequest.reviewNote && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>{yearCorrectionRequest.reviewNote}</p>
                      )}
                    </div>
                  </Alert>
                </div>
              )}

              {/* ── Re-request button (shown when Approved or Rejected, form not open) ── */}
              {canRequest && !showForm && status !== 'None' && (
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  leftIcon={RefreshCw}
                  onClick={() => {
                    setRequestedYear(currentYear);
                    setReason('');
                    setShowForm(true);
                  }}
                  style={{ marginBottom: 4 }}
                >
                  {isReRequest ? 'Request Another Change' : 'Submit New Request'}
                </Button>
              )}

              {/* ── Request form ── */}
              {canRequest && (showForm || status === 'None') && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {isReRequest
                      ? 'Your year was already corrected. If it still needs adjustment (e.g. readmission, semester drop), submit a new request.'
                      : 'If your current year is incorrect (e.g. due to readmission or transfer), submit a correction request. A moderator will review and approve it.'
                    }
                  </p>

                  <div className="ui-input-wrap">
                    <label className="ui-input-label" style={{ fontSize: '0.8rem' }}>Request Year</label>
                    <select
                      className="ui-select"
                      value={requestedYear}
                      onChange={e => setRequestedYear(Number(e.target.value))}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {YEAR_OPTIONS.map(y => (
                        <option key={y} value={y} disabled={y === currentYear}>
                          {YEAR_LABELS[y]}{y === currentYear ? ' (current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ui-input-wrap">
                    <label className="ui-input-label" style={{ fontSize: '0.8rem' }}>Reason *</label>
                    <textarea
                      className="ui-input"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Explain why your year needs correction (e.g. readmission after medical leave, semester drop, transfer...)"
                      rows={3}
                      style={{ resize: 'vertical', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={GraduationCap}
                      isLoading={submitMutation.isPending}
                      onClick={handleSubmit}
                      disabled={requestedYear === currentYear}
                      style={{ flex: 1 }}
                    >
                      Submit Request
                    </Button>
                    {/* Cancel only shown when re-requesting (not on first-time None state) */}
                    {showForm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowForm(false); setReason(''); }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
