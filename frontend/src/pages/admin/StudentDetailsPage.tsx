import { FormEvent, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, GraduationCap, CalendarDays, IdCard, Pencil,
  BookOpen, Percent, Vote, ShieldCheck, Award, Droplet, Cake,
  TrendingUp, CheckCircle2, XCircle, Layers, Trash2, Plus, Edit,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { EditUserModal, DeactivateUserDialog, ChangeUserTypeModal, DeleteUserDialog } from './components';
import toast from 'react-hot-toast';

type PopulatedUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  technicalSkills?: string[];
};

type EcExperience = {
  _id?: string;
  postName: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  performanceRating?: string;
  eventsOrganized?: number;
  meetingsAttended?: number;
  totalMeetings?: number;
};

type StudentDetail = {
  _id: string;
  studentId: string;
  batch: number;
  currentYear: number;
  academicYearLevel: string;
  session?: string;
  userId?: PopulatedUser;
  membershipStatus?: { status?: string; joinDate?: string };
  academicRecord?: {
    currentCgpa?: number;
    totalCreditsCompleted?: number;
    totalCreditsRequired?: number;
  };
  attendanceRecord?: {
    overallAttendancePercentage?: number;
    lastUpdated?: string;
  };
  electionEligibility?: {
    isEligibleForVoting?: boolean;
    isEligibleForCandidacy?: boolean;
  };
  ecExperience?: EcExperience[];
};

const clean = (v?: string | null) => (v ? v.replace(/_/g, ' ') : '');
const fullName = (u?: PopulatedUser) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Unknown Student';

function fmtDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="ui-flex ui-flex-gap-3" style={{ alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--muted)', marginTop: 2, display: 'flex' }}><Icon size={16} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="ui-text-xs ui-text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{label}</div>
        <div className="ui-font-medium" style={{ marginTop: 2, wordBreak: 'break-word' }}>{value ?? '—'}</div>
      </div>
    </div>
  );
}

type EditForm = {
  currentYear: string;
  academicYearLevel: string;
  currentCgpa: string;
  totalCreditsCompleted: string;
  totalCreditsRequired: string;
  overallAttendancePercentage: string;
};

