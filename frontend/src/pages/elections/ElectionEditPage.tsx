import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { queryKeys, invalidateQueries } from '../../lib/queryKeys';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

type Election = {
  _id: string;
  name: string;
  currentPhase: number;
  startsOn: string;
  endsOn: string;
  status: string;
  termId?: { _id: string; name: string };
};

type Term = { _id: string; name: string; status: string };

export function ElectionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const qc = useQueryClient();

  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));
  const canEdit = Boolean(user?.roles.some(r => ['Election Commissioner', 'Moderator'].includes(r)));

  const { data: election, isLoading } = useQuery({
    queryKey: queryKeys.elections.detail(id, token),
    queryFn: () => apiRequest<Election>(`/elections/${id}`, { token }),
    enabled: Boolean(hasValidId && token),
  });

  const { data: terms = [] } = useQuery({
    queryKey: queryKeys.governance.ecTermsForElection(token),
    queryFn: () => apiRequest<Term[]>('/governance/ec-terms', { token }),
    enabled: Boolean(token && canEdit),
  });

  const [form, setForm] = useState({
    name: '',
    termId: '',
    startsOn: '',
    endsOn: '',
  });

  // Initialize form when election data loads
  useState(() => {
    if (election) {
      setForm({
        name: election.name || '',
        termId: election.termId?._id || '',
        startsOn: election.startsOn ? new Date(election.startsOn).toISOString().slice(0, 16) : '',
        endsOn: election.endsOn ? new Date(election.endsOn).toISOString().slice(0, 16) : '',
      });
    }
  });

  // Update form when election loads
  if (election && !form.name && !isLoading) {
    setForm({
      name: election.name || '',
      termId: election.termId?._id || '',
      startsOn: election.startsOn ? new Date(election.startsOn).toISOString().slice(0, 16) : '',
      endsOn: election.endsOn ? new Date(election.endsOn).toISOString().slice(0, 16) : '',
    });
  }

  const updateMut = useMutation({
    mutationFn: () => {
      const updateData: any = {
        name: form.name,
        termId: form.termId,
        startsOn: new Date(form.startsOn).toISOString(),
        endsOn: new Date(form.endsOn).toISOString(),
      };

      return apiRequest(`/elections/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        ...invalidateQueries.elections.all(qc, token),
        qc.invalidateQueries({ queryKey: queryKeys.elections.detail(id, token) }),
      ]);
      toast.success('Election updated successfully');
      navigate(`/dashboard/elections/${id}`);
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('Election name is required');
      return;
    }
    
    if (!form.termId) {
      toast.error('EC Term is required');
      return;
    }
    
    if (!form.startsOn || !form.endsOn) {
      toast.error('Start and end dates are required');
      return;
    }
    
    if (new Date(form.endsOn) <= new Date(form.startsOn)) {
      toast.error('End date must be after start date');
      return;
    }

    updateMut.mutate();
  }

  if (!hasValidId) {
    return (
      <div className="ui-page">
        <Alert variant="error">Invalid election ID</Alert>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="ui-page">
        <Alert variant="error">You don't have permission to edit elections. Only Election Commissioners and Moderators can edit elections.</Alert>
        <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate('/dashboard/elections')} style={{ marginTop: 16 }}>
          Back to Elections
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="ui-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="ui-page">
        <EmptyState 
          icon={AlertCircle} 
          title="Election not found" 
          description="This election may have been deleted or you don't have permission to view it."
        />
        <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate('/dashboard/elections')} style={{ marginTop: 16 }}>
          Back to Elections
        </Button>
      </div>
    );
  }

  // Warn if election is not in Draft status
  const isNotDraft = election.status !== 'Draft' && election.status !== 'Setup';

  return (
    <div className="ui-page">
      <PageHeader
        title="Edit Election"
        description={`Editing: ${election.name}`}
        backButton
        breadcrumbs={[
          { label: 'Elections', href: '/dashboard/elections' },
          { label: election.name, href: `/dashboard/elections/${id}` },
          { label: 'Edit' },
        ]}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {isNotDraft && (
          <Alert variant="warning" className="ui-mb-4">
            <strong>Warning:</strong> This election is currently <strong>{election.status}</strong>. 
            Editing dates or term after the election has started may affect candidates, voters, and results. 
            Proceed with caution.
          </Alert>
        )}

        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">Election Details</h3>
            <p className="ui-text-sm ui-text-muted">Update election information. Changes will be saved immediately.</p>
          </div>

          <div className="ui-card__body">
            <form onSubmit={handleSubmit}>
              <div className="ui-grid-2" style={{ marginBottom: 16 }}>
                <div className="ui-input-wrap" style={{ gridColumn: '1 / -1' }}>
                  <label className="ui-input-label">Election Name *</label>
                  <input 
                    className="ui-input" 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                    placeholder="e.g., Annual EC Election 2024"
                    required 
                  />
                  <p className="ui-text-xs ui-text-muted" style={{ marginTop: 4 }}>
                    A descriptive name for this election
                  </p>
                </div>

                <div className="ui-input-wrap">
                  <label className="ui-input-label">EC Term *</label>
                  <select 
                    className="ui-select" 
                    value={form.termId} 
                    onChange={e => setForm(f => ({ ...f, termId: e.target.value }))} 
                    required
                  >
                    <option value="">Select term…</option>
                    {terms.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.name} [{t.status}]
                      </option>
                    ))}
                  </select>
                  <p className="ui-text-xs ui-text-muted" style={{ marginTop: 4 }}>
                    The EC term this election will fill
                  </p>
                </div>

                <div className="ui-input-wrap">
                  <label className="ui-input-label">Current Phase</label>
                  <input 
                    className="ui-input" 
                    value={`Phase ${election.currentPhase}`}
                    disabled
                    style={{ background: 'var(--surface)', cursor: 'not-allowed' }}
                  />
                  <p className="ui-text-xs ui-text-muted" style={{ marginTop: 4 }}>
                    Phase cannot be edited directly. Use status controls.
                  </p>
                </div>

                <div className="ui-input-wrap">
                  <label className="ui-input-label">Phase 1 Starts On *</label>
                  <input 
                    type="datetime-local" 
                    className="ui-input" 
                    value={form.startsOn} 
                    onChange={e => setForm(f => ({ ...f, startsOn: e.target.value }))} 
                    required 
                  />
                  <p className="ui-text-xs ui-text-muted" style={{ marginTop: 4 }}>
                    When Phase 1 voting begins
                  </p>
                </div>

                <div className="ui-input-wrap">
                  <label className="ui-input-label">Phase 1 Ends On *</label>
                  <input 
                    type="datetime-local" 
                    className="ui-input" 
                    value={form.endsOn} 
                    onChange={e => setForm(f => ({ ...f, endsOn: e.target.value }))} 
                    required 
                  />
                  <p className="ui-text-xs ui-text-muted" style={{ marginTop: 4 }}>
                    When Phase 1 voting ends
                  </p>
                </div>
              </div>

              {terms.length === 0 && (
                <Alert variant="warning" className="ui-mb-3">
                  No EC terms found. Create a term first in Governance → EC Terms.
                </Alert>
              )}

              <Alert variant="info" className="ui-mb-3">
                <strong>Note:</strong> Elections always start at Phase 1 (Batch Representatives). 
                After Phase 1 completes, the Election Commission will advance to Phase 2 (Office Bearers).
              </Alert>

              <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end', marginTop: 24 }}>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => navigate(`/dashboard/elections/${id}`)}
                  leftIcon={ArrowLeft}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  leftIcon={Save}
                  isLoading={updateMut.isPending}
                  disabled={!form.name || !form.termId || !form.startsOn || !form.endsOn}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Current Status Card */}
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">Current Status</h3>
          </div>
          <div className="ui-card__body">
            <div className="ui-grid-3">
              <div>
                <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Status</p>
                <p style={{ fontWeight: 600 }}>{election.status}</p>
              </div>
              <div>
                <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Current Phase</p>
                <p style={{ fontWeight: 600 }}>Phase {election.currentPhase}</p>
              </div>
              <div>
                <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>EC Term</p>
                <p style={{ fontWeight: 600 }}>{election.termId?.name || 'Not assigned'}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
