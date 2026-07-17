import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, GraduationCap, CalendarDays, IdCard, Briefcase,
  BookOpen, Globe, Award, MapPin, Heart, Building2, Pencil, UserX, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { EditUserModal, DeactivateUserDialog, ChangeUserTypeModal, DeleteUserDialog } from './components';

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
  socialMedia?: Record<string, string>;
};

type AlumniDetail = {
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
  alumniInfo?: {
    graduatedYear?: number;
    graduatedBatch?: number;
    finalCgpa?: number;
    currentEmployer?: string;
    currentPosition?: string;
    employmentStatus?: string;
    isInHigherStudies?: boolean;
    higherStudiesInstitution?: string;
    higherStudiesDegree?: string;
    higherStudiesCountry?: string;
    willingToMentor?: boolean;
    mentoringAreas?: string[];
    profileCompleteness?: number;
  };
  ecExperience?: Array<{
    postName: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }>;
};

const fullName = (u?: PopulatedUser) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Unknown Alumni';

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

export function AlumniDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canEdit = Boolean(user?.roles.some((r) => ['System Admin', 'Moderator'].includes(r)));

  const [showEditUser, setShowEditUser] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showChangeType, setShowChangeType] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: alumni, isLoading, isError } = useQuery({
    queryKey: ['admin-alumni-detail', id, token],
    queryFn: () => apiRequest<AlumniDetail>(`/admin/alumni/${id}`, { token }),
    enabled: Boolean(token && id),
  });

  if (isLoading) {
    return (
      <div className="ui-page">
        <div className="ui-flex-center" style={{ padding: 80 }}>
          <Spinner size="lg" label="Loading alumni..." />
        </div>
      </div>
    );
  }

  if (isError || !alumni) {
    return (
      <div className="ui-page">
        <PageHeader title="Alumni" backButton breadcrumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Alumni' }]} />
        <EmptyState icon={User} title="Alumni not found" description="Could not load alumni details." />
      </div>
    );
  }

  const name = fullName(alumni.userId);
  const userId = alumni.userId?._id || '';
  const info = alumni.alumniInfo;

  return (
    <div className="ui-page">
      <PageHeader
        title={name}
        description="Alumni Details"
        backButton
        breadcrumbs={[
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Alumni' },
          { label: name },
        ]}
        actions={canEdit ? (
          <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
            <Button variant="outline" size="sm" leftIcon={Pencil} onClick={() => setShowEditUser(true)}>Edit Info</Button>
            <Button variant="outline" size="sm" leftIcon={RefreshCw} onClick={() => setShowChangeType(true)}>Change Type</Button>
            <Button variant="danger" size="sm" leftIcon={UserX} onClick={() => setShowDeactivate(true)}>Deactivate</Button>
            <Button variant="danger" size="sm" leftIcon={Trash2} onClick={() => setShowDelete(true)}>Delete Permanently</Button>
          </div>
        ) : undefined}
      />

      {/* Profile Banner */}
      <div className="ui-card" style={{ marginBottom: 24 }}>
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-4" style={{ alignItems: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--surface)', border: '3px solid var(--accent)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {alumni.userId?.avatarUrl
                ? <img src={alumni.userId.avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <GraduationCap size={36} style={{ color: 'var(--muted)' }} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{name}</h2>
              <div className="ui-text-sm ui-text-muted" style={{ marginTop: 4 }}>{alumni.userId?.email}</div>
              <div className="ui-flex ui-flex-gap-2 ui-flex-wrap" style={{ marginTop: 8 }}>
                <Badge variant="success">Graduated</Badge>
                {info?.employmentStatus && <Badge variant="primary">{info.employmentStatus}</Badge>}
                {info?.isInHigherStudies && <Badge variant="warning">Higher Studies</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatsCard title="Final CGPA" value={info?.finalCgpa?.toFixed(2) ?? '—'} icon={Award} />
        <StatsCard title="Graduated" value={info?.graduatedYear?.toString() ?? '—'} icon={GraduationCap} />
        <StatsCard title="Batch" value={alumni.batch?.toString() ?? '—'} icon={CalendarDays} />
        <StatsCard title="Willing to Mentor" value={info?.willingToMentor ? 'Yes' : 'No'} icon={Heart} />
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Personal Info */}
        <div className="ui-card">
          <div className="ui-card__header"><h4 className="ui-card__title">Personal Information</h4></div>
          <div className="ui-card__body" style={{ padding: '12px 20px' }}>
            <InfoRow icon={IdCard} label="Student ID" value={alumni.studentId} />
            <InfoRow icon={CalendarDays} label="Batch" value={alumni.batch} />
            <InfoRow icon={BookOpen} label="Session" value={alumni.session} />
            <InfoRow icon={Phone} label="Phone" value={alumni.userId?.phone} />
            <InfoRow icon={User} label="Gender" value={alumni.userId?.gender} />
            <InfoRow icon={CalendarDays} label="Date of Birth" value={fmtDate(alumni.userId?.dateOfBirth)} />
          </div>
        </div>

        {/* Employment Info */}
        <div className="ui-card">
          <div className="ui-card__header"><h4 className="ui-card__title">Employment</h4></div>
          <div className="ui-card__body" style={{ padding: '12px 20px' }}>
            <InfoRow icon={Building2} label="Current Employer" value={info?.currentEmployer} />
            <InfoRow icon={Briefcase} label="Position" value={info?.currentPosition} />
            <InfoRow icon={Award} label="Employment Status" value={info?.employmentStatus} />
            {info?.isInHigherStudies && (
              <>
                <InfoRow icon={GraduationCap} label="Institution" value={info.higherStudiesInstitution} />
                <InfoRow icon={BookOpen} label="Degree" value={info.higherStudiesDegree} />
                <InfoRow icon={Globe} label="Country" value={info.higherStudiesCountry} />
              </>
            )}
          </div>
        </div>

        {/* Mentoring */}
        <div className="ui-card">
          <div className="ui-card__header"><h4 className="ui-card__title">Mentoring</h4></div>
          <div className="ui-card__body" style={{ padding: '12px 20px' }}>
            <InfoRow icon={Heart} label="Willing to Mentor" value={info?.willingToMentor ? 'Yes' : 'No'} />
            {info?.mentoringAreas && info.mentoringAreas.length > 0 && (
              <InfoRow icon={MapPin} label="Mentoring Areas" value={
                <div className="ui-flex ui-flex-gap-2 ui-flex-wrap" style={{ marginTop: 4 }}>
                  {info.mentoringAreas.map((area) => (
                    <Badge key={area} variant="neutral">{area}</Badge>
                  ))}
                </div>
              } />
            )}
          </div>
        </div>

        {/* EC Experience */}
        {alumni.ecExperience && alumni.ecExperience.length > 0 && (
          <div className="ui-card">
            <div className="ui-card__header"><h4 className="ui-card__title">EC Experience</h4></div>
            <div className="ui-card__body">
              <div className="ui-table--scroll">
                <table className="ui-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr><th>Post</th><th>Period</th></tr>
                  </thead>
                  <tbody>
                    {alumni.ecExperience.map((ec, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{ec.postName}</td>
                        <td className="ui-text-muted">{fmtDate(ec.startDate)} – {ec.endDate ? fmtDate(ec.endDate) : 'Present'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Social Links */}
        {alumni.userId?.socialMedia && Object.values(alumni.userId.socialMedia).some(Boolean) && (
          <div className="ui-card">
            <div className="ui-card__header"><h4 className="ui-card__title">Social Links</h4></div>
            <div className="ui-card__body" style={{ padding: '12px 20px' }}>
              {Object.entries(alumni.userId.socialMedia)
                .filter(([, v]) => v)
                .map(([key, val]) => (
                  <InfoRow key={key} icon={Globe} label={key} value={
                    <a href={val} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>{val}</a>
                  } />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {alumni.userId && (
        <>
          <EditUserModal
            isOpen={showEditUser}
            onClose={() => setShowEditUser(false)}
            user={alumni.userId ? {
              _id: alumni.userId._id || '',
              firstName: alumni.userId.firstName || '',
              lastName: alumni.userId.lastName || '',
              email: alumni.userId.email || '',
              phone: alumni.userId.phone || '',
              dateOfBirth: alumni.userId.dateOfBirth || '',
              gender: alumni.userId.gender || '',
              bloodGroup: alumni.userId.bloodGroup || '',
              bio: alumni.userId.bio || '',
            } : null}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-alumni-detail', id, token] })}
          />
          <DeactivateUserDialog
            isOpen={showDeactivate}
            onClose={() => setShowDeactivate(false)}
            userId={alumni.userId._id || null}
            userName={name}
            onSuccess={() => navigate('/dashboard/admin')}
          />
          <ChangeUserTypeModal
            isOpen={showChangeType}
            onClose={() => setShowChangeType(false)}
            userId={alumni.userId._id || null}
            userName={name}
            currentType="Alumni"
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-alumni-detail', id, token] })}
          />
          <DeleteUserDialog
            isOpen={showDelete}
            onClose={() => setShowDelete(false)}
            userId={alumni.userId._id || null}
            userName={name}
            userEmail={alumni.userId.email || ''}
            onSuccess={() => navigate('/dashboard/admin')}
          />
        </>
      )}
    </div>
  );
}