export function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    currentYear: '',
    academicYearLevel: '',
    currentCgpa: '',
    totalCreditsCompleted: '',
    totalCreditsRequired: '',
    overallAttendancePercentage: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = Boolean(user?.roles.some((r) => ['System Admin', 'Moderator'].includes(r)));
  const isSystemAdmin = Boolean(user?.roles.some((r) => r === 'System Admin'));

  const [showEditUser, setShowEditUser] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showChangeType, setShowChangeType] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showEcExperienceModal, setShowEcExperienceModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState<any>(null);
  const [ecExpForm, setEcExpForm] = useState({
    postName: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    performanceRating: 'Not_Rated',
    eventsOrganized: '0',
    meetingsAttended: '0',
    totalMeetings: '0',
  });

  const { data: student, isLoading, isError, error } = useQuery({
    queryKey: ['admin-student', id, token],
    queryFn: () => apiRequest<StudentDetail>(`/admin/students/${id}`, { token }),
    enabled: Boolean(token && id),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/students/${id}/academics`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          currentYear: Number(form.currentYear),
          academicYearLevel: form.academicYearLevel,
          academicRecord: {
            currentCgpa: Number(form.currentCgpa),
            totalCreditsCompleted: Number(form.totalCreditsCompleted),
            totalCreditsRequired: Number(form.totalCreditsRequired),
          },
          attendanceRecord: {
            overallAttendancePercentage: Number(form.overallAttendancePercentage),
          },
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-student', id, token] });
      await queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      setEditing(false);
      toast.success('Academic record updated');
    },
    onError: (e) => setFormError(normalizeApiError(e)),
  });

  // EC Experience mutations
  const addEcExpMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/students/${id}/ec-experience`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          postName: ecExpForm.postName,
          startDate: ecExpForm.startDate || undefined,
          endDate: ecExpForm.endDate || undefined,
          isCurrent: ecExpForm.isCurrent,
          performanceRating: ecExpForm.performanceRating,
          eventsOrganized: Number(ecExpForm.eventsOrganized),
          meetingsAttended: Number(ecExpForm.meetingsAttended),
          totalMeetings: Number(ecExpForm.totalMeetings),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-student', id, token] });
      setShowEcExperienceModal(false);
      setEditingExperience(null);
      toast.success('EC experience added successfully');
    },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const updateEcExpMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/students/${id}/ec-experience/${editingExperience._id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          postName: ecExpForm.postName,
          startDate: ecExpForm.startDate || undefined,
          endDate: ecExpForm.endDate || undefined,
          isCurrent: ecExpForm.isCurrent,
          performanceRating: ecExpForm.performanceRating,
          eventsOrganized: Number(ecExpForm.eventsOrganized),
          meetingsAttended: Number(ecExpForm.meetingsAttended),
          totalMeetings: Number(ecExpForm.totalMeetings),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-student', id, token] });
      setShowEcExperienceModal(false);
      setEditingExperience(null);
      toast.success('EC experience updated successfully');
    },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const deleteEcExpMutation = useMutation({
    mutationFn: (experienceId: string) =>
      apiRequest(`/admin/students/${id}/ec-experience/${experienceId}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-student', id, token] });
      toast.success('EC experience deleted successfully');
    },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  function openAddEcExperience() {
    setEditingExperience(null);
    setEcExpForm({
      postName: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      performanceRating: 'Not_Rated',
      eventsOrganized: '0',
      meetingsAttended: '0',
      totalMeetings: '0',
    });
    setShowEcExperienceModal(true);
  }

  function openEditEcExperience(exp: any) {
    setEditingExperience(exp);
    setEcExpForm({
      postName: exp.postName || '',
      startDate: exp.startDate ? exp.startDate.split('T')[0] : '',
      endDate: exp.endDate ? exp.endDate.split('T')[0] : '',
      isCurrent: exp.isCurrent || false,
      performanceRating: exp.performanceRating || 'Not_Rated',
      eventsOrganized: String(exp.eventsOrganized || 0),
      meetingsAttended: String(exp.meetingsAttended || 0),
      totalMeetings: String(exp.totalMeetings || 0),
    });
    setShowEcExperienceModal(true);
  }

  function submitEcExperience(e: FormEvent) {
    e.preventDefault();
    if (!ecExpForm.postName.trim()) {
      toast.error('Post name is required');
      return;
    }
    if (editingExperience) {
      updateEcExpMutation.mutate();
    } else {
      addEcExpMutation.mutate();
    }
  }

  function openEdit() {
    if (!student) return;
    setFormError(null);
    setForm({
      currentYear: student.currentYear != null ? String(student.currentYear) : '',
      academicYearLevel: student.academicYearLevel || '',
      currentCgpa: student.academicRecord?.currentCgpa != null ? String(student.academicRecord.currentCgpa) : '',
      totalCreditsCompleted: student.academicRecord?.totalCreditsCompleted != null ? String(student.academicRecord.totalCreditsCompleted) : '',
      totalCreditsRequired: student.academicRecord?.totalCreditsRequired != null ? String(student.academicRecord.totalCreditsRequired) : '160',
      overallAttendancePercentage: student.attendanceRecord?.overallAttendancePercentage != null ? String(student.attendanceRecord.overallAttendancePercentage) : '',
    });
    setEditing(true);
  }

  function submitEdit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const currentYear = Number(form.currentYear);
    const cgpa = Number(form.currentCgpa);
    const attendance = Number(form.overallAttendancePercentage);
    const done = Number(form.totalCreditsCompleted);
    const required = Number(form.totalCreditsRequired);

    if (form.currentYear === '' || Number.isNaN(currentYear) || currentYear < 1 || currentYear > 5) {
      setFormError('Current year must be a number between 1 and 5.');
      return;
    }
    if (!form.academicYearLevel) {
      setFormError('Academic year level is required.');
      return;
    }
    if (form.currentCgpa === '' || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 4) {
      setFormError('CGPA must be a number between 0.00 and 4.00.');
      return;
    }
    if (form.overallAttendancePercentage === '' || Number.isNaN(attendance) || attendance < 0 || attendance > 100) {
      setFormError('Attendance must be a number between 0 and 100.');
      return;
    }
    if (Number.isNaN(done) || done < 0) {
      setFormError('Credits completed must be a non-negative number.');
      return;
    }
    if (Number.isNaN(required) || required <= 0) {
      setFormError('Credits required must be greater than zero.');
      return;
    }
    if (done > required) {
      setFormError('Credits completed cannot exceed credits required.');
      return;
    }
    updateMutation.mutate();
  }

  const creditPct = useMemo(() => {
    const done = student?.academicRecord?.totalCreditsCompleted ?? 0;
    const required = student?.academicRecord?.totalCreditsRequired || 160;
    return Math.min(100, Math.round((done / required) * 100));
  }, [student]);

  if (isLoading) {
    return (
      <div className="ui-page">
        <div className="ui-flex-center" style={{ padding: 80 }}>
          <Spinner size="lg" label="Loading student…" />
        </div>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="ui-page">
        <PageHeader title="Student" backButton breadcrumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Students' }]} />
        <div className="ui-card">
          <div className="ui-card__body">
            <EmptyState
              icon={User}
              title="Student not found"
              description={isError ? normalizeApiError(error) : 'This student record does not exist or was removed.'}
              action={<Button variant="primary" href="/dashboard/admin">Back to Admin</Button>}
            />
          </div>
        </div>
      </div>
    );
  }

  const u = student.userId;
  const name = fullName(u);
  const status = student.membershipStatus?.status || 'Unknown';
  const cgpa = student.academicRecord?.currentCgpa;
  const attendance = student.attendanceRecord?.overallAttendancePercentage;

  return (
    <div className="ui-page">
      <PageHeader
        title={name}
        description={`Student ID ${student.studentId} · Batch ${student.batch}`}
        backButton
        breadcrumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Students' }, { label: name }]}
        actions={
          canEdit ? (
            <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
              <Button variant="primary" leftIcon={Pencil} onClick={openEdit}>Edit Academics</Button>
              <Button variant="secondary" leftIcon={User} onClick={() => setShowEditUser(true)}>Edit Personal Info</Button>
              <Button variant="outline" leftIcon={Layers} onClick={() => setShowChangeType(true)}>Change Type</Button>
              <Button variant="danger" leftIcon={XCircle} onClick={() => setShowDeactivate(true)}>Deactivate</Button>
              <Button variant="danger" leftIcon={Trash2} onClick={() => setShowDelete(true)}>Delete Permanently</Button>
            </div>
          ) : undefined
        }
      />

      {/* Profile banner */}
      <div className="ui-card">
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-4 ui-flex-wrap" style={{ alignItems: 'center' }}>
            {u?.avatarUrl ? (
              <img src={u.avatarUrl} alt={name} className="ui-avatar" style={{ width: 76, height: 76 }} />
            ) : (
              <div className="ui-avatar ui-avatar--fallback" style={{ width: 76, height: 76, fontSize: '1.8rem' }}>
                {name.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="ui-flex ui-flex-gap-2 ui-flex-wrap" style={{ alignItems: 'center', marginBottom: 6 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{name}</h2>
                <Badge variant={status === 'Active' ? 'success' : status === 'Graduated' ? 'info' : 'warning'}>{status}</Badge>
              </div>
              <div className="ui-flex ui-flex-gap-3 ui-flex-wrap ui-text-sm ui-text-muted">
                <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Mail size={14} /> {u?.email || '—'}</span>
                <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Phone size={14} /> {u?.phone || '—'}</span>
                <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><GraduationCap size={14} /> {clean(student.academicYearLevel) || '—'}</span>
              </div>
            </div>
          </div>
          {u?.bio && <p className="ui-text-sm ui-text-muted ui-mt-3" style={{ margin: '12px 0 0', lineHeight: 1.6 }}>{u.bio}</p>}
        </div>
      </div>

      {/* Key metrics */}
      <div className="ui-grid-4">
        <StatsCard title="CGPA" value={typeof cgpa === 'number' ? cgpa.toFixed(2) : '—'} icon={BookOpen} color="primary" />
        <StatsCard title="Attendance" value={typeof attendance === 'number' ? `${attendance}%` : '—'} icon={Percent} color="success" />
        <StatsCard title="Credits Done" value={student.academicRecord?.totalCreditsCompleted ?? 0} icon={Layers} color="info" />
        <StatsCard title="Current Year" value={clean(student.academicYearLevel) || student.currentYear} icon={TrendingUp} color="warning" />
      </div>

      <div className="ui-grid-2" style={{ alignItems: 'start' }}>
        {/* Personal & academic info */}
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><IdCard size={17} /> Profile Information</h3>
          </div>
          <div className="ui-card__body" style={{ paddingTop: 6 }}>
            <InfoRow icon={User} label="Full Name" value={name} />
            <InfoRow icon={IdCard} label="Student ID" value={student.studentId} />
            <InfoRow icon={GraduationCap} label="Batch / Session" value={`${student.batch}${student.session ? ` · ${student.session}` : ''}`} />
            <InfoRow icon={CalendarDays} label="Joined" value={fmtDate(student.membershipStatus?.joinDate)} />
            <InfoRow icon={Cake} label="Date of Birth" value={fmtDate(u?.dateOfBirth)} />
            <InfoRow icon={Droplet} label="Blood Group" value={u?.bloodGroup || '—'} />
            <div style={{ padding: '10px 0 0' }}>
              <div className="ui-text-xs ui-text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 8 }}>Technical Skills</div>
              {u?.technicalSkills && u.technicalSkills.length > 0 ? (
                <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
                  {u.technicalSkills.map((s, i) => <Badge key={i} variant="neutral">{s}</Badge>)}
                </div>
              ) : <span className="ui-text-sm ui-text-muted">None listed</span>}
            </div>
          </div>
        </div>

        {/* Academic progress + eligibility */}
        <div className="ui-flex-col" style={{ gap: 24 }}>
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Layers size={17} /> Credit Progress</h3>
            </div>
            <div className="ui-card__body">
              <div className="ui-flex ui-flex-between ui-text-sm" style={{ marginBottom: 8 }}>
                <span className="ui-text-muted">
                  {student.academicRecord?.totalCreditsCompleted ?? 0} / {student.academicRecord?.totalCreditsRequired || 160} credits
                </span>
                <span className="ui-font-medium">{creditPct}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'var(--surface-soft)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', width: `${creditPct}%`, background: 'var(--gradient-primary)', borderRadius: 999, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>

          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><ShieldCheck size={17} /> Election Eligibility</h3>
            </div>
            <div className="ui-card__body ui-flex-col" style={{ gap: 12 }}>
              <EligibilityRow ok={student.electionEligibility?.isEligibleForVoting} icon={Vote} label="Eligible for Voting" />
              <EligibilityRow ok={student.electionEligibility?.isEligibleForCandidacy} icon={Award} label="Eligible for Candidacy" />
              <p className="ui-text-xs ui-text-muted" style={{ margin: 0 }}>Candidacy requires CGPA ≥ 3.0 and attendance ≥ 75%.</p>
            </div>
          </div>
        </div>
      </div>

      {/* EC experience */}
      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Award size={17} /> EC Experience</h3>
          {canEdit && (
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={openAddEcExperience}>
              Add Experience
            </Button>
          )}
        </div>
        <div className="ui-card__body ui-card__body--flush">
          {student.ecExperience && student.ecExperience.length > 0 ? (
            <div className="ui-table--scroll">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Rating</th>
                    <th>Status</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {student.ecExperience.map((exp, i) => (
                    <tr key={i}>
                      <td className="ui-font-medium">{exp.postName}</td>
                      <td>{fmtDate(exp.startDate)}</td>
                      <td>{exp.isCurrent ? 'Present' : fmtDate(exp.endDate)}</td>
                      <td>{clean(exp.performanceRating) || '—'}</td>
                      <td><Badge variant={exp.isCurrent ? 'success' : 'neutral'}>{exp.isCurrent ? 'Current' : 'Past'}</Badge></td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => openEditEcExperience(exp)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (exp._id && confirm(`Delete EC experience: ${exp.postName}?`)) {
                                  deleteEcExpMutation.mutate(exp._id);
                                }
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #ef4444',
                                background: 'var(--surface)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                color: '#ef4444',
                              }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Award} title="No EC experience" description="This student has no executive committee history yet." size="sm" />
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="Edit Academic Record"
        description={`Update year, CGPA, credits and attendance for ${name}.`}
        size="md"
        footer={
          <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={updateMutation.isPending}>Cancel</Button>
            <Button variant="primary" leftIcon={CheckCircle2} onClick={submitEdit} isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        }
      >
        <form onSubmit={submitEdit} className="ui-flex-col" style={{ gap: 16 }}>
          {formError && <Alert variant="error" onClose={() => setFormError(null)}>{formError}</Alert>}

          <div className="ui-grid-2" style={{ gap: 16 }}>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Current Year (1-5)</span>
              <input
                className="ui-input"
                type="number" step="1" min="1" max="5"
                value={form.currentYear}
                onChange={(e) => setForm({ ...form, currentYear: e.target.value })}
                placeholder="e.g. 3"
              />
            </label>

            <label className="ui-input-wrap">
              <span className="ui-input-label">Academic Year Level</span>
              <select
                className="ui-input"
                value={form.academicYearLevel}
                onChange={(e) => setForm({ ...form, academicYearLevel: e.target.value })}
              >
                <option value="">Select level</option>
                <option value="First_Year">First Year</option>
                <option value="Second_Year">Second Year</option>
                <option value="Third_Year">Third Year</option>
                <option value="Fourth_Year">Fourth Year</option>
                <option value="Fifth_Year">Fifth Year</option>
                <option value="Graduated">Graduated</option>
              </select>
            </label>
          </div>

          <label className="ui-input-wrap">
            <span className="ui-input-label">Current CGPA (0.00 – 4.00)</span>
            <input
              className="ui-input"
              type="number" step="0.01" min="0" max="4"
              value={form.currentCgpa}
              onChange={(e) => setForm({ ...form, currentCgpa: e.target.value })}
              placeholder="e.g. 3.75"
            />
          </label>

          <label className="ui-input-wrap">
            <span className="ui-input-label">Overall Attendance (%)</span>
            <input
              className="ui-input"
              type="number" step="0.1" min="0" max="100"
              value={form.overallAttendancePercentage}
              onChange={(e) => setForm({ ...form, overallAttendancePercentage: e.target.value })}
              placeholder="e.g. 82"
            />
          </label>

          <div className="ui-grid-2" style={{ gap: 16 }}>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Credits Completed</span>
              <input
                className="ui-input"
                type="number" step="1" min="0"
                value={form.totalCreditsCompleted}
                onChange={(e) => setForm({ ...form, totalCreditsCompleted: e.target.value })}
                placeholder="e.g. 90"
              />
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Credits Required</span>
              <input
                className="ui-input"
                type="number" step="1" min="1"
                value={form.totalCreditsRequired}
                onChange={(e) => setForm({ ...form, totalCreditsRequired: e.target.value })}
                placeholder="160"
              />
            </label>
          </div>
        </form>
      </Modal>

      {/* Admin action modals */}
      {u && (
        <>
          <EditUserModal
            isOpen={showEditUser}
            onClose={() => setShowEditUser(false)}
            user={{
              _id: u._id!,
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              email: u.email || '',
              phone: u.phone || '',
              dateOfBirth: u.dateOfBirth || '',
              gender: u.gender || '',
              bloodGroup: u.bloodGroup || '',
              bio: u.bio || '',
            }}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-student', id, token] })}
          />
          <DeactivateUserDialog
            isOpen={showDeactivate}
            onClose={() => setShowDeactivate(false)}
            userId={u._id!}
            userName={name}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-student', id, token] })}
          />
          <ChangeUserTypeModal
            isOpen={showChangeType}
            onClose={() => setShowChangeType(false)}
            userId={u._id!}
            userName={name}
            currentType="Student"
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-student', id, token] })}
          />
          <DeleteUserDialog
            isOpen={showDelete}
            onClose={() => setShowDelete(false)}
            userId={u._id!}
            userName={name}
            userEmail={u.email!}
            onSuccess={() => navigate('/dashboard/admin')}
          />
        </>
      )}

      {/* EC Experience Modal */}
      <Modal
        isOpen={showEcExperienceModal}
        onClose={() => {
          setShowEcExperienceModal(false);
          setEditingExperience(null);
        }}
        title={editingExperience ? 'Edit EC Experience' : 'Add EC Experience'}
        description={`${editingExperience ? 'Update' : 'Add'} executive committee experience for ${name}`}
        size="md"
        footer={
          <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowEcExperienceModal(false);
                setEditingExperience(null);
              }}
              disabled={addEcExpMutation.isPending || updateEcExpMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={CheckCircle2}
              onClick={submitEcExperience}
              isLoading={addEcExpMutation.isPending || updateEcExpMutation.isPending}
            >
              {editingExperience ? 'Update' : 'Add'} Experience
            </Button>
          </div>
        }
      >
        <form onSubmit={submitEcExperience} className="ui-flex-col" style={{ gap: 16 }}>
          <label className="ui-input-wrap">
            <span className="ui-input-label">Post Name *</span>
            <input
              className="ui-input"
              type="text"
              value={ecExpForm.postName}
              onChange={(e) => setEcExpForm({ ...ecExpForm, postName: e.target.value })}
              placeholder="e.g. President, Vice President"
              required
            />
          </label>

          <div className="ui-grid-2" style={{ gap: 16 }}>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Start Date</span>
              <input
                className="ui-input"
                type="date"
                value={ecExpForm.startDate}
                onChange={(e) => setEcExpForm({ ...ecExpForm, startDate: e.target.value })}
              />
            </label>

            <label className="ui-input-wrap">
              <span className="ui-input-label">End Date</span>
              <input
                className="ui-input"
                type="date"
                value={ecExpForm.endDate}
                onChange={(e) => setEcExpForm({ ...ecExpForm, endDate: e.target.value })}
                disabled={ecExpForm.isCurrent}
              />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ecExpForm.isCurrent}
              onChange={(e) => setEcExpForm({ ...ecExpForm, isCurrent: e.target.checked, endDate: e.target.checked ? '' : ecExpForm.endDate })}
            />
            <span style={{ fontSize: '0.9rem' }}>Currently serving in this position</span>
          </label>

          <label className="ui-input-wrap">
            <span className="ui-input-label">Performance Rating</span>
            <select
              className="ui-input"
              value={ecExpForm.performanceRating}
              onChange={(e) => setEcExpForm({ ...ecExpForm, performanceRating: e.target.value })}
            >
              <option value="Not_Rated">Not Rated</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Satisfactory">Satisfactory</option>
              <option value="Needs_Improvement">Needs Improvement</option>
            </select>
          </label>

          <div className="ui-grid-3" style={{ gap: 16 }}>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Events Organized</span>
              <input
                className="ui-input"
                type="number"
                min="0"
                value={ecExpForm.eventsOrganized}
                onChange={(e) => setEcExpForm({ ...ecExpForm, eventsOrganized: e.target.value })}
                placeholder="0"
              />
            </label>

            <label className="ui-input-wrap">
              <span className="ui-input-label">Meetings Attended</span>
              <input
                className="ui-input"
                type="number"
                min="0"
                value={ecExpForm.meetingsAttended}
                onChange={(e) => setEcExpForm({ ...ecExpForm, meetingsAttended: e.target.value })}
                placeholder="0"
              />
            </label>

            <label className="ui-input-wrap">
              <span className="ui-input-label">Total Meetings</span>
              <input
                className="ui-input"
                type="number"
                min="0"
                value={ecExpForm.totalMeetings}
                onChange={(e) => setEcExpForm({ ...ecExpForm, totalMeetings: e.target.value })}
                placeholder="0"
              />
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function EligibilityRow({ ok, icon: Icon, label }: { ok?: boolean; icon: any; label: string }) {
  return (
    <div className="ui-flex ui-flex-between" style={{ alignItems: 'center' }}>
      <span className="ui-flex ui-flex-gap-2 ui-font-medium" style={{ alignItems: 'center' }}>
        <Icon size={16} style={{ color: 'var(--muted)' }} /> {label}
      </span>
      {ok ? (
        <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', color: '#10b981', fontWeight: 600 }}>
          <CheckCircle2 size={16} /> Eligible
        </span>
      ) : (
        <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', color: '#ef4444', fontWeight: 600 }}>
          <XCircle size={16} /> Not eligible
        </span>
      )}
    </div>
  );
}
