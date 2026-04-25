import { FormEvent, useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, Calendar, Clock, CheckCircle, Plus, Users, Trophy, Play, Square, BarChart2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type Election = { _id: string; name: string; phase: number; startsOn: string; endsOn: string; status: 'Draft' | 'Active' | 'Closed' };
type Term     = { _id: string; name: string; status: string };

const STATUS_CFG: Record<string, { label: string; variant: 'success' | 'warning' | 'neutral'; icon: any }> = {
  Draft:  { label: 'Draft',  variant: 'neutral',  icon: Clock },
  Active: { label: 'Active', variant: 'success',  icon: Play },
  Closed: { label: 'Closed', variant: 'neutral',  icon: Square },
};

const phaseLabel = (p: number) => p === 1 ? 'Phase 1 — Batch Representatives' : 'Phase 2 — Office Bearers';

export function ModernElectionsPage() {
  const { token, user, loading } = useAuth();
  const qc = useQueryClient();

  const canCreate = Boolean(user?.roles.some(r => ['Election Commissioner', 'Moderator'].includes(r)));
  const canRead   = Boolean(user?.roles.some(r =>
    ['General Member','Alumni','President','Vice President','General Secretary','Moderator','Election Commissioner','Chief Patron'].includes(r)
  ));

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', termId: '', phase: 1, startsOn: '', endsOn: '' });

  const { data: elections = [], isLoading } = useQuery({
    queryKey: ['elections', token],
    queryFn: () => apiRequest<Election[]>('/elections', { token }),
    enabled: Boolean(token && canRead) && !loading,
  });
  const { data: terms = [] } = useQuery({
    queryKey: ['ec-terms-for-election', token],
    queryFn: () => apiRequest<Term[]>('/governance/ec-terms', { token }),
    enabled: Boolean(token && canCreate) && !loading,
  });

  const createMut = useMutation({
    mutationFn: () => apiRequest('/elections', {
      method: 'POST', token,
      body: JSON.stringify({ ...form, startsOn: new Date(form.startsOn).toISOString(), endsOn: new Date(form.endsOn).toISOString() }),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['elections', token] });
      setForm({ name: '', termId: '', phase: 1, startsOn: '', endsOn: '' });
      setShowForm(false);
      toast.success('Election created');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Draft' | 'Active' | 'Closed' }) =>
      apiRequest(`/elections/${id}/phase`, { method: 'PATCH', token, body: JSON.stringify({ status }) }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['elections', token] }); toast.success('Status updated'); },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const stats = useMemo(() => ({
    total:  elections.length,
    active: elections.filter(e => e.status === 'Active').length,
    draft:  elections.filter(e => e.status === 'Draft').length,
    closed: elections.filter(e => e.status === 'Closed').length,
  }), [elections]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.startsOn || !form.endsOn) { toast.error('Start and end dates required'); return; }
    if (new Date(form.endsOn) <= new Date(form.startsOn)) { toast.error('End must be after start'); return; }
    createMut.mutate();
  }

  return (
    <div className="ui-page">
      <PageHeader
        title="Elections"
        description="Manage election cycles, phases, candidates, and voting"
        actions={canCreate && (
          <Button leftIcon={Plus} onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : 'New Election'}
          </Button>
        )}
      />

      {/* Stats */}
      <div className="ui-grid-4">
        <StatsCard title="Total"  value={stats.total}  icon={Vote}        color="primary" />
        <StatsCard title="Active" value={stats.active} icon={Play}        color="success" />
        <StatsCard title="Draft"  value={stats.draft}  icon={Clock}       color="warning" />
        <StatsCard title="Closed" value={stats.closed} icon={CheckCircle} color="info"    />
      </div>

      {/* Constitution info cards */}
      <div className="ui-grid-3">
        {[
          { icon: Users,  title: 'Phase 1',    sub: 'Batch Representatives',  desc: 'Voters select representatives from their own batch (ARTICLE XIV).' },
          { icon: Trophy, title: 'Phase 2',    sub: 'Posts 1–11',             desc: 'Approved representatives contest office-bearing posts under eligibility constraints.' },
          { icon: Vote,   title: 'Governance', sub: 'Commission Controlled',  desc: 'Candidate validation, phase control, and result publication are role-protected.' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="ui-card">
              <div className="ui-card__body" style={{ display: 'flex', gap: 14 }}>
                <div style={{ padding: 10, borderRadius: 12, background: 'var(--gradient-primary)', color: '#fff', flexShrink: 0, alignSelf: 'flex-start' }}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="ui-text-xs ui-text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{item.title}</p>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 4 }}>{item.sub}</p>
                  <p className="ui-text-xs ui-text-muted" style={{ lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && canCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="ui-card">
              <div className="ui-card__header"><h3 className="ui-card__title">Create Election</h3></div>
              <div className="ui-card__body">
                <form onSubmit={handleSubmit}>
                  <div className="ui-grid-2" style={{ marginBottom: 16 }}>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Name *</label>
                      <input className="ui-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">EC Term *</label>
                      <select className="ui-select" value={form.termId} onChange={e => setForm(f => ({ ...f, termId: e.target.value }))} required>
                        <option value="">Select term…</option>
                        {terms.map(t => <option key={t._id} value={t._id}>{t.name} [{t.status}]</option>)}
                      </select>
                    </div>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Phase</label>
                      <select className="ui-select" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: Number(e.target.value) }))}>
                        <option value={1}>Phase 1 — Batch Representatives</option>
                        <option value={2}>Phase 2 — Office Bearers</option>
                      </select>
                    </div>
                    <div />
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Starts On *</label>
                      <input type="datetime-local" className="ui-input" value={form.startsOn} onChange={e => setForm(f => ({ ...f, startsOn: e.target.value }))} required />
                    </div>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Ends On *</label>
                      <input type="datetime-local" className="ui-input" value={form.endsOn} onChange={e => setForm(f => ({ ...f, endsOn: e.target.value }))} required />
                    </div>
                  </div>
                  {terms.length === 0 && (
                    <Alert variant="warning" className="ui-mb-3">No EC terms found. Create a term first in Governance → EC Terms.</Alert>
                  )}
                  <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
                    <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button type="submit" isLoading={createMut.isPending}>Create Election</Button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Spinner size="lg" /></div>}

      {/* No permission */}
      {!isLoading && !canRead && (
        <Alert variant="warning">You don't have permission to view elections. Contact a moderator for role assignment.</Alert>
      )}

      {/* Empty */}
      {!isLoading && canRead && elections.length === 0 && (
        <div className="ui-card">
          <EmptyState icon={Vote} title="No elections yet" description="Ask an Election Commissioner or Moderator to create and activate an election." />
        </div>
      )}

      {/* Elections list */}
      {!isLoading && canRead && elections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {elections.map((el, i) => {
            const cfg = STATUS_CFG[el.status] ?? STATUS_CFG.Draft;
            const StatusIcon = cfg.icon;
            const now    = new Date();
            const starts = new Date(el.startsOn);
            const ends   = new Date(el.endsOn);
            const isActive = el.status === 'Active';
            const pct = isActive ? Math.min(100, ((now.getTime() - starts.getTime()) / (ends.getTime() - starts.getTime())) * 100) : 0;
            const daysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / 86400000));

            return (
              <motion.div key={el._id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="ui-card" style={{ padding: 0 }}>
                  <div style={{ display: 'flex', gap: 20, padding: '18px 22px', flexWrap: 'wrap' }}>
                    {/* Phase badge */}
                    <div style={{
                      width: 60, height: 60, borderRadius: 16, flexShrink: 0,
                      background: 'var(--gradient-primary)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1 }}>{el.phase}</span>
                      <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', opacity: 0.85 }}>Phase</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title + status */}
                      <div className="ui-flex ui-flex-between" style={{ marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{el.name}</h3>
                        <Badge variant={cfg.variant} icon={StatusIcon}>{cfg.label}</Badge>
                      </div>

                      <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 10 }}>{phaseLabel(el.phase)}</p>

                      {/* Dates */}
                      <div className="ui-flex ui-flex-gap-4 ui-text-xs ui-text-muted" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                        <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                          <Calendar size={12} style={{ color: 'var(--accent)' }} /> Starts: {formatDateTime(el.startsOn)}
                        </span>
                        <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                          <Clock size={12} style={{ color: 'var(--accent)' }} /> Ends: {formatDateTime(el.endsOn)}
                        </span>
                      </div>

                      {/* Progress bar for active */}
                      {isActive && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="ui-flex ui-flex-between ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>
                            <span>Voting in progress</span>
                            <span>{daysLeft}d left</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
                            <motion.div
                              style={{ height: '100%', background: 'linear-gradient(90deg,#10b981,#059669)', borderRadius: 999 }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="ui-flex ui-flex-gap-2" style={{ flexWrap: 'wrap' }}>
                        <Button variant="outline" size="sm" href={`/dashboard/elections/${el._id}/results`} leftIcon={BarChart2}>Results</Button>
                        {isActive && <Button variant="primary" size="sm" href={`/dashboard/elections/${el._id}/vote`} leftIcon={Vote}>Vote Now</Button>}
                        {canCreate && (
                          <>
                            <Button variant="ghost" size="sm" href={`/dashboard/elections/${el._id}/candidates`} leftIcon={Users}>Candidates</Button>
                            {el.status === 'Draft' && (
                              <Button variant="success" size="sm" leftIcon={Play} isLoading={statusMut.isPending}
                                onClick={() => statusMut.mutate({ id: el._id, status: 'Active' })}>Activate</Button>
                            )}
                            {isActive && (
                              <Button variant="danger" size="sm" leftIcon={Square} isLoading={statusMut.isPending}
                                onClick={() => statusMut.mutate({ id: el._id, status: 'Closed' })}>Close</Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
