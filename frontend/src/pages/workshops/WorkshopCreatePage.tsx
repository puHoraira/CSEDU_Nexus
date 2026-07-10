import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, X, BookOpen } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import toast from 'react-hot-toast';

const CATEGORIES = ['Technical', 'Soft Skills', 'Research', 'Career', 'Creative', 'Other'];
const LEVELS     = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

export function WorkshopCreatePage() {
  const { token } = useAuth();
  const navigate  = useNavigate();

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
    roomAssignment: {
      enabled: false,
      rooms: [] as { roomId: string; priority: number }[],
      autoAssignSeats: true,
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
  const [invitedUsersMap, setInvitedUsersMap] = useState<Map<string, { fullName: string; email: string }>>(new Map());
  const [speakers, setSpeakers]     = useState<Array<{ name: string; designation: string; organization: string; bio: string }>>([]);
  const [newSpeaker, setNewSpeaker] = useState({ name: '', designation: '', organization: '', bio: '' });
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Fetch available rooms
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiRequest('/rooms', { method: 'GET', token }),
  });

  const createMut = useMutation({
    mutationFn: () => {
      const payload = { 
        ...form, 
        speakers,
        targetAudience: form.targetAudience,
        roomAssignment: form.roomAssignment.enabled ? form.roomAssignment : undefined,
      };
      return apiRequest('/workshops', { method: 'POST', token, body: JSON.stringify(payload) });
    },
    onSuccess: (data: any) => {
      toast.success('Workshop created!');
      navigate(`/dashboard/workshops/${data._id}`);
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
      const users = await apiRequest<Array<{ _id: string; fullName: string; email: string }>>(`/auth/users/search?search=${query}`, { token });
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
    
    // Find the selected user from search results
    const selectedUser = userSearchResults.find(u => u._id === userId);
    if (selectedUser) {
      // Store user info in map
      setInvitedUsersMap(prev => new Map(prev).set(userId, { 
        fullName: selectedUser.fullName, 
        email: selectedUser.email 
      }));
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

  const addRoomToAssignment = () => {
    if (!selectedRoomId) {
      toast.error("Please select a room.");
      return;
    }

    if (form.roomAssignment.rooms.some(r => r.roomId === selectedRoomId)) {
      toast.error("Room already added.");
      return;
    }

    setForm(f => ({
      ...f,
      roomAssignment: {
        ...f.roomAssignment,
        rooms: [
          ...f.roomAssignment.rooms,
          { roomId: selectedRoomId, priority: f.roomAssignment.rooms.length + 1 },
        ],
      },
    }));
    setSelectedRoomId("");
  };

  const removeRoomFromAssignment = (roomId: string) => {
    setForm(f => ({
      ...f,
      roomAssignment: {
        ...f.roomAssignment,
        rooms: f.roomAssignment.rooms
          .filter(r => r.roomId !== roomId)
          .map((r, idx) => ({ ...r, priority: idx + 1 })),
      },
    }));
  };

  const updateRoomPriority = (roomId: string, direction: 'up' | 'down') => {
    setForm(f => {
      const rooms = [...f.roomAssignment.rooms];
      const index = rooms.findIndex(r => r.roomId === roomId);
      
      if (index === -1) return f;
      if (direction === 'up' && index === 0) return f;
      if (direction === 'down' && index === rooms.length - 1) return f;

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [rooms[index], rooms[swapIndex]] = [rooms[swapIndex], rooms[index]];
      
      rooms.forEach((r, idx) => { r.priority = idx + 1; });

      return {
        ...f,
        roomAssignment: {
          ...f.roomAssignment,
          rooms,
        },
      };
    });
  };

  const rooms = roomsData || [];
  const totalRoomCapacity = form.roomAssignment.rooms.reduce((sum, assignment) => {
    const room = rooms.find((r: any) => r._id === assignment.roomId);
    return sum + (room?.totalCapacity || 0);
  }, 0);

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div className="ui-input-wrap">
      <label className="ui-input-label">{label}</label>
      <input type={type} className="ui-input" placeholder={placeholder}
        value={(form as any)[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))} />
    </div>
  );

  return (
    <div className="ui-page">
      <PageHeader title="Create Workshop" description="Set up a new workshop for club members" backButton
        breadcrumbs={[{ label: 'Workshops', href: '/dashboard/workshops' }, { label: 'Create' }]} />

      <form onSubmit={e => { e.preventDefault(); createMut.mutate(); }}>
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
                  {form.targetAudience.invitedUsers.map(userId => {
                    const userInfo = invitedUsersMap.get(userId);
                    return (
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
                        {userInfo?.fullName || userId}
                        <button 
                          type="button" 
                          onClick={() => removeInvitedUser(userId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
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

        {/* Room Assignment */}
        <div className="ui-card" style={{ marginBottom: 20 }}>
          <div className="ui-card__header">
            <h3 className="ui-card__title">Room Assignment</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input 
                type="checkbox" 
                checked={form.roomAssignment.enabled}
                onChange={(e) => setForm(f => ({ ...f, roomAssignment: { ...f.roomAssignment, enabled: e.target.checked } }))}
              />
              Enable room assignment
            </label>
          </div>
          {form.roomAssignment.enabled && (
            <div className="ui-card__body">
              <p className="ui-text-sm ui-text-muted" style={{ marginBottom: 16 }}>
                Assign rooms to this workshop. Participants will be automatically assigned seats based on room priority.
              </p>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16, fontSize: '0.88rem' }}>
                <input 
                  type="checkbox" 
                  checked={form.roomAssignment.autoAssignSeats}
                  onChange={(e) => setForm(f => ({ ...f, roomAssignment: { ...f.roomAssignment, autoAssignSeats: e.target.checked } }))}
                />
                Auto-assign seats on registration
              </label>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <select 
                  className="ui-select"
                  style={{ flex: 1 }}
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="">Select a room...</option>
                  {rooms.map((room: any) => (
                    <option key={room._id} value={room._id}>
                      {room.roomNumber} - {room.roomName} (Capacity: {room.capacity}, Mode: {room.seatManagementMode})
                    </option>
                  ))}
                </select>
                <Button variant="outline" type="button" onClick={addRoomToAssignment}>Add Room</Button>
              </div>

              {form.roomAssignment.rooms.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {form.roomAssignment.rooms.map((assignment, index) => {
                    const room = rooms.find((r: any) => r._id === assignment.roomId);
                    if (!room) return null;

                    return (
                      <div 
                        key={assignment.roomId}
                        style={{ 
                          padding: '12px 16px', 
                          borderRadius: 12, 
                          border: '1px solid var(--border)', 
                          background: 'var(--surface)' 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>
                              {room.roomNumber} - {room.roomName}
                            </p>
                            <p className="ui-text-xs ui-text-muted" style={{ margin: '4px 0 0' }}>
                              Capacity: {room.capacity} | Mode: {room.seatManagementMode} | Priority: {assignment.priority}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button 
                              type="button"
                              onClick={() => updateRoomPriority(assignment.roomId, 'up')}
                              disabled={index === 0}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                background: 'var(--surface)',
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                opacity: index === 0 ? 0.5 : 1,
                              }}
                            >
                              ↑
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateRoomPriority(assignment.roomId, 'down')}
                              disabled={index === form.roomAssignment.rooms.length - 1}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                background: 'var(--surface)',
                                cursor: index === form.roomAssignment.rooms.length - 1 ? 'not-allowed' : 'pointer',
                                opacity: index === form.roomAssignment.rooms.length - 1 ? 0.5 : 1,
                              }}
                            >
                              ↓
                            </button>
                            <button 
                              type="button"
                              onClick={() => removeRoomFromAssignment(assignment.roomId)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                border: '1px solid #ef4444',
                                borderRadius: 6,
                                background: 'var(--surface)',
                                color: '#ef4444',
                                cursor: 'pointer',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {room.features && Object.keys(room.features).some((k: string) => (room.features as any)[k]) && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            {room.features.projector && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(107,163,255,0.1)', color: 'var(--accent)' }}>🎥 Projector</span>}
                            {room.features.whiteboard && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(107,163,255,0.1)', color: 'var(--accent)' }}>📝 Whiteboard</span>}
                            {room.features.AC && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(107,163,255,0.1)', color: 'var(--accent)' }}>❄️ AC</span>}
                            {room.features.WiFi && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(107,163,255,0.1)', color: 'var(--accent)' }}>📶 WiFi</span>}
                            {room.features.desktops && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(107,163,255,0.1)', color: 'var(--accent)' }}>💻 Desktops</span>}
                            {room.features.soundSystem && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(107,163,255,0.1)', color: 'var(--accent)' }}>🔊 Sound</span>}
                            {room.features.accessibility && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(107,163,255,0.1)', color: 'var(--accent)' }}>♿ Accessible</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <Alert variant="info" style={{ marginTop: 8 }}>
                    <strong>Total Capacity:</strong> {totalRoomCapacity} seats across {form.roomAssignment.rooms.length} room(s)
                  </Alert>
                </div>
              ) : (
                <p className="ui-text-sm ui-text-muted" style={{ textAlign: 'center', padding: '20px 0' }}>
                  No rooms assigned yet. Add rooms to enable seat allocation.
                </p>
              )}
            </div>
          )}
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
          <Button variant="outline" type="button" href="/dashboard/workshops">Cancel</Button>
          <Button type="submit" leftIcon={BookOpen} isLoading={createMut.isPending}>Create Workshop</Button>
        </div>
      </form>
    </div>
  );
}
