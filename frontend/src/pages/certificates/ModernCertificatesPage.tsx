import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Plus, Download, CheckCircle, Clock, XCircle, Briefcase, Star } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { env } from '../../config/env';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type ECPost = { year: number; postTitle: string; startDate: string; endDate?: string };
type VolContrib = { eventTitle: string; role: string; date: string; description?: string };
type CertReq = {
  _id: string; certificateNo?: string; certificateType: string; purpose: string;
  contributionSummary: string; ecPostHistory?: ECPost[]; volunteerContributions?: VolContrib[];
  status: 'PendingModerator' | 'PendingChairman' | 'Approved' | 'Rejected';
  requesterUserId?: { firstName?: string; lastName?: string; email?: string };
  requesterMemberId?: { studentId?: string; batch?: number };
  moderatorReview?: { signatureName?: string; signatureTitle?: string };
  createdAt?: string;
};

const STATUS_CFG: Record<string, { label: string; variant: 'warning' | 'success' | 'error' | 'neutral'; icon: any }> = {
  PendingModerator: { label: 'Pending Moderator', variant: 'warning', icon: Clock },
  PendingChairman:  { label: 'Pending Chairman',  variant: 'warning', icon: Clock },
  Approved:         { label: 'Approved',           variant: 'success', icon: CheckCircle },
  Rejected:         { label: 'Rejected',           variant: 'error',   icon: XCircle },
};

