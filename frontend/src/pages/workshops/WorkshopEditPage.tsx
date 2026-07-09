import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, BookOpen, Save } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { queryKeys, invalidateQueries } from '../../lib/queryKeys';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import toast from 'react-hot-toast';

const CATEGORIES = ['Technical', 'Soft Skills', 'Research', 'Career', 'Creative', 'Other'];
const LEVELS     = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

type Workshop = {
  _id: string; title: string; description: string; shortDescription?: string; coverImage?: string;
  startDate: string; endDate: string; venue: string; isOnline: boolean; onlineLink?: string;
  category: string; level: string; tags: string[];
  capacity: number; registrationDeadline?: string; requiresApproval: boolean;
  isFree: boolean; fee: number;
  prerequisites: string[]; learningOutcomes: string[];
  status: string;
  speakers: Array<{ name: string; designation?: string; organization?: string; bio?: string }>;
};

export function WorkshopEditPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '', description: '', shortDescription: '', coverImage: '',
    startDate: '', endDate: '', venue: '', isOnline: false, onlineLink: '',
    category: 'Technical', level: 'All Levels', tags: [] as string[],
    capacity: 30, registrationDeadline: '', requiresApproval: false,
    isFree: true, fee: 0,
    prerequisites: [] as string[], learningOutcomes: [] as string[],
    status: 'Draft',
    targetAudience: {
      allowedYears: [] as number[],
      allowedBatches: [] as number[],
      allowedRoles: [] as string[],
      invitedUsers: [] as string[],
    },
  });

  const [tagInput, setTagInput]     = useState('');
  const [prereqInput, setPrereq]    = useState('');
  const [outcomeInput, setOutcome]  = useState('');
  const [audienceBatchInput, setAudienceBatchInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Array<{ _id: string; fullName: string; email: string }>>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [speakers, setSpeakers] = useState<Array<{ name: string; designation?: string; organization?: string; bio?: string }>>([]);
  const [newSpeaker, setNewSpeaker] = useState({ name: '', designation: '', organization: '', bio: '' });

  const { data: workshop, isLoading } = useQuery({
    queryKey: queryKeys.workshops.detail(id!, token ?? ''),
    queryFn: () => apiRequest<Workshop>(`/workshops/${id}`, { token }),
    enabled: Boolean(id && token),
  });

  useEffect(() => {
    if (!workshop) return;
    setForm({
      title: workshop.title,
      description: workshop.description,
      shortDescription: workshop.shortDescription || '',
      coverImage: workshop.coverImage || '',
      startDate: workshop.startDate ? new Date(workshop.startDate).toISOString().slice(0, 16) : '',
      endDate: workshop.endDate ? new Date(workshop.endDate).toISOString().slice(0, 16) : '',
      venue: workshop.venue,
      isOnline: workshop.isOnline,
      onlineLink: workshop.onlineLink || '',
      category: workshop.category,
      level: workshop.level,
      tags: workshop.tags || [],
      capacity: workshop.capacity,
      registrationDeadline: workshop.registrationDeadline ? new Date(workshop.registrationDeadline).toISOString().slice(0, 16) : '',
      requiresApproval: workshop.requiresApproval,
      isFree: workshop.isFree,
      fee: workshop.fee,
      prerequisites: workshop.prerequisites || [],
      learningOutcomes: workshop.learningOutcomes || [],
      status: workshop.status,
      targetAudience: {
        allowedYears: (workshop as any).targetAudience?.allowedYears || [],
        allowedBatches: (workshop as any).targetAudience?.allowedBatches || [],
        allowedRoles: (workshop as any).targetAudience?.allowedRoles || [],
        invitedUsers: (workshop as any).targetAudience?.invitedUsers || [],
      },
    });
    setSpeakers(workshop.speakers || []);
  }, [workshop]);

  const updateMut = useMutation({
    mutationFn: () => apiRequest(`/workshops/${id}`, { 
      method: 'PATCH', 
      token, 
      body: JSON.stringify({ 
        ...form, 
        speakers,
        targetAudience: form.targetAudience,
      }) 
    }),
    onSuccess: () => {
      // Invalidate workshop queries to force refetch with updated data
      if (token) {
        Promise.all(invalidateQueries.workshops.detail(queryClient, id!, token));
        Promise.all(invalidateQueries.workshops.all(queryClient, token));
      }
      toast.success('Workshop updated!');
      navigate(`/dashboard/workshops/${id}`);
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const addTag = () => { if (tagInput.trim() && !form.tags.includes(tagInput.trim())) { setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] })); setTagInput(''); } };
  const addPrereq = () => { if (prereqInput.trim()) { setForm(f => ({ ...f, prerequisites: [...f.prerequisites, prereqInput.trim()] })); setPrereq(''); } };
  const addOutcome = () => { if (outcomeInput.trim()) { setForm(f => ({ ...f, learningOutcomes: [...f.learningOutcomes, outcomeInput.trim()] })); setOutcome(''); } };
  const addSpeaker = () => { if (newSpeaker.name.trim()) { setSpeakers(s => [...s, { ...newSpeaker }]); setNewSpeaker({ name: '', designation: '', organization: '', bio: '' }); } };

  // Target Audience functions
  const toggleAudienceYear = (year: number) => {
    setForm(f => {
      const exists = f.targetAudience.allowedYears.includes(year);
      return {
        ...f,
        targetAudience: {
          ...f.targetAudience,
          allowedYears: exists
            ? f.targetAudience.allowedYears.filter(y => y !== year)
            : [...f.targetAudience.allowedYears, year].sort((a, b) => a - b),
        },
      };
    });
  };

  const addAudienceBatch = () => {
    const value = Number(audienceBatchInput);
    if (!Number.isInteger(value) || value <= 0) {
      toast.error("Batch must be a positive number.");
      return;
    }
    if (form.targetAudience.allowedBatches.includes(value)) return;
    setForm(f => ({
      ...f,
      targetAudience: {
        ...f.targetAudience,
        allowedBatches: [...f.targetAudience.allowedBatches, value].sort((a, b) => a - b),
      },
    }));
    setAudienceBatchInput('');
  };

  const removeAudienceBatch = (batch: number) => {
    setForm(f => ({
      ...f,
      targetAudience: {
        ...f.targetAudience,
        allowedBatches: f.targetAudience.allowedBatches.filter(b => b !== batch),
      },
    }));
  };

  const addRole = () => {
    const role = roleInput.trim();
    if (!role) {
      toast.error("Role name cannot be empty.");
      return;
    }
    if (form.targetAudience.allowedRoles.includes(role)) return;
    setForm(f => ({
      ...f,
      targetAudience: {
        ...f.targetAudience,
        allowedRoles: [...f.targetAudience.allowedRoles, role],
      },
    }));
    setRoleInput('');
  };

  const removeRole = (role: string) => {
    setForm(f => ({
      ...f,
      targetAudience: {
        ...f.targetAudience,
        allowedRoles: f.targetAudience.allowedRoles.filter(r => r !== role),
      },
    }));
  };

  const addInvitedUser = () => {
    const userId = userSearchInput.trim();
    if (!userId) {
      toast.error("User ID cannot be empty.");
      return;
    }
    if (form.targetAudience.invitedUsers.includes(userId)) return;
    setForm(f => ({
      ...f,
      targetAudience: {
        ...f.targetAudience,
        invitedUsers: [...f.targetAudience.invitedUsers, userId],
      },
    }));
    setUserSearchInput('');
  };

  const removeInvitedUser = (userId: string) => {
    setForm(f => ({
      ...f,
      targetAudience: {
        ...f.targetAudience,
        invitedUsers: f.targetAudience.invitedUsers.filter(u => u !== userId),
      },
    }));
  };

  // Search users with debounce
  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUserSearchResults([]);
      setShowUserDropdown(false);
      return;
    }
    
    try {
      const users = await apiRequest<Array<{ _id: string; fullName: string; email: string }>>(`/admin/users?search=${query}`, { token });
      setUserSearchResults(users || []);
      setShowUserDropdown(true);
    } catch (err) {
      console.error('Failed to search users:', err);
      setUserSearchResults([]);
    }
  };

  const selectUser = (userId: string) => {
    if (form.targetAudience.invitedUsers.includes(userId)) {
      toast.error("User already invited");
      return;
    }
    setForm(f => ({
      ...f,
      targetAudience: {
        ...f.targetAudience,
        invitedUsers: [...f.targetAudience.invitedUsers, userId],
      },
    }));
    setUserSearchInput('');
    setShowUserDropdown(false);
    setUserSearchResults([]);
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}><Spinner size="xl" label="Loading workshop…" /></div>;
  if (!workshop) return <EmptyState icon={BookOpen} title="Workshop not found" action={<Button href="/dashboard/workshops">Back to Workshops</Button>} />;

  const canEdit = user?.roles.some(r => ['President', 'Vice President', 'General Secretary', 'AGS (Organization)', 'Moderator'].includes(r));
  if (!canEdit) return <EmptyState icon={BookOpen} title="Unauthorized" description="You don't have permission to edit this workshop" action={<Button href="/dashboard/workshops">Back to Workshops</Button>} />;

  return (
    <div className="ui-page">
      <PageHeader title="Edit Workshop" description={`Editing: ${workshop.title}`} backButton
        breadcrumbs={[{ label: 'Workshops', href: '/dashboard/workshops' }, { label: workshop.title, href: `/dashboard/workshops/${id}` }, { label: 'Edit' }]} />

      <form onSubmit={e => { e.preventDefault(); updateMut.mutate(); }}>
        {/* Basic Info */}
        <div className="ui-card" style={{ marginBottom: 20 }}>
          <div className="ui-card__header"><h3 className="ui-card__title">Basic Information</h3></div>
          <div className="ui-card__body">
            <div className="ui-input-wrap" style={{ marginBottom: 14 }}>
              <label className="ui-input-label">Title *</label>
              <input className="ui-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="ui-input-wrap" style={{ marginBottom: 14 }}>
              <label className="ui-input-label">Short Description</label>
              <input className="ui-input" value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))} placeholder="One-line summary" />
            </div>
            <div className="ui-input-wrap" style={{ marginBottom: 14 }}>
              <label className="ui-input-label">Full Description *</label>
              <textarea className="ui-textarea" rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="ui-input-wrap" style={{ marginBottom: 14 }}>
              <label className="ui-input-label">Cover Image URL</label>
              <input className="ui-input" value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="ui-grid-2">
              <div className="ui-input-wrap">
                <label className="ui-input-label">Category</label>
                <select className="ui-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="ui-input-wrap">
                <label className="ui-input-label">Level</label>
                <select className="ui-select" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Venue */}
        <div className="ui-card" style={{ marginBottom: 20 }}>
          <div className="ui-card__header"><h3 className="ui-card__title">Schedule & Venue</h3></div>
          <div className="ui-card__body">
            <div className="ui-grid-2" style={{ marginBottom: 14 }}>
              <div className="ui-input-wrap">
                <label className="ui-input-label">Start Date & Time *</label>
                <input type="datetime-local" className="ui-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div className="ui-input-wrap">
                <label className="ui-input-label">End Date & Time *</label>
                <input type="datetime-local" className="ui-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
              </div>
              <div className="ui-input-wrap">
                <label className="ui-input-label">Registration Deadline</label>
                <input type="datetime-local" className="ui-input" value={form.registrationDeadline} onChange={e => setForm(f => ({ ...f, registrationDeadline: e.target.value }))} />
              </div>
              <div className="ui-input-wrap">
                <label className="ui-input-label">Capacity *</label>
                <input type="number" min={1} className="ui-input" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} required />
              </div>
            </div>
            <div className="ui-input-wrap" style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text)' }}>
                <input type="checkbox" checked={form.isOnline} onChange={e => setForm(f => ({ ...f, isOnline: e.target.checked }))} />
                Online Workshop
              </label>
            </div>
            {form.isOnline ? (
              <div className="ui-input-wrap">
                <label className="ui-input-label">Online Meeting Link</label>
                <input className="ui-input" value={form.onlineLink} onChange={e => setForm(f => ({ ...f, onlineLink: e.target.value }))} placeholder="https://meet.google.com/…" />
              </div>
            ) : (
              <div className="ui-input-wrap">
                <label className="ui-input-label">Venue *</label>
                <input className="ui-input" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} required={!form.isOnline} />
              </div>
            )}
          </div>
        </div>

        {/* Registration & Payment */}
        <div className="ui-card" style={{ marginBottom: 20 }}>
          <div className="ui-card__header"><h3 className="ui-card__title">Registration & Payment</h3></div>
          <div className="ui-card__body">
            <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text)' }}>
                <input type="checkbox" checked={form.isFree} onChange={e => setForm(f => ({ ...f, isFree: e.target.checked }))} />
                Free Workshop
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text)' }}>
                <input type="checkbox" checked={form.requiresApproval} onChange={e => setForm(f => ({ ...f, requiresApproval: e.target.checked }))} />
                Requires Approval
              </label>
            </div>
            {!form.isFree && (
              <div className="ui-input-wrap">
                <label className="ui-input-label">Registration Fee (BDT) *</label>
                <input type="number" min={1} className="ui-input" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: Number(e.target.value) }))} />
              </div>
            )}
            <div className="ui-input-wrap" style={{ marginTop: 14 }}>
              <label className="ui-input-label">Status</label>
              <select className="ui-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Registration_Open">Registration Open</option>
                <option value="Registration_Closed">Registration Closed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Target Audience */}
        <div className="ui-card" style={{ marginBottom: 20 }}>
          <div className="ui-card__header"><h3 className="ui-card__title">Target Audience & Visibility</h3></div>
          <div className="ui-card__body">
            <p className="ui-text-sm ui-text-muted" style={{ marginBottom: 16 }}>
              Control who can see and register for this workshop. Leave all filters empty to make it public. 
              Use year/batch for academic targeting, role-based for EC/committee members, or manually invite specific users.
            </p>

            {/* Year Filtering */}
            <div style={{ marginBottom: 20 }}>
              <label className="ui-input-label" style={{ marginBottom: 10 }}>Year Filtering</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5].map(year => {
                  const selected = form.targetAudience.allowedYears.includes(year);
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => toggleAudienceYear(year)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: selected ? 'rgba(107,163,255,0.12)' : 'var(--surface)',
                        color: selected ? 'var(--accent)' : 'var(--text)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      Year {year}
                    </button>
                  );
                })}
              </div>
              {form.targetAudience.allowedYears.length > 0 && (
                <p className="ui-text-xs ui-text-muted" style={{ marginTop: 8 }}>
                  Only Year {form.targetAudience.allowedYears.join(', ')} students will see this workshop.
                </p>
              )}
            </div>

            {/* Batch Filtering */}
            <div style={{ marginBottom: 20 }}>
              <label className="ui-input-label" style={{ marginBottom: 10 }}>Batch Filtering</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="number"
                  min={1}
                  className="ui-input"
                  style={{ flex: 1 }}
                  placeholder="Add batch e.g. 29"
                  value={audienceBatchInput}
                  onChange={(e) => setAudienceBatchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAudienceBatch(); } }}
                />
                <Button variant="outline" type="button" onClick={addAudienceBatch}>Add Batch</Button>
              </div>
              {form.targetAudience.allowedBatches.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {form.targetAudience.allowedBatches.map(batch => (
                    <span 
                      key={batch}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        padding: '4px 10px', 
                        borderRadius: 999, 
                        fontSize: '0.78rem', 
                        background: 'rgba(107,163,255,0.12)', 
                        color: 'var(--accent)', 
                        border: '1px solid rgba(107,163,255,0.25)' 
                      }}
                    >
                      Batch {batch}
                      <button 
                        type="button" 
                        onClick={() => removeAudienceBatch(batch)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="ui-text-xs ui-text-muted">No batch restriction. All batches can see this.</p>
              )}
            </div>

            {/* Role-Based Access */}
            <div style={{ marginBottom: 20 }}>
              <label className="ui-input-label" style={{ marginBottom: 10 }}>Role-Based Access (EC, Committees)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  className="ui-input"
                  style={{ flex: 1 }}
                  placeholder="e.g. President, Vice President, EC Member"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
                />
                <Button variant="outline" type="button" onClick={addRole}>Add Role</Button>
              </div>
              {form.targetAudience.allowedRoles.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {form.targetAudience.allowedRoles.map(role => (
                    <span 
                      key={role}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        padding: '4px 10px', 
                        borderRadius: 999, 
                        fontSize: '0.78rem', 
                        background: 'rgba(16,185,129,0.12)', 
                        color: '#059669', 
                        border: '1px solid rgba(16,185,129,0.25)' 
                      }}
                    >
                      {role}
                      <button 
                        type="button" 
                        onClick={() => removeRole(role)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="ui-text-xs ui-text-muted">No role restriction. Perfect for EC-only or committee-specific workshops.</p>
              )}
            </div>

            {/* Manually Invite Users */}
            <div style={{ marginBottom: 20 }}>
              <label className="ui-input-label" style={{ marginBottom: 10 }}>Manually Invite Specific Users</label>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="text"
                    className="ui-input"
                    style={{ flex: 1 }}
                    placeholder="Search by name or email..."
                    value={userSearchInput}
                    onChange={(e) => {
                      setUserSearchInput(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    onFocus={() => {if (userSearchResults.length > 0) setShowUserDropdown(true);}}
                  />
                </div>
                
                {/* Dropdown Results */}
                {showUserDropdown && userSearchResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    marginTop: '-6px',
                  }}>
                    {userSearchResults.map(user => (
                      <div
                        key={user._id}
                        onClick={() => selectUser(user._id)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(107,163,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text)' }}>
                          {user.fullName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                          {user.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {form.targetAudience.invitedUsers.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {form.targetAudience.invitedUsers.map(userId => (
                    <span 
                      key={userId}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        padding: '4px 10px', 
                        borderRadius: 999, 
                        fontSize: '0.78rem', 
                        background: 'rgba(245,158,11,0.12)', 
                        color: '#d97706', 
                        border: '1px solid rgba(245,158,11,0.25)' 
                      }}
                    >
                      {userId}
                      <button 
                        type="button" 
                        onClick={() => removeInvitedUser(userId)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="ui-text-xs ui-text-muted">No users manually invited. Use this for private/exclusive workshops.</p>
              )}
            </div>

            <Alert variant="info">
              <strong>🔐 How filtering works:</strong> If you use multiple filters, users need to match at least one criterion. 
              Invited users always have access regardless of other filters.
            </Alert>
          </div>
        </div>

        {/* Tags */}
        <div className="ui-card" style={{ marginBottom: 20 }}>
          <div className="ui-card__header"><h3 className="ui-card__title">Tags</h3></div>
          <div className="ui-card__body">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="ui-input" style={{ flex: 1 }} value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add a tag…" />
              <Button variant="outline" type="button" onClick={addTag}>Add</Button>
            </div>
            <div className="ui-flex ui-flex-wrap ui-flex-gap-2">
              {form.tags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: '0.78rem', background: 'rgba(107,163,255,0.12)', color: 'var(--accent)', border: '1px solid rgba(107,163,255,0.25)' }}>
                  {t}
                  <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Learning Outcomes & Prerequisites */}
        <div className="ui-grid-2" style={{ marginBottom: 20 }}>
          {[
            { title: 'Learning Outcomes', items: form.learningOutcomes, input: outcomeInput, setInput: setOutcome, add: addOutcome, key: 'learningOutcomes' as const, placeholder: 'e.g. Build REST APIs' },
            { title: 'Prerequisites',     items: form.prerequisites,    input: prereqInput,  setInput: setPrereq,  add: addPrereq,  key: 'prerequisites'    as const, placeholder: 'e.g. Basic Python' },
          ].map(section => (
            <div key={section.title} className="ui-card">
              <div className="ui-card__header"><h3 className="ui-card__title">{section.title}</h3></div>
              <div className="ui-card__body">
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input className="ui-input" style={{ flex: 1 }} value={section.input} onChange={e => section.setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); section.add(); } }}
                    placeholder={section.placeholder} />
                  <Button variant="outline" type="button" size="sm" onClick={section.add}>Add</Button>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {section.items.map((item, i) => (
                    <li key={i} style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{item}</span>
                      <button type="button" onClick={() => setForm(f => ({ ...f, [section.key]: (f[section.key] as string[]).filter((_, j) => j !== i) }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 4px' }}>×</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Speakers */}
        <div className="ui-card" style={{ marginBottom: 20 }}>
          <div className="ui-card__header"><h3 className="ui-card__title">Speakers & Instructors</h3></div>
          <div className="ui-card__body">
            <div className="ui-grid-2" style={{ marginBottom: 12 }}>
              {(['name','designation','organization','bio'] as const).map(f => (
                <div key={f} className="ui-input-wrap">
                  <label className="ui-input-label" style={{ textTransform: 'capitalize' }}>{f}</label>
                  <input className="ui-input" value={newSpeaker[f]} onChange={e => setNewSpeaker(s => ({ ...s, [f]: e.target.value }))} />
                </div>
              ))}
            </div>
            <Button variant="outline" type="button" leftIcon={Plus} onClick={addSpeaker}>Add Speaker</Button>
            {speakers.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {speakers.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{s.name}</p>
                      <p className="ui-text-xs ui-text-muted">{s.designation} {s.organization && `· ${s.organization}`}</p>
                    </div>
                    <button type="button" onClick={() => setSpeakers(sp => sp.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="outline" type="button" href={`/dashboard/workshops/${id}`}>Cancel</Button>
          <Button type="submit" leftIcon={Save} isLoading={updateMut.isPending}>Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
