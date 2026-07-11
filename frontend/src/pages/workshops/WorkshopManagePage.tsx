import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Users, Clock, Search, QrCode, Download, FileText, Link2, Video, Plus, Trash2, BookOpen, CalendarClock, UserCheck, ListChecks, UserPlus, ClipboardList, Trophy } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { MaterialsManager } from '../../components/workshops/MaterialsManager';
import { SessionsEditor, AttendanceGrid, ContentEditor, SubmissionsReview, Leaderboard } from '../../components/workshops/WorkshopManagerTools';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type Registration = {
  _id: string; status: string; paymentStatus: string; paymentRequired: boolean;
  paymentAmount: number; qrCodeData?: string; checkedIn: boolean; checkedInAt?: string;
  participantName: string; participantEmail: string; participantPhone?: string;
  createdAt: string;
  userId?: { firstName: string; lastName: string; email: string; avatarUrl?: string };
};

type Workshop = {
  _id: string; title: string;
  materials: Array<{ title: string; url: string; type: string; description?: string; category?: string; size?: string }>;
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  Pending:    'warning', Approved: 'success', Rejected: 'error',
  Waitlisted: 'neutral', Attended: 'success', Cancelled: 'error',
};

export function WorkshopManagePage() {
  const { id } = useParams<{ id: string }>();
  const { token, loading } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'registrations' | 'agenda' | 'attendance' | 'tasks' | 'submissions' | 'leaderboard' | 'materials'>('registrations');

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['workshop-registrations', id, token],
    queryFn: () => apiRequest<Registration[]>(`/workshops/${id}/registrations`, { token }),
    enabled: Boolean(id && token),
  });

  const { data: workshop, isLoading: workshopLoading } = useQuery({
    queryKey: ['workshop', id],
    queryFn: () => apiRequest<Workshop>(`/workshops/${id}`, { token }),
    enabled: Boolean(id),
  });

  const approveMut = useMutation({
    mutationFn: (regId: string) => apiRequest(`/workshops/${id}/registrations/${regId}/approve`, { method: 'PATCH', token }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['workshop-registrations', id, token] }); toast.success('Approved'); },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const rejectMut = useMutation({
    mutationFn: ({ regId, reason }: { regId: string; reason: string }) =>
      apiRequest(`/workshops/${id}/registrations/${regId}/reject`, { method: 'PATCH', token, body: JSON.stringify({ reason }) }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['workshop-registrations', id, token] }); toast.success('Rejected'); },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const addMaterialMut = useMutation({
    mutationFn: (material: any) => apiRequest(`/workshops/${id}/materials`, { method: 'POST', token, body: JSON.stringify(material) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['workshop', id] });
    },
    onError: e => { throw new Error(normalizeApiError(e)); },
  });

  const editMaterialMut = useMutation({
    mutationFn: ({ index, material }: { index: number; material: any }) =>
      apiRequest(`/workshops/${id}/materials/${index}`, { method: 'PUT', token, body: JSON.stringify(material) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['workshop', id] });
    },
    onError: e => { throw new Error(normalizeApiError(e)); },
  });

  const removeMaterialMut = useMutation({
    mutationFn: (index: number) => apiRequest(`/workshops/${id}/materials/${index}`, { method: 'DELETE', token }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['workshop', id] }); },
    onError: e => { throw new Error(normalizeApiError(e)); },
  });

  const promoteMut = useMutation({
    mutationFn: () => apiRequest<{ promoted: number }>(`/workshops/${id}/registrations/promote-waitlist`, { method: 'POST', token }),
    onSuccess: async (d) => { await qc.invalidateQueries({ queryKey: ['workshop-registrations', id, token] }); toast.success(`${d.promoted} promoted from waitlist`); },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const bulkMut = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      apiRequest(`/workshops/${id}/registrations/bulk`, {
        method: 'POST', token,
        body: JSON.stringify({ action, registrationIds: registrations.filter(r => r.status === 'Pending').map(r => r._id), reason: action === 'reject' ? 'Bulk rejected' : undefined }),
      }),
    onSuccess: async (d: any) => { await qc.invalidateQueries({ queryKey: ['workshop-registrations', id, token] }); toast.success(`${d.success} updated`); },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const exportServerCsv = async () => {
    try {
      const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || '/api/v1'}/workshops/${id}/registrations/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'registrations.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const filtered = registrations.filter(r => {
    const matchSearch = !search || r.participantName.toLowerCase().includes(search.toLowerCase()) || r.participantEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:     registrations.length,
    pending:   registrations.filter(r => r.status === 'Pending').length,
    approved:  registrations.filter(r => r.status === 'Approved').length,
    attended:  registrations.filter(r => r.status === 'Attended').length,
  };

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Payment Status', 'Amount', 'Room', 'Seat', 'Check-in Time', 'Registered At'];
    const rows = filtered.map(r => [
      r.participantName,
      r.participantEmail,
      r.participantPhone || '',
      r.status,
      r.paymentStatus,
      r.paymentAmount || 0,
      (r as any).seatAssignment?.roomId?.roomName || '',
      (r as any).seatAssignment?.seatNumber || '',
      r.checkedInAt ? formatDateTime(r.checkedInAt) : '',
      formatDateTime(r.createdAt),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `workshop-${id}-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadJSON = () => {
    const data = filtered.map(r => ({
      name: r.participantName,
      email: r.participantEmail,
      phone: r.participantPhone,
      status: r.status,
      paymentStatus: r.paymentStatus,
      paymentAmount: r.paymentAmount,
      room: (r as any).seatAssignment?.roomId?.roomName,
      roomNumber: (r as any).seatAssignment?.roomId?.roomNumber,
      seat: (r as any).seatAssignment?.seatNumber,
      checkedIn: r.checkedIn,
      checkedInAt: r.checkedInAt,
      registeredAt: r.createdAt,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workshop-${id}-registrations-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ui-page">
      <PageHeader
        title="Manage Workshop"
        description="Registrations, approvals, and materials"
        backButton
        breadcrumbs={[
          { label: 'Workshops', href: '/dashboard/workshops' },
          { label: 'Workshop', href: `/dashboard/workshops/${id}` },
          { label: 'Manage' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" leftIcon={Download} onClick={downloadCSV}>CSV</Button>
            <Button variant="outline" leftIcon={Download} onClick={downloadJSON}>JSON</Button>
            <Button variant="outline" leftIcon={QrCode} href={`/dashboard/workshops/${id}/checkin`}>QR Check-in</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="ui-grid-4">
        {[
          { label: 'Total',    value: counts.total,    color: '#6ba3ff' },
          { label: 'Pending',  value: counts.pending,  color: '#f59e0b' },
          { label: 'Approved', value: counts.approved, color: '#10b981' },
          { label: 'Attended', value: counts.attended, color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={22} style={{ color: s.color }} />
            </div>
            <div>
              <div className="ui-text-xs ui-text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        {[
          { key: 'registrations', label: 'Registrations', icon: Users },
          { key: 'agenda',        label: 'Agenda',        icon: CalendarClock },
          { key: 'attendance',    label: 'Attendance',    icon: UserCheck },
          { key: 'tasks',         label: 'Tasks',         icon: ListChecks },
          { key: 'submissions',   label: 'Submissions',   icon: ClipboardList },
          { key: 'leaderboard',   label: 'Leaderboard',   icon: Trophy },
          { key: 'materials',     label: 'Materials',     icon: BookOpen },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: isActive ? 'var(--panel-strong)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--muted)',
                fontWeight: isActive ? 700 : 500, fontSize: '0.875rem',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.18s', fontFamily: 'inherit',
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── REGISTRATIONS TAB ── */}
      {activeTab === 'registrations' && (
        <>
          {/* Filters */}
          <div className="ui-card">
            <div className="ui-card__body">
              <div className="ui-flex ui-flex-gap-3" style={{ flexWrap: 'wrap' }}>
                <div className="ui-input-row" style={{ flex: 2, minWidth: 200 }}>
                  <span className="ui-input-icon"><Search size={15} /></span>
                  <input className="ui-input ui-input--icon" placeholder="Search by name or email…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="ui-select" style={{ flex: 1, minWidth: 140 }} value={statusFilter} onChange={e => setStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Waitlisted">Waitlisted</option>
                  <option value="Attended">Attended</option>
                </select>
              </div>
              <div className="ui-flex ui-flex-gap-2" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <Button size="sm" variant="primary" leftIcon={CheckCircle} isLoading={bulkMut.isPending}
                  disabled={counts.pending === 0}
                  onClick={() => { if (confirm(`Approve all ${counts.pending} pending?`)) bulkMut.mutate('approve'); }}>
                  Approve All Pending ({counts.pending})
                </Button>
                <Button size="sm" variant="outline" leftIcon={UserPlus} isLoading={promoteMut.isPending}
                  onClick={() => promoteMut.mutate()}>
                  Promote Waitlist
                </Button>
                <Button size="sm" variant="secondary" leftIcon={Download} onClick={exportServerCsv}>
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Loading */}
          {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Spinner size="lg" /></div>}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div className="ui-card"><EmptyState icon={Users} title="No registrations found" size="sm" /></div>
          )}

          {/* Registrations */}
          {!isLoading && filtered.length > 0 && (
            <div className="ui-card" style={{ padding: 0 }}>
          {filtered.map((reg, i) => (
            <motion.div key={reg._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                flexWrap: 'wrap',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
              }}>
                {reg.userId?.avatarUrl
                  ? <img src={reg.userId.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : reg.participantName.charAt(0)
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{reg.participantName}</span>
                  <Badge variant={STATUS_VARIANT[reg.status] ?? 'neutral'}>{reg.status}</Badge>
                  {reg.paymentRequired && (
                    <Badge variant={reg.paymentStatus === 'Paid' ? 'success' : 'warning'}>
                      {reg.paymentStatus === 'Paid' ? '৳ Paid' : '৳ Unpaid'}
                    </Badge>
                  )}
                  {reg.checkedIn && <Badge variant="success" icon={CheckCircle}>Checked In</Badge>}
                </div>
                <p className="ui-text-xs ui-text-muted">{reg.participantEmail} {reg.participantPhone && `· ${reg.participantPhone}`}</p>
                
                {/* Seat Assignment */}
                {(reg as any).seatAssignment?.roomId && (
                  <div style={{ 
                    marginTop: '6px', 
                    padding: '6px 10px', 
                    borderRadius: '6px', 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)',
                    display: 'inline-block',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                      🪑 Room {(reg as any).seatAssignment.roomId.roomNumber} - {(reg as any).seatAssignment.roomId.roomName}
                      {(reg as any).seatAssignment.seatNumber && ` · Seat ${(reg as any).seatAssignment.seatNumber}`}
                    </span>
                  </div>
                )}
                
                <p className="ui-text-xs ui-text-muted" style={{ opacity: 0.7, marginTop: '6px' }}>Registered: {formatDateTime(reg.createdAt)}</p>
              </div>

              {/* QR preview */}
              {reg.qrCodeData && (
                <div style={{ flexShrink: 0 }}>
                  <img src={reg.qrCodeData} alt="QR" style={{ width: 48, height: 48, borderRadius: 8, border: '1px solid var(--border)' }} />
                </div>
              )}

              {/* Actions */}
              <div className="ui-flex ui-flex-gap-2" style={{ flexShrink: 0 }}>
                {reg.status === 'Pending' && (
                  <>
                    <Button variant="success" size="sm" leftIcon={CheckCircle}
                      isLoading={approveMut.isPending}
                      onClick={() => approveMut.mutate(reg._id)}>
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" leftIcon={XCircle}
                      isLoading={rejectMut.isPending}
                      onClick={() => {
                        const reason = window.prompt('Rejection reason', 'Does not meet requirements') || 'Rejected';
                        rejectMut.mutate({ regId: reg._id, reason });
                      }}>
                      Reject
                    </Button>
                  </>
                )}
                {reg.qrCodeData && (
                  <Button variant="ghost" size="sm" leftIcon={Download}
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = reg.qrCodeData!;
                      a.download = `qr-${reg.participantName}.png`;
                      a.click();
                    }}>
                    QR
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          </div>
        )}
        </>
      )}

      {/* ── AGENDA TAB ── */}
      {activeTab === 'agenda' && id && <SessionsEditor workshopId={id} token={token} />}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && id && <AttendanceGrid workshopId={id} token={token} />}

      {/* ── TASKS TAB (prework + assignments) ── */}
      {activeTab === 'tasks' && id && <ContentEditor workshopId={id} token={token} />}

      {/* ── SUBMISSIONS TAB ── */}
      {activeTab === 'submissions' && id && <SubmissionsReview workshopId={id} token={token} />}

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && id && <Leaderboard workshopId={id} token={token} />}

      {/* ── MATERIALS TAB ── */}
      {activeTab === 'materials' && (
        <MaterialsManager
          materials={workshop?.materials || []}
          isLoading={workshopLoading}
          onAdd={async (material) => {
            await addMaterialMut.mutateAsync(material);
          }}
          onEdit={async (index, material) => {
            await editMaterialMut.mutateAsync({ index, material });
          }}
          onRemove={async (index) => {
            await removeMaterialMut.mutateAsync(index);
          }}
          canEdit={true}
        />
      )}
    </div>
  );
}