export function ModernCertificatesPage() {
  const { token, user, loading } = useAuth();
  const qc = useQueryClient();

  const roles      = user?.roles ?? [];
  const isMod      = roles.includes('Moderator');
  const isChair    = roles.includes('Chief Patron') || roles.includes('Chairman');
  const canApply   = !isMod && !isChair;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ certificateType: 'MembershipContribution', purpose: '', contributionSummary: '' });
  const [ecPosts, setEcPosts]   = useState<ECPost[]>([]);
  const [vols, setVols]         = useState<VolContrib[]>([]);
  const [newEc, setNewEc]       = useState({ year: new Date().getFullYear(), postTitle: '', startDate: '', endDate: '' });
  const [newVol, setNewVol]     = useState({ eventTitle: '', role: '', date: '', description: '' });
  const [modSign, setModSign]   = useState({ signatureName: '', signatureTitle: 'Moderator' });
  const [chairSign, setChairSign] = useState({ signatureName: '', signatureTitle: 'Chairman' });

  const { data: mine = [],  isLoading: loadMine  } = useQuery({ queryKey: ['cert-my', token],    queryFn: () => apiRequest<CertReq[]>('/certificates/my', { token }),                    enabled: Boolean(token) && !loading });
  const { data: modInbox = [], isLoading: loadMod } = useQuery({ queryKey: ['cert-mod', token],   queryFn: () => apiRequest<CertReq[]>('/certificates/inbox/moderator', { token }),       enabled: Boolean(token && isMod) && !loading });
  const { data: chairInbox = [], isLoading: loadChair } = useQuery({ queryKey: ['cert-chair', token], queryFn: () => apiRequest<CertReq[]>('/certificates/inbox/chairman', { token }), enabled: Boolean(token && isChair) && !loading });

  const createMut = useMutation({
    mutationFn: () => apiRequest('/certificates/requests', { method: 'POST', token, body: JSON.stringify({ ...form, ecPostHistory: ecPosts, volunteerContributions: vols }) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cert-my', token] });
      setForm({ certificateType: 'MembershipContribution', purpose: '', contributionSummary: '' });
      setEcPosts([]); setVols([]); setShowForm(false);
      toast.success('Certificate request submitted');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const modMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'Approved' | 'Rejected' }) =>
      apiRequest(`/certificates/${id}/moderator-review`, { method: 'PATCH', token, body: JSON.stringify({ action, comment: action === 'Rejected' ? 'Rejected by moderator' : '', signatureName: modSign.signatureName, signatureTitle: modSign.signatureTitle }) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cert-mod', token] });
      await qc.invalidateQueries({ queryKey: ['cert-chair', token] });
      toast.success('Review submitted');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const chairMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'Approved' | 'Rejected' }) =>
      apiRequest(`/certificates/${id}/chairman-review`, { method: 'PATCH', token, body: JSON.stringify({ action, comment: action === 'Rejected' ? 'Rejected by chairman' : '', signatureName: chairSign.signatureName, signatureTitle: chairSign.signatureTitle }) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cert-chair', token] });
      await qc.invalidateQueries({ queryKey: ['cert-my', token] });
      toast.success('Final review submitted');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  async function downloadCert(id: string) {
    try {
      const res = await fetch(`${env.apiBaseUrl}/certificates/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const match = (res.headers.get('content-disposition') ?? '').match(/filename="?([^"]+)"?/i);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = match?.[1] ?? 'certificate.txt';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch (e) { toast.error(normalizeApiError(e)); }
  }

  const approved = useMemo(() => mine.filter(r => r.status === 'Approved'), [mine]);

  return (
    <div className="ui-page">
      <PageHeader
        title="Certificates"
        description="Request and manage membership contribution certificates (Article XIX)"
        actions={canApply && <Button leftIcon={Plus} onClick={() => setShowForm(v => !v)}>{showForm ? 'Cancel' : 'Request Certificate'}</Button>}
      />

      {!canApply && <Alert variant="info">Reviewer mode — you can review and sign certificate requests from this page.</Alert>}

      {/* Request Form */}
      <AnimatePresence>
        {showForm && canApply && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="ui-card">
              <div className="ui-card__header"><h3 className="ui-card__title">New Certificate Request</h3></div>
              <div className="ui-card__body">
                <form onSubmit={e => { e.preventDefault(); createMut.mutate(); }}>
                  <div className="ui-grid-2" style={{ marginBottom: 14 }}>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Certificate Type</label>
                      <select className="ui-select" value={form.certificateType} onChange={e => setForm(f => ({ ...f, certificateType: e.target.value }))}>
                        <option value="MembershipContribution">Membership Contribution</option>
                      </select>
                    </div>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Purpose *</label>
                      <input className="ui-input" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Higher study / internship / job application" required />
                    </div>
                  </div>
                  <div className="ui-input-wrap" style={{ marginBottom: 14 }}>
                    <label className="ui-input-label">Contribution Summary *</label>
                    <textarea className="ui-textarea" rows={4} value={form.contributionSummary} onChange={e => setForm(f => ({ ...f, contributionSummary: e.target.value }))} placeholder="Describe your overall contributions…" required />
                  </div>

                  {/* EC Posts */}
                  <div style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 14 }}>
                    <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Briefcase size={15} /> EC Post History <span className="ui-text-xs ui-text-muted">(Optional)</span>
                    </p>
                    <div className="ui-grid-4" style={{ marginBottom: 10 }}>
                      {(['year','postTitle','startDate','endDate'] as const).map(f => (
                        <div key={f} className="ui-input-wrap">
                          <label className="ui-input-label">{f === 'postTitle' ? 'Post Title' : f === 'startDate' ? 'Start Date' : f === 'endDate' ? 'End Date' : 'Year'}</label>
                          <input
                            type={f === 'year' ? 'number' : f.includes('Date') ? 'date' : 'text'}
                            className="ui-input"
                            value={newEc[f]}
                            onChange={e => setNewEc(n => ({ ...n, [f]: f === 'year' ? parseInt(e.target.value) : e.target.value }))}
                            placeholder={f === 'endDate' ? 'Optional' : ''}
                          />
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" type="button"
                      onClick={() => { if (newEc.postTitle && newEc.startDate) { setEcPosts(p => [...p, { ...newEc }]); setNewEc({ year: new Date().getFullYear(), postTitle: '', startDate: '', endDate: '' }); } }}>
                      Add Post
                    </Button>
                    {ecPosts.length > 0 && (
                      <div className="ui-flex ui-flex-wrap ui-flex-gap-2" style={{ marginTop: 10 }}>
                        {ecPosts.map((p, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', background: 'rgba(107,163,255,0.12)', color: 'var(--accent)', border: '1px solid rgba(107,163,255,0.25)' }}>
                            {p.postTitle} ({p.year})
                            <button type="button" onClick={() => setEcPosts(ps => ps.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Volunteer Contributions */}
                  <div style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 16 }}>
                    <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Star size={15} /> Volunteer Contributions <span className="ui-text-xs ui-text-muted">(Optional)</span>
                    </p>
                    <div className="ui-grid-4" style={{ marginBottom: 10 }}>
                      {(['eventTitle','role','date','description'] as const).map(f => (
                        <div key={f} className="ui-input-wrap">
                          <label className="ui-input-label">{f === 'eventTitle' ? 'Event Title' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                          <input
                            type={f === 'date' ? 'date' : 'text'}
                            className="ui-input"
                            value={newVol[f]}
                            onChange={e => setNewVol(n => ({ ...n, [f]: e.target.value }))}
                            placeholder={f === 'description' ? 'Optional' : ''}
                          />
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" type="button"
                      onClick={() => { if (newVol.eventTitle && newVol.role && newVol.date) { setVols(v => [...v, { ...newVol }]); setNewVol({ eventTitle: '', role: '', date: '', description: '' }); } }}>
                      Add Contribution
                    </Button>
                    {vols.length > 0 && (
                      <div className="ui-flex ui-flex-wrap ui-flex-gap-2" style={{ marginTop: 10 }}>
                        {vols.map((v, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                            {v.eventTitle} — {v.role}
                            <button type="button" onClick={() => setVols(vs => vs.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
                    <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button type="submit" isLoading={createMut.isPending}>Submit Request</Button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Requests */}
      <div className="ui-card" style={{ padding: 0 }}>
        <div className="ui-card__header"><h3 className="ui-card__title">My Certificate Requests</h3></div>
        {loadMine ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : mine.length === 0 ? (
          <EmptyState icon={Award} title="No requests yet" description="Submit a certificate request to get started" size="sm" />
        ) : (
          <div>
            {mine.map((req, i) => {
              const cfg = STATUS_CFG[req.status];
              const StatusIcon = cfg.icon;
              return (
                <motion.div key={req._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '13px 22px',
                    borderBottom: i < mine.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.18s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                    <Award size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{req.certificateNo ?? 'Pending No.'}</p>
                    <p className="ui-text-xs ui-text-muted ui-truncate">{req.purpose}</p>
                    {req.createdAt && <p className="ui-text-xs ui-text-muted" style={{ opacity: 0.7 }}>{formatDateTime(req.createdAt)}</p>}
                  </div>
                  <Badge variant={cfg.variant} icon={StatusIcon}>{cfg.label}</Badge>
                  {req.status === 'Approved' && (
                    <Button variant="primary" size="sm" leftIcon={Download} onClick={() => downloadCert(req._id)}>Download</Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approved Certificates */}
      {approved.length > 0 && (
        <div className="ui-card">
          <div className="ui-card__header"><h3 className="ui-card__title">Approved Certificates</h3></div>
          <div className="ui-card__body">
            <div className="ui-grid-3">
              {approved.map(req => (
                <motion.div key={req._id} whileHover={{ y: -4 }}
                  style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <div className="ui-flex ui-flex-gap-3" style={{ marginBottom: 10, alignItems: 'center' }}>
                    <Award size={22} style={{ color: '#10b981' }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{req.certificateNo}</p>
                      <Badge variant="success" size="sm">Approved</Badge>
                    </div>
                  </div>
                  <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 12, lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {req.purpose}
                  </p>
                  <Button variant="success" size="sm" leftIcon={Download} fullWidth onClick={() => downloadCert(req._id)}>
                    Download Certificate
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Moderator Inbox */}
      {isMod && (
        <ReviewInbox
          title="Moderator Approval Desk" eyebrow="Moderator"
          items={modInbox} isLoading={loadMod}
          sign={modSign} onSignChange={setModSign}
          onApprove={id => modMut.mutate({ id, action: 'Approved' })}
          onReject={id => modMut.mutate({ id, action: 'Rejected' })}
          isPending={modMut.isPending}
        />
      )}

      {/* Chairman Inbox */}
      {isChair && (
        <ReviewInbox
          title="Chairman Final Approval" eyebrow="Chairman"
          items={chairInbox} isLoading={loadChair}
          sign={chairSign} onSignChange={setChairSign}
          onApprove={id => chairMut.mutate({ id, action: 'Approved' })}
          onReject={id => chairMut.mutate({ id, action: 'Rejected' })}
          isPending={chairMut.isPending}
        />
      )}
    </div>
  );
}

/* ── Reviewer Inbox ── */
function ReviewInbox({ title, eyebrow, items, isLoading, sign, onSignChange, onApprove, onReject, isPending }: {
  title: string; eyebrow: string; items: CertReq[]; isLoading: boolean;
  sign: { signatureName: string; signatureTitle: string };
  onSignChange: (s: { signatureName: string; signatureTitle: string }) => void;
  onApprove: (id: string) => void; onReject: (id: string) => void; isPending: boolean;
}) {
  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <p className="ui-text-xs ui-text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{eyebrow}</p>
          <h3 className="ui-card__title">{title}</h3>
        </div>
      </div>
      <div className="ui-card__body">
        {/* Signature inputs */}
        <div className="ui-grid-2" style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 16 }}>
          <div className="ui-input-wrap">
            <label className="ui-input-label">Signature Name</label>
            <input className="ui-input" value={sign.signatureName} onChange={e => onSignChange({ ...sign, signatureName: e.target.value })} placeholder="e.g. Dr. Jane Doe" />
          </div>
          <div className="ui-input-wrap">
            <label className="ui-input-label">Signature Title</label>
            <input className="ui-input" value={sign.signatureTitle} onChange={e => onSignChange({ ...sign, signatureTitle: e.target.value })} />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No pending requests" size="sm" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => {
              const name = `${item.requesterUserId?.firstName ?? ''} ${item.requesterUserId?.lastName ?? ''}`.trim() || item.requesterUserId?.email || 'Unknown';
              return (
                <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{name}</p>
                    <p className="ui-text-xs ui-text-muted">
                      {item.requesterMemberId?.studentId && `ID: ${item.requesterMemberId.studentId} · `}
                      {item.purpose}
                    </p>
                    {(item.ecPostHistory?.length ?? 0) > 0 && (
                      <p className="ui-text-xs ui-text-muted">{item.ecPostHistory!.length} EC position(s)</p>
                    )}
                  </div>
                  <div className="ui-flex ui-flex-gap-2">
                    <Button variant="success" size="sm" leftIcon={CheckCircle} isLoading={isPending} onClick={() => onApprove(item._id)}>Sign & Approve</Button>
                    <Button variant="danger"  size="sm" leftIcon={XCircle}     isLoading={isPending} onClick={() => onReject(item._id)}>Reject</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
