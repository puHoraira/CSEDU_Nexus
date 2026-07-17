import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, Briefcase, CalendarDays, IdCard, Pencil,
  BookOpen, GraduationCap, Globe, Award, FlaskConical,
  CheckCircle2, Building2, Clock,
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
  socialMedia?: { linkedin?: string; github?: string; website?: string };
};

type Qualification = {
  degree?: string;
  institution?: string;
  country?: string;
  completionYear?: number;
  fieldOfStudy?: string;
};

type ClubRole = {
  role?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
};

type TeacherDetail = {
  _id: string;
  userId?: PopulatedUser;
  employeeId?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  employmentType?: string;
  isActive?: boolean;
  qualifications?: Qualification[];
  researchInterests?: string[];
  researchArea?: string;
  clubRoles?: ClubRole[];
  totalPublications?: number;
  totalCoursesTaught?: number;
};

const fullName = (u?: PopulatedUser) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Unknown Teacher';

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

type EditTeacherForm = {
  designation: string;
  department: string;
  employmentType: string;
  researchArea: string;
  researchInterests: string;
};

export function TeacherDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [editTeacher, setEditTeacher] = useState(false);
  const [editUser, setEditUser] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showChangeType, setShowChangeType] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState<EditTeacherForm>({ designation: '', department: '', employmentType: '', researchArea: '', researchInterests: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = Boolean(user?.roles.some((r) => ['System Admin', 'Moderator'].includes(r)));
  const isSysAdmin = Boolean(user?.roles.includes('System Admin'));

  const { data: teacher, isLoading, isError, error } = useQuery({
    queryKey: ['admin-teacher', id, token],
    queryFn: () => apiRequest<TeacherDetail>(`/admin/teachers/${id}`, { token }),
    enabled: Boolean(token && id),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/teachers/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          designation: form.designation,
          department: form.department,
          employmentType: form.employmentType,
          researchArea: form.researchArea,
          researchInterests: form.researchInterests.split(',').map(s => s.trim()).filter(Boolean),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-teacher', id, token] });
      setEditTeacher(false);
      toast.success('Teacher record updated');
    },
    onError: (e) => setFormError(normalizeApiError(e)),
  });

  function openEditTeacher() {
    if (!teacher) return;
    setFormError(null);
    setForm({
      designation: teacher.designation || '',
      department: teacher.department || '',
      employmentType: teacher.employmentType || '',
      researchArea: teacher.researchArea || '',
      researchInterests: (teacher.researchInterests || []).join(', '),
    });
    setEditTeacher(true);
  }

  if (isLoading) {
    return (
      <div className="ui-page">
        <div className="ui-flex-center" style={{ padding: 80 }}>
          <Spinner size="lg" label="Loading teacher…" />
        </div>
      </div>
    );
  }

  if (isError || !teacher) {
    return (
      <div className="ui-page">
        <PageHeader title="Teacher" backButton breadcrumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Teachers' }]} />
        <div className="ui-card">
          <div className="ui-card__body">
            <EmptyState
              icon={User}
              title="Teacher not found"
              description={isError ? normalizeApiError(error) : 'This teacher record does not exist.'}
              action={<Button variant="primary" href="/dashboard/admin">Back to Admin</Button>}
            />
          </div>
        </div>
      </div>
    );
  }

  const u = teacher.userId;
  const name = fullName(u);
  const userId = u?._id;

  return (
    <div className="ui-page">
      <PageHeader
        title={name}
        description={`${teacher.designation || 'Faculty'} · ${teacher.department || 'CSE'}`}
        backButton
        breadcrumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Teachers' }, { label: name }]}
        actions={
          canEdit ? (
            <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
              <Button variant="outline" leftIcon={Pencil} onClick={() => setEditUser(true)}>Edit Personal Info</Button>
              <Button variant="primary" leftIcon={Pencil} onClick={openEditTeacher}>Edit Teacher</Button>
              {isSysAdmin && (
                <>
                  <Button variant="warning" onClick={() => setShowChangeType(true)}>Change Type</Button>
                  <Button variant="danger" onClick={() => setShowDeactivate(true)}>Deactivate</Button>
                  <Button variant="danger" onClick={() => setShowDelete(true)}>Delete Permanently</Button>
                </>
              )}
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
                <Badge variant={teacher.isActive ? 'success' : 'warning'}>{teacher.isActive ? 'Active' : 'Inactive'}</Badge>
                {teacher.employmentType && <Badge variant="neutral">{teacher.employmentType}</Badge>}
              </div>
              <div className="ui-flex ui-flex-gap-3 ui-flex-wrap ui-text-sm ui-text-muted">
                <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Mail size={14} /> {u?.email || '—'}</span>
                <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Phone size={14} /> {u?.phone || '—'}</span>
                <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Building2 size={14} /> {teacher.department || '—'}</span>
              </div>
            </div>
          </div>
          {u?.bio && <p className="ui-text-sm ui-text-muted ui-mt-3" style={{ margin: '12px 0 0', lineHeight: 1.6 }}>{u.bio}</p>}
        </div>
      </div>

      {/* Key metrics */}
      <div className="ui-grid-4">
        <StatsCard title="Designation" value={teacher.designation || '—'} icon={Briefcase} color="primary" />
        <StatsCard title="Joined" value={fmtDate(teacher.joiningDate)} icon={CalendarDays} color="success" />
        <StatsCard title="Publications" value={teacher.totalPublications ?? 0} icon={BookOpen} color="info" />
        <StatsCard title="Courses Taught" value={teacher.totalCoursesTaught ?? 0} icon={GraduationCap} color="warning" />
      </div>

      <div className="ui-grid-2" style={{ alignItems: 'start' }}>
        {/* Personal info */}
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><IdCard size={17} /> Profile Information</h3>
          </div>
          <div className="ui-card__body" style={{ paddingTop: 6 }}>
            <InfoRow icon={User} label="Full Name" value={name} />
            <InfoRow icon={IdCard} label="Employee ID" value={teacher.employeeId || '—'} />
            <InfoRow icon={Briefcase} label="Designation" value={teacher.designation || '—'} />
            <InfoRow icon={Building2} label="Department" value={teacher.department || '—'} />
            <InfoRow icon={Clock} label="Employment Type" value={teacher.employmentType || '—'} />
            <InfoRow icon={CalendarDays} label="Joining Date" value={fmtDate(teacher.joiningDate)} />
            <InfoRow icon={FlaskConical} label="Research Area" value={teacher.researchArea || '—'} />
            {u?.socialMedia?.linkedin && <InfoRow icon={Globe} label="LinkedIn" value={u.socialMedia.linkedin} />}
            {u?.socialMedia?.github && <InfoRow icon={Globe} label="GitHub" value={u.socialMedia.github} />}
          </div>
        </div>

        {/* Research interests */}
        <div className="ui-flex-col" style={{ gap: 24 }}>
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><FlaskConical size={17} /> Research Interests</h3>
            </div>
            <div className="ui-card__body">
              {teacher.researchInterests && teacher.researchInterests.length > 0 ? (
                <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
                  {teacher.researchInterests.map((interest, i) => (
                    <Badge key={i} variant="primary">{interest}</Badge>
                  ))}
                </div>
              ) : (
                <span className="ui-text-sm ui-text-muted">None listed</span>
              )}
            </div>
          </div>

          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Award size={17} /> Club Roles</h3>
            </div>
            <div className="ui-card__body">
              {teacher.clubRoles && teacher.clubRoles.length > 0 ? (
                <div className="ui-flex-col" style={{ gap: 10 }}>
                  {teacher.clubRoles.map((role, i) => (
                    <div key={i} className="ui-flex ui-flex-between" style={{ alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="ui-font-medium">{role.role || '—'}</span>
                      <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                        <span className="ui-text-xs ui-text-muted">{fmtDate(role.startDate)} – {role.isCurrent ? 'Present' : fmtDate(role.endDate)}</span>
                        <Badge variant={role.isCurrent ? 'success' : 'neutral'}>{role.isCurrent ? 'Current' : 'Past'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="ui-text-sm ui-text-muted">No club roles</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Qualifications */}
      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><GraduationCap size={17} /> Qualifications</h3>
        </div>
        <div className="ui-card__body ui-card__body--flush">
          {teacher.qualifications && teacher.qualifications.length > 0 ? (
            <div className="ui-table--scroll">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Degree</th>
                    <th>Institution</th>
                    <th>Field</th>
                    <th>Country</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  {teacher.qualifications.map((q, i) => (
                    <tr key={i}>
                      <td className="ui-font-medium">{q.degree || '—'}</td>
                      <td>{q.institution || '—'}</td>
                      <td>{q.fieldOfStudy || '—'}</td>
                      <td>{q.country || '—'}</td>
                      <td>{q.completionYear || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={GraduationCap} title="No qualifications" description="No qualifications have been added yet." size="sm" />
          )}
        </div>
      </div>

      {/* Edit Teacher Modal */}
      <Modal
        isOpen={editTeacher}
        onClose={() => setEditTeacher(false)}
        title="Edit Teacher Record"
        description={`Update professional details for ${name}.`}
        size="lg"
        footer={
          <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEditTeacher(false)} disabled={updateMutation.isPending}>Cancel</Button>
            <Button variant="primary" leftIcon={CheckCircle2} onClick={() => updateMutation.mutate()} isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        }
      >
        <div className="ui-flex-col" style={{ gap: 16 }}>
          {formError && <Alert variant="error" onClose={() => setFormError(null)}>{formError}</Alert>}

          <div className="ui-grid-2" style={{ gap: 16 }}>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Designation</span>
              <select className="ui-select" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}>
                <option value="">Select...</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Senior Lecturer">Senior Lecturer</option>
                <option value="Adjunct Faculty">Adjunct Faculty</option>
              </select>
            </label>

            <label className="ui-input-wrap">
              <span className="ui-input-label">Department</span>
              <input className="ui-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science and Engineering" />
            </label>
          </div>

          <div className="ui-grid-2" style={{ gap: 16 }}>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Employment Type</span>
              <select className="ui-select" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                <option value="">Select...</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Visiting">Visiting</option>
                <option value="Adjunct">Adjunct</option>
              </select>
            </label>

            <label className="ui-input-wrap">
              <span className="ui-input-label">Research Area</span>
              <input className="ui-input" value={form.researchArea} onChange={(e) => setForm({ ...form, researchArea: e.target.value })} placeholder="e.g. Machine Learning" />
            </label>
          </div>

          <label className="ui-input-wrap">
            <span className="ui-input-label">Research Interests (comma-separated)</span>
            <input className="ui-input" value={form.researchInterests} onChange={(e) => setForm({ ...form, researchInterests: e.target.value })} placeholder="e.g. NLP, Computer Vision, Robotics" />
          </label>
        </div>
      </Modal>

      {/* Shared modals */}
      {u && (
        <>
          <EditUserModal
            isOpen={editUser}
            onClose={() => setEditUser(false)}
            user={u ? { _id: u._id!, firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phone: u.phone, dateOfBirth: u.dateOfBirth, gender: u.gender, bloodGroup: u.bloodGroup, bio: u.bio } : null}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-teacher', id, token] })}
          />
          <DeactivateUserDialog
            isOpen={showDeactivate}
            onClose={() => setShowDeactivate(false)}
            userId={u._id!}
            userName={name}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-teacher', id, token] })}
          />
          <ChangeUserTypeModal
            isOpen={showChangeType}
            onClose={() => setShowChangeType(false)}
            userId={u._id!}
            userName={name}
            currentType="Teacher"
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-teacher', id, token] })}
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
    </div>
  );
}
