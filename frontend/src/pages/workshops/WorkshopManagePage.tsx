import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Users, Clock, Search, QrCode, Download, FileText, Link2, Video, Plus, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
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
  materials: Array<{ title: string; url: string; type: string }>;
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  Pending:    'warning', Approved: 'success', Rejected: 'error',
  Waitlisted: 'neutral', Attended: 'success', Cancelled: 'error',
};

const MATERIAL_ICONS: Record<string, any> = {
  pdf: FileText, video: Video, link: Link2, other: BookOpen,
};

export function WorkshopManagePage() {
  const { id } = useParams<{ id: string }>();
  const { token, loading } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'registrations' | 'materials'>('registrations');
  const [newMaterial, setNewMaterial] = useState({ title: '', url: '', type: 'link' });

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['workshop-registrations', id, token],
    queryFn: () => apiRequest<Registration[]>(`/workshops/${id}/registrations`, { token }),
    enabled: Boolean(id && token) && !loading,
  });

  const { data: workshop, isLoading: workshopLoading } = useQuery({
    queryKey: ['workshop', id],
    queryFn: () => apiRequest<Workshop>(`/workshops/${id}`, { token }),
    enabled: Boolean(id) && !loading,
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
    mutationFn: () => apiRequest(`/workshops/${id}/materials`, { method: 'POST', token, body: JSON.stringify(newMaterial) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['workshop', id] });
      setNewMaterial({ title: '', url: '', type: 'link' });
      toast.success('Material added — visible to approved participants');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const removeMaterialMut = useMutation({
    mutationFn: (index: number) => apiRequest(`/workshops/${id}/materials/${index}`, { method: 'DELETE', token }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['workshop', id] }); toast.success('Material removed'); },
    onError: e => toast.error(normalizeApiError(e)),
  });

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
        actions={<Button variant="outline" leftIcon={QrCode} href={`/dashboard/workshops/${id}/checkin`}>QR Check-in</Button>}
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
                <p className="ui-text-xs ui-text-muted" style={{ opacity: 0.7 }}>Registered: {formatDateTime(reg.createdAt)}</p>
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

      {/* ── MATERIALS TAB ── */}
      {activeTab === 'materials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Add material form */}
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={17} style={{ color: 'var(--accent)' }} /> Add Material
              </h3>
            </div>
            <div className="ui-card__body">
              <Alert variant="info" className="ui-mb-4">
                Materials are only visible to participants with <strong>Approved</strong> or <strong>Attended</strong> status.
              </Alert>
              <div className="ui-grid-3" style={{ marginBottom: 14 }}>
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Title *</label>
                  <input className="ui-input" value={newMaterial.title}
                    onChange={e => setNewMaterial(m => ({ ...m, title: e.target.value }))}
                    placeholder="e.g. Lecture Slides" />
                </div>
                <div className="ui-input-wrap">
                  <label className="ui-input-label">URL *</label>
                  <input className="ui-input" value={newMaterial.url}
                    onChange={e => setNewMaterial(m => ({ ...m, url: e.target.value }))}
                    placeholder="https://drive.google.com/…" />
                </div>
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Type</label>
                  <select className="ui-select" value={newMaterial.type}
                    onChange={e => setNewMaterial(m => ({ ...m, type: e.target.value }))}>
                    <option value="link">Link</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <Button leftIcon={Plus} isLoading={addMaterialMut.isPending}
                onClick={() => {
                  if (!newMaterial.title.trim() || !newMaterial.url.trim()) {
                    toast.error('Title and URL are required');
                    return;
                  }
                  addMaterialMut.mutate();
                }}>
                Add Material
              </Button>
            </div>
          </div>

          {/* Materials list */}
          <div className="ui-card" style={{ padding: 0 }}>
            <div className="ui-card__header">
              <h3 className="ui-card__title">Current Materials</h3>
              <Badge variant="neutral">{workshop?.materials?.length ?? 0} items</Badge>
            </div>

            {workshopLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            )}

            {!workshopLoading && (!workshop?.materials || workshop.materials.length === 0) && (
              <EmptyState icon={BookOpen} title="No materials yet"
                description="Add PDFs, videos, or links for approved participants" size="sm" />
            )}

            {!workshopLoading && workshop?.materials && workshop.materials.length > 0 && (
              <div>
                {workshop.materials.map((m, i) => {
                  const Icon = MATERIAL_ICONS[m.type] ?? Link2;
                  return (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px',
                        borderBottom: i < workshop.materials.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                      }}>
                        <Icon size={18} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{m.title}</p>
                        <a href={m.url} target="_blank" rel="noopener noreferrer"
                          className="ui-text-xs ui-text-muted ui-truncate"
                          style={{ display: 'block', color: 'var(--accent)', textDecoration: 'none' }}>
                          {m.url}
                        </a>
                      </div>

                      {/* Type badge */}
                      <Badge variant="neutral">{m.type.toUpperCase()}</Badge>

                      {/* Actions */}
                      <div className="ui-flex ui-flex-gap-2">
                        <a href={m.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" leftIcon={Download}>Open</Button>
                        </a>
                        <Button variant="danger" size="sm" leftIcon={Trash2}
                          isLoading={removeMaterialMut.isPending}
                          onClick={() => {
                            if (window.confirm(`Remove "${m.title}"?`)) {
                              removeMaterialMut.mutate(i);
                            }
                          }}>
                          Remove
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
