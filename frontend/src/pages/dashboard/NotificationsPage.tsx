import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, ExternalLink, Filter } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { formatRelativeTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type NotificationRow = {
  _id: string; title: string; message: string;
  category: 'System' | 'Meeting' | 'Membership' | 'Governance' | 'Certificate' | 'Event';
  actionUrl?: string; isRead: boolean; createdAt: string;
};
type NotificationListPayload = {
  items: NotificationRow[]; page: number; limit: number; total: number; unreadCount: number;
};

const categoryVariant: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'neutral'> = {
  System:     'neutral',
  Meeting:    'primary',
  Membership: 'success',
  Governance: 'warning',
  Certificate:'info' as any,
  Event:      'success',
};

export function NotificationsPage() {
  const { token, loading } = useAuth();
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const listQuery = useQuery({
    queryKey: ['notifications', token, unreadOnly],
    queryFn: () => apiRequest<NotificationListPayload>(`/notifications?limit=50&unreadOnly=${unreadOnly}`, { token }),
    enabled: Boolean(token) && !loading,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH', token }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications', token] });
      await qc.invalidateQueries({ queryKey: ['notif-count', token] });
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const markAllMut = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { method: 'PATCH', token }),
    onSuccess: async () => {
      toast.success('All notifications marked as read');
      await qc.invalidateQueries({ queryKey: ['notifications', token] });
      await qc.invalidateQueries({ queryKey: ['notif-count', token] });
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const rows = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
  const unreadCount = listQuery.data?.unreadCount ?? 0;

  return (
    <div className="ui-page">
      <PageHeader
        title="Notifications"
        description="All alerts, updates, and direct workflow links"
        actions={
          <Button
            variant="outline"
            leftIcon={CheckCheck}
            isLoading={markAllMut.isPending}
            onClick={() => markAllMut.mutate()}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="ui-card">
        <div className="ui-card__body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className={`ui-btn ui-btn--sm ${unreadOnly ? 'ui-btn--primary' : 'ui-btn--outline'}`}
            onClick={() => setUnreadOnly(v => !v)}
          >
            <Filter size={13} />
            {unreadOnly ? 'Unread only' : 'All notifications'}
          </button>
          <span className="ui-badge ui-badge--primary">{unreadCount} unread</span>
          <span className="ui-badge ui-badge--neutral">{listQuery.data?.total ?? 0} total</span>
        </div>
      </div>

      {/* Loading */}
      {listQuery.isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" label="Loading notifications…" />
        </div>
      )}

      {/* Empty */}
      {!listQuery.isLoading && rows.length === 0 && (
        <div className="ui-card">
          <EmptyState
            icon={Bell}
            title="No notifications"
            description={unreadOnly ? 'No unread notifications' : 'You\'re all caught up!'}
          />
        </div>
      )}

      {/* List */}
      {!listQuery.isLoading && rows.length > 0 && (
        <div className="ui-card" style={{ padding: 0 }}>
          {rows.map((row, i) => (
            <motion.div
              key={row._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 20px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                background: row.isRead ? 'transparent' : 'rgba(107,163,255,0.05)',
                transition: 'background 0.18s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = row.isRead ? 'transparent' : 'rgba(107,163,255,0.05)'; }}
            >
              {/* Unread dot */}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.isRead ? 'transparent' : 'var(--accent)', flexShrink: 0, marginTop: 6 }} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{row.title}</h4>
                  <Badge variant={categoryVariant[row.category] ?? 'neutral'} size="sm">{row.category}</Badge>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>{row.message}</p>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', opacity: 0.7 }}>{formatRelativeTime(row.createdAt)}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {row.actionUrl && (
                  <Link to={row.actionUrl}>
                    <button className="ui-btn ui-btn--sm ui-btn--ghost" title="Open">
                      <ExternalLink size={13} />
                    </button>
                  </Link>
                )}
                {!row.isRead && (
                  <button
                    className="ui-btn ui-btn--sm ui-btn--outline"
                    disabled={markReadMut.isPending}
                    onClick={() => markReadMut.mutate(row._id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
