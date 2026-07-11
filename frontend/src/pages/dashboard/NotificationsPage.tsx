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
import { categoryMeta, priorityMeta, tint, type NotificationRow } from '../../lib/notifications';
import toast from 'react-hot-toast';

type NotificationListPayload = {
  items: NotificationRow[]; page: number; limit: number; total: number; unreadCount: number;
};

/** Group notifications into Today / Yesterday / Earlier buckets. */
function bucketOf(dateStr: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfToday) return 'Today';
  if (d >= startOfYesterday) return 'Yesterday';
  return 'Earlier';
}

export function NotificationsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const listQuery = useQuery({
    queryKey: ['notifications', token, unreadOnly],
    queryFn: () => apiRequest<NotificationListPayload>(`/notifications?limit=50&unreadOnly=${unreadOnly}`, { token }),
    enabled: Boolean(token),
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

  const allRows = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
  const unreadCount = listQuery.data?.unreadCount ?? 0;

  // Distinct categories present, for the filter chips.
  const categories = useMemo(() => {
    const set = new Set(allRows.map(r => r.category));
    return ['All', ...Array.from(set)];
  }, [allRows]);

  const rows = useMemo(
    () => (categoryFilter === 'All' ? allRows : allRows.filter(r => r.category === categoryFilter)),
    [allRows, categoryFilter]
  );

  // Group filtered rows by date bucket, preserving order.
  const grouped = useMemo(() => {
    const buckets: Record<string, NotificationRow[]> = { Today: [], Yesterday: [], Earlier: [] };
    for (const r of rows) buckets[bucketOf(r.createdAt)].push(r);
    return (['Today', 'Yesterday', 'Earlier'] as const)
      .map(label => ({ label, items: buckets[label] }))
      .filter(g => g.items.length > 0);
  }, [rows]);

  const renderRow = (row: NotificationRow, isLast: boolean) => {
    const meta = categoryMeta(row.category);
    const pmeta = priorityMeta(row.priority);
    const Icon = meta.icon;
    return (
      <motion.div
        key={row._id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 14,
          padding: '14px 20px',
          borderBottom: isLast ? 'none' : '1px solid var(--border)',
          borderLeft: `3px solid ${row.isRead ? 'transparent' : meta.color}`,
          background: row.isRead ? 'transparent' : tint(meta.color, 0.06),
          transition: 'background 0.18s',
        }}
      >
        {/* Category icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tint(meta.color, 0.14), color: meta.color, marginTop: 2,
        }}>
          <Icon size={18} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{row.title}</h4>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {pmeta.emphasize && <Badge variant={pmeta.variant} size="sm">{pmeta.label}</Badge>}
              <Badge variant="neutral" size="sm">{meta.label}</Badge>
            </div>
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
    );
  };

  return (
    <div className="ui-page">
      <PageHeader
        title="Notifications"
        description="Live alerts, updates, and direct workflow links"
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
        <div className="ui-card__body" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className={`ui-btn ui-btn--sm ${unreadOnly ? 'ui-btn--primary' : 'ui-btn--outline'}`}
            onClick={() => setUnreadOnly(v => !v)}
          >
            <Filter size={13} />
            {unreadOnly ? 'Unread only' : 'All notifications'}
          </button>
          <span className="ui-badge ui-badge--primary">{unreadCount} unread</span>
          <span className="ui-badge ui-badge--neutral">{listQuery.data?.total ?? 0} total</span>

          {/* Category chips */}
          {categories.length > 2 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
              {categories.map(cat => {
                const active = categoryFilter === cat;
                const color = cat === 'All' ? 'var(--accent)' : categoryMeta(cat).color;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '5px 11px', borderRadius: 999, fontSize: '0.76rem', fontWeight: 600,
                      cursor: 'pointer', border: `1px solid ${active ? color : 'var(--border)'}`,
                      background: active ? tint(cat === 'All' ? '#6ba3ff' : categoryMeta(cat).color, 0.16) : 'transparent',
                      color: active ? color : 'var(--muted)',
                    }}
                  >
                    {cat === 'All' ? 'All' : categoryMeta(cat).label}
                  </button>
                );
              })}
            </div>
          )}
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
            description={unreadOnly ? 'No unread notifications' : "You're all caught up!"}
          />
        </div>
      )}

      {/* Grouped list */}
      {!listQuery.isLoading && grouped.map(group => (
        <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ margin: '4px 2px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
            {group.label}
          </h3>
          <div className="ui-card" style={{ padding: 0 }}>
            {group.items.map((row, i) => renderRow(row, i === group.items.length - 1))}
          </div>
        </div>
      ))}
    </div>
  );
}
