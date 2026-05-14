import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, CheckCircle, XCircle, Clock, User, ChevronDown, ChevronUp,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { batchToSession, YEAR_LABELS } from '../../lib/academicYear';
import toast from 'react-hot-toast';

type PendingRequest = {
  _id: string;
  studentId: string;
  batch: number;
  currentYear: number;
  session?: string;
  userId?: { firstName: string; lastName: string; email: string };
  yearCorrectionRequest: {
    status: string;
    requestedYear: number;
    reason: string;
    requestedAt: string;
  };
};

export function YearCorrectionPanel() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [expanded, setExpanded] = useState(true);

  const { data: requests = [], isLoading, refetch, isError, error } = useQuery({
    queryKey: ['year-corrections-pending', token],
    queryFn: () => apiRequest<PendingRequest[]>('/membership/year-corrections/pending', { token }),
    enabled: Boolean(token),
    retry: 1,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'Approved' | 'Rejected' }) =>
      apiRequest(`/membership/year-corrections/${id}/review`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ action, reviewNote }),
      }),
    onSuccess: (_, { action }) => {
      toast.success(`Year correction ${action.toLowerCase()}`);
      setReviewingId(null);
      setReviewNote('');
      qc.invalidateQueries({ queryKey: ['year-corrections-pending'] });
    },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'var(--panel-strong)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <GraduationCap size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
            Year Correction Requests
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
            Review student academic year correction requests
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {requests.length > 0 && (
            <span
              style={{
                background: '#f59e0b',
                color: '#fff',
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {requests.length} pending
            </span>
          )}
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: 20 }}>
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <Spinner size="md" label="Loading requests..." />
                </div>
              )}

              {!isLoading && isError && (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: '#ef444415',
                  border: '1px solid #ef444430',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                        Failed to load requests
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {normalizeApiError(error)} — make sure the backend is running
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" leftIcon={RefreshCw} onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              )}

              {!isLoading && !isError && requests.length === 0 && (
                <EmptyState
                  icon={CheckCircle}
                  title="No pending requests"
                  description="All year correction requests have been reviewed"
                  size="sm"
                />
              )}

              {!isLoading && !isError && requests.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {requests.map((req) => (
                    <motion.div
                      key={req._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Request header */}
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0,
                            fontSize: '0.9rem',
                            fontWeight: 700,
                          }}
                        >
                          {req.userId?.firstName?.[0]}{req.userId?.lastName?.[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                              {req.userId?.firstName} {req.userId?.lastName}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              {req.studentId}
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                            {req.userId?.email}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <Clock size={12} style={{ color: '#f59e0b' }} />
                          <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>
                            {new Date(req.yearCorrectionRequest.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Year change info */}
                      <div
                        style={{
                          margin: '0 16px',
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: 'var(--panel)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ margin: '0 0 2px', fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batch / Session</p>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)' }}>
                            {req.batch} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.78rem' }}>({batchToSession(req.batch)})</span>
                          </p>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                          <div
                            style={{
                              padding: '6px 14px',
                              borderRadius: 8,
                              background: '#ef444420',
                              border: '1px solid #ef444440',
                              textAlign: 'center',
                            }}
                          >
                            <p style={{ margin: '0 0 1px', fontSize: '0.65rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>Current</p>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#ef4444' }}>
                              {YEAR_LABELS[req.currentYear] ?? `Year ${req.currentYear}`}
                            </p>
                          </div>
                          <span style={{ color: 'var(--muted)', fontSize: '1.2rem' }}>→</span>
                          <div
                            style={{
                              padding: '6px 14px',
                              borderRadius: 8,
                              background: '#10b98120',
                              border: '1px solid #10b98140',
                              textAlign: 'center',
                            }}
                          >
                            <p style={{ margin: '0 0 1px', fontSize: '0.65rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>Requested</p>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#10b981' }}>
                              {YEAR_LABELS[req.yearCorrectionRequest.requestedYear] ?? `Year ${req.yearCorrectionRequest.requestedYear}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div style={{ padding: '10px 16px' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Reason</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
                          {req.yearCorrectionRequest.reason}
                        </p>
                      </div>

                      {/* Review section */}
                      {reviewingId === req._id ? (
                        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div className="ui-input-wrap">
                            <label className="ui-input-label" style={{ fontSize: '0.78rem' }}>Review Note (optional)</label>
                            <textarea
                              className="ui-input"
                              value={reviewNote}
                              onChange={e => setReviewNote(e.target.value)}
                              placeholder="Add a note for the student..."
                              rows={2}
                              style={{ fontSize: '0.82rem', resize: 'vertical' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={CheckCircle}
                              isLoading={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ id: req._id, action: 'Approved' })}
                              style={{ flex: 1 }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              leftIcon={XCircle}
                              isLoading={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ id: req._id, action: 'Rejected' })}
                              style={{ flex: 1 }}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setReviewingId(null); setReviewNote(''); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '0 16px 14px' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            onClick={() => setReviewingId(req._id)}
                          >
                            Review Request
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
