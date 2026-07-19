import { FormEvent, useEffect, useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Camera, User, BookOpen, Code2, Share2,
  Facebook, Linkedin, Github, Twitter,
  CheckCircle, XCircle, GraduationCap, Hash, Calendar,
  Save, Loader2, Award, Briefcase
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError, type ApiUser } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { YearCorrectionRequest } from '../../components/membership/YearCorrectionRequest';
import toast from 'react-hot-toast';

type ProfilePayload = {
  user: ApiUser & {
    fullNameBangla?: string; dateOfBirth?: string; gender?: string; bloodGroup?: string;
    socialMedia?: { facebook?: string; linkedin?: string; github?: string; twitter?: string };
    technicalSkills?: string[]; programmingLanguages?: string[]; profileCompleteness?: number;
  };
  membership: {
    studentId: string; batch: number; currentYear: number; status: string;
    academicRecord?: { currentCgpa?: number };
    attendanceRecord?: { overallAttendancePercentage?: number };
    electionEligibility?: { isEligibleForVoting?: boolean; isEligibleForCandidacy?: boolean };
    ecExperience?: {
      postName: string;
      startDate?: string;
      endDate?: string;
      isCurrent?: boolean;
      performanceRating?: string;
      eventsOrganized?: number;
      meetingsAttended?: number;
    }[];
    yearCorrectionRequest?: {
      status: 'None' | 'Pending' | 'Approved' | 'Rejected';
      requestedYear?: number;
      reason?: string;
      requestedAt?: string;
      reviewedAt?: string;
      reviewNote?: string;
    };
  } | null;
  teacher: {
    employeeId: string;
    designation: string;
    department: string;
    joiningDate: string;
    employmentType: string;
    qualifications?: any[];
    researchInterests?: string[];
    researchArea?: string;
  } | null;
  account: { isActive: boolean; joinedAt: string; updatedAt: string; profileCompleteness?: number };
};

export function ModernProfilePage() {
  const { token, user: authUser, setUserProfile, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', fullNameBangla: '', phone: '',
    dateOfBirth: '', gender: '', bloodGroup: '', bio: '',
    currentCgpa: '', attendancePercentage: '',
    technicalSkills: [] as string[], programmingLanguages: [] as string[],
    facebook: '', linkedin: '', github: '', twitter: '',
  });

  const profileQ = useQuery({
    queryKey: ['my-profile', token],
    queryFn: () => apiRequest<ProfilePayload>('/auth/me', { token }),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!profileQ.data) return;
    const u = profileQ.data.user;
    const m = profileQ.data.membership;
    
    console.log('🔄 [PROFILE EFFECT] Syncing form with profile data');
    console.log('📊 User data from API:', {
      gender: u.gender,
      bloodGroup: u.bloodGroup,
      dateOfBirth: u.dateOfBirth,
      fullUser: u
    });
    
    setForm({
      firstName: u.firstName || '', lastName: u.lastName || '',
      fullNameBangla: u.fullNameBangla || '', phone: u.phone || '',
      dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '',
      gender: u.gender || '', bloodGroup: u.bloodGroup || '', bio: u.bio || '',
      currentCgpa: m?.academicRecord?.currentCgpa?.toString() || '',
      attendancePercentage: m?.attendanceRecord?.overallAttendancePercentage?.toString() || '',
      technicalSkills: u.technicalSkills || [], programmingLanguages: u.programmingLanguages || [],
      facebook: u.socialMedia?.facebook || '', linkedin: u.socialMedia?.linkedin || '',
      github: u.socialMedia?.github || '', twitter: u.socialMedia?.twitter || '',
    });
    
    console.log('✅ [PROFILE EFFECT] Form state updated with gender:', u.gender || '(empty)');
    
    if (u.avatarUrl) setImagePreview(u.avatarUrl);
  }, [profileQ.data]);

  const updateMut = useMutation({
    mutationFn: async () => {
      console.log('🚀 [MUTATION START] Submitting profile update');
      console.log('📤 Form data being sent:', {
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        dateOfBirth: form.dateOfBirth,
        fullForm: form
      });
      
      let avatarUrl = profileQ.data?.user.avatarUrl || '';
      if (imageFile) {
        const fd = new FormData();
        fd.append('avatar', imageFile);
        const res = await apiRequest<{ url: string }>('/upload/avatar', { method: 'POST', token, body: fd, isFormData: true });
        avatarUrl = res.url;
      }
      
      const payload = {
        firstName: form.firstName, lastName: form.lastName,
        fullNameBangla: form.fullNameBangla, phone: form.phone,
        dateOfBirth: form.dateOfBirth || undefined, gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined, bio: form.bio, avatarUrl,
        technicalSkills: form.technicalSkills, programmingLanguages: form.programmingLanguages,
        socialMedia: { facebook: form.facebook, linkedin: form.linkedin, github: form.github, twitter: form.twitter },
        memberData: {
          academicRecord: { currentCgpa: form.currentCgpa ? parseFloat(form.currentCgpa) : undefined },
          attendanceRecord: { overallAttendancePercentage: form.attendancePercentage ? parseFloat(form.attendancePercentage) : undefined },
        },
      };
      
      console.log('📦 Payload to API:', JSON.stringify(payload, null, 2));
      
      return apiRequest<ApiUser>('/auth/profile', {
        method: 'PATCH', token,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (updated) => {
      console.log('✅ [MUTATION SUCCESS] Profile updated');
      console.log('📥 Updated user from API response:', {
        gender: updated.gender,
        bloodGroup: updated.bloodGroup,
        fullUser: updated
      });
      
      setUserProfile(updated);
      
      console.log('🔄 [REFETCH] Fetching fresh profile data...');
      const freshData = await profileQ.refetch();
      
      console.log('📊 [REFETCH RESULT] Fresh data received:', {
        hasData: !!freshData.data,
        gender: freshData.data?.user?.gender,
        bloodGroup: freshData.data?.user?.bloodGroup,
        fullData: freshData.data
      });
      
      if (freshData.data) {
        const u = freshData.data.user;
        const m = freshData.data.membership;
        
        const newFormState = {
          firstName: u.firstName || '', lastName: u.lastName || '',
          fullNameBangla: u.fullNameBangla || '', phone: u.phone || '',
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '',
          gender: u.gender || '', bloodGroup: u.bloodGroup || '', bio: u.bio || '',
          currentCgpa: m?.academicRecord?.currentCgpa?.toString() || '',
          attendancePercentage: m?.attendanceRecord?.overallAttendancePercentage?.toString() || '',
          technicalSkills: u.technicalSkills || [], programmingLanguages: u.programmingLanguages || [],
          facebook: u.socialMedia?.facebook || '', linkedin: u.socialMedia?.linkedin || '',
          github: u.socialMedia?.github || '', twitter: u.socialMedia?.twitter || '',
        };
        
        console.log('📝 [FORM UPDATE] Setting form state to:', {
          gender: newFormState.gender,
          bloodGroup: newFormState.bloodGroup,
          dateOfBirth: newFormState.dateOfBirth
        });
        
        setForm(newFormState);
        
        console.log('✅ [FORM UPDATE] Form state has been set');
      }
      setImageFile(null);
      toast.success('Profile updated successfully!');
    },
    onError: e => {
      console.error('❌ [MUTATION ERROR]', e);
      toast.error(normalizeApiError(e));
    },
  });

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  const completeness = profileQ.data?.user.profileCompleteness ?? 0;
  const isStudent = authUser?.roles?.some(r => 
    ['General Member', 'President', 'Vice President', 'General Secretary'].includes(r)
  ) && !authUser?.roles?.includes('Teacher') && !authUser?.roles?.includes('Alumni');
  const isTeacher = authUser?.roles?.includes('Teacher');
  const isAlumni = authUser?.roles?.includes('Alumni');
  const canVote = profileQ.data?.membership?.electionEligibility?.isEligibleForVoting;
  const canRun  = profileQ.data?.membership?.electionEligibility?.isEligibleForCandidacy;

  // Debug: Log current form state on every render
  console.log('🎨 [RENDER] Current form state:', {
    gender: form.gender,
    bloodGroup: form.bloodGroup,
    dateOfBirth: form.dateOfBirth,
    firstName: form.firstName,
    lastName: form.lastName
  });

  if (profileQ.isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}>
      <Spinner size="xl" label="Loading profile…" />
    </div>
  );

  return (
    <div className="ui-page">
      <PageHeader title="My Profile" description="Manage your personal information and account settings" />

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Avatar card */}
          <div className="ui-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Cover */}
            <div style={{ height: 90, background: 'var(--gradient-primary)' }} />

            {/* Avatar */}
            <div style={{ padding: '0 20px', marginTop: -44 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
                  border: '4px solid var(--panel-strong)',
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: '2rem',
                }}>
                  {imagePreview
                    ? <img src={imagePreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (form.firstName.charAt(0) || '?').toUpperCase()
                  }
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--gradient-primary)', border: '2px solid var(--panel-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff',
                  }}
                  title="Change photo"
                >
                  <Camera size={13} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              </div>
            </div>

            <div style={{ padding: '10px 20px 20px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                {form.firstName} {form.lastName}
              </h2>
              {form.fullNameBangla && <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: 'var(--muted)' }}>{form.fullNameBangla}</p>}
              <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: 'var(--muted)' }}>{profileQ.data?.user.email}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {profileQ.data?.membership && (
                  <Badge variant={profileQ.data.membership.status === 'Active' ? 'success' : 'neutral'}>
                    {profileQ.data.membership.status}
                  </Badge>
                )}
                {profileQ.data?.user.roles?.map(r => (
                  <Badge key={r} variant="primary">{r}</Badge>
                ))}
              </div>

              {/* Completeness */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Profile completeness</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>{completeness}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: 'var(--gradient-primary)', borderRadius: 999 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${completeness}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>

              {/* Academic info for students */}
              {isStudent && profileQ.data?.membership && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Student ID', value: profileQ.data.membership.studentId },
                    { label: 'Batch',      value: profileQ.data.membership.batch },
                    { label: 'Year',       value: profileQ.data.membership.currentYear },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'var(--surface)' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Alumni info - they still have student ID and batch */}
              {isAlumni && profileQ.data?.membership && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Student ID', value: profileQ.data.membership.studentId },
                    { label: 'Batch',      value: profileQ.data.membership.batch },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'var(--surface)' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Teacher info */}
              {isTeacher && profileQ.data?.teacher && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Employee ID', value: profileQ.data.teacher.employeeId },
                    { label: 'Designation',  value: profileQ.data.teacher.designation?.replace(/_/g, ' ') },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'var(--surface)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Election eligibility */}
          {isStudent && (
            <div className="ui-card">
              <div className="ui-card__header"><h3 className="ui-card__title">Election Eligibility</h3></div>
              <div className="ui-card__body">
                {[
                  { label: 'Voting',       ok: canVote },
                  { label: 'EC Candidacy', ok: canRun  },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{item.label}</span>
                    {item.ok
                      ? <CheckCircle size={18} style={{ color: '#10b981' }} />
                      : <XCircle size={18} style={{ color: '#ef4444' }} />
                    }
                  </div>
                ))}
                {canRun && (
                  <Link to="/dashboard/elections/apply">
                    <Button variant="primary" size="sm" fullWidth>Apply as Candidate</Button>
                  </Link>
                )}
                {!canRun && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Complete CGPA ≥ 3.0 and attendance ≥ 75% to become eligible.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Year Correction Request */}
          {isStudent && profileQ.data?.membership && (
            <YearCorrectionRequest
              currentYear={profileQ.data.membership.currentYear}
              batch={profileQ.data.membership.batch}
              yearCorrectionRequest={profileQ.data.membership.yearCorrectionRequest}
              onRefresh={() => profileQ.refetch()}
            />
          )}

          {/* EC Experience - Only for students */}
          {isStudent && (
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Briefcase size={16} />
                  EC Experience
                </h3>
              </div>
              <div className="ui-card__body">
                {profileQ.data?.membership?.ecExperience && profileQ.data.membership.ecExperience.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {profileQ.data.membership.ecExperience.slice(0, 3).map((exp, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            padding: '10px 12px', 
                            borderRadius: 10, 
                            background: exp.isCurrent ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' : 'var(--surface)',
                            border: exp.isCurrent ? '2px solid #3b82f6' : '1px solid var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{exp.postName}</strong>
                            {exp.isCurrent && (
                              <Badge variant="success" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Current</Badge>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {exp.startDate ? new Date(exp.startDate).getFullYear() : '—'} - {exp.isCurrent ? 'Present' : (exp.endDate ? new Date(exp.endDate).getFullYear() : '—')}
                          </p>
                          {exp.performanceRating && (
                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--muted)' }}>
                              Rating: {exp.performanceRating.replace(/_/g, ' ')}
                            </p>
                          )}
                        </div>
                      ))}
                      {profileQ.data.membership.ecExperience.length > 3 && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
                          +{profileQ.data.membership.ecExperience.length - 3} more
                        </p>
                      )}
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Award size={14} />
                        {profileQ.data.membership.ecExperience.filter(e => e.isCurrent).length} current position(s)
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                    <Award size={32} style={{ color: 'var(--muted)', marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>No EC Experience Yet</p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Your executive committee experience will appear here once you join the EC.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Main Form ── */}
        <div className="ui-card" style={{ padding: 0 }}>
          <form onSubmit={e => { e.preventDefault(); updateMut.mutate(); }}>
            <Tabs defaultValue="basic">
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                <TabsList>
                  <TabsTrigger value="basic"><User size={14} style={{ marginRight: 6 }} />Basic Info</TabsTrigger>
                  {isStudent && <TabsTrigger value="academic"><GraduationCap size={14} style={{ marginRight: 6 }} />Academic</TabsTrigger>}
                  <TabsTrigger value="skills"><Code2 size={14} style={{ marginRight: 6 }} />Skills</TabsTrigger>
                  <TabsTrigger value="social"><Share2 size={14} style={{ marginRight: 6 }} />Social</TabsTrigger>
                </TabsList>
              </div>

              <div style={{ padding: 24 }}>
                {/* Basic Info */}
                <TabsContent value="basic">
                  <div className="ui-grid-2" style={{ marginBottom: 16 }}>
                    {[
                      { label: 'First Name *', key: 'firstName', required: true },
                      { label: 'Last Name *',  key: 'lastName',  required: true },
                      { label: 'Full Name (Bangla)', key: 'fullNameBangla', placeholder: 'আপনার পুরো নাম' },
                      { label: 'Phone *', key: 'phone', placeholder: '+8801XXXXXXXXX', required: true },
                    ].map(f => (
                      <div key={f.key} className="ui-input-wrap">
                        <label className="ui-input-label">{f.label}</label>
                        <input
                          className="ui-input"
                          value={(form as any)[f.key]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          required={f.required}
                        />
                      </div>
                    ))}
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Date of Birth</label>
                      <input type="date" className="ui-input" value={form.dateOfBirth}
                        onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} />
                    </div>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Gender</label>
                      <select 
                        className="ui-select" 
                        value={form.gender} 
                        onChange={e => {
                          console.log('🔄 [GENDER CHANGE] User selected:', e.target.value);
                          setForm(p => {
                            const updated = { ...p, gender: e.target.value };
                            console.log('📝 [GENDER CHANGE] Updated form state:', updated);
                            return updated;
                          });
                        }}
                      >
                        <option value="">Select…</option>
                        {['Male','Female','Other','Prefer not to say'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Blood Group</label>
                      <select className="ui-select" value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}>
                        <option value="">Select…</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="ui-input-wrap">
                    <label className="ui-input-label">Bio</label>
                    <textarea className="ui-textarea" rows={4} value={form.bio}
                      onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell others about yourself…" />
                  </div>
                </TabsContent>

                {/* Academic */}
                {isStudent && (
                  <TabsContent value="academic">
                    <Alert variant="info" className="ui-mb-4">
                      EC Requirements: CGPA ≥ 3.0 and Attendance ≥ 75%
                    </Alert>
                    <div className="ui-grid-2">
                      <div className="ui-input-wrap">
                        <label className="ui-input-label">Current CGPA</label>
                        <input type="number" step="0.01" min="0" max="4" className="ui-input"
                          value={form.currentCgpa} onChange={e => setForm(p => ({ ...p, currentCgpa: e.target.value }))}
                          placeholder="3.50" />
                        <span className="ui-text-xs ui-text-muted">Scale: 0.00 – 4.00</span>
                      </div>
                      <div className="ui-input-wrap">
                        <label className="ui-input-label">Attendance %</label>
                        <input type="number" step="0.1" min="0" max="100" className="ui-input"
                          value={form.attendancePercentage} onChange={e => setForm(p => ({ ...p, attendancePercentage: e.target.value }))}
                          placeholder="85.5" />
                        <span className="ui-text-xs ui-text-muted">Overall attendance percentage</span>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {/* Skills */}
                <TabsContent value="skills">
                  {[
                    { title: 'Technical Skills', key: 'technicalSkills', input: skillInput, setInput: setSkillInput, placeholder: 'e.g. React, Node.js' },
                    { title: 'Programming Languages', key: 'programmingLanguages', input: langInput, setInput: setLangInput, placeholder: 'e.g. Python, JavaScript' },
                  ].map(section => (
                    <div key={section.key} style={{ marginBottom: 28 }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{section.title}</h4>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input
                          className="ui-input"
                          style={{ flex: 1 }}
                          value={section.input}
                          onChange={e => section.setInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = section.input.trim();
                              if (val && !(form as any)[section.key].includes(val)) {
                                setForm(p => ({ ...p, [section.key]: [...(p as any)[section.key], val] }));
                                section.setInput('');
                              }
                            }
                          }}
                          placeholder={section.placeholder}
                        />
                        <Button variant="outline" type="button" onClick={() => {
                          const val = section.input.trim();
                          if (val && !(form as any)[section.key].includes(val)) {
                            setForm(p => ({ ...p, [section.key]: [...(p as any)[section.key], val] }));
                            section.setInput('');
                          }
                        }}>Add</Button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {((form as any)[section.key] as string[]).map((item: string) => (
                          <span key={item} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 999, fontSize: '0.8rem',
                            background: 'rgba(107,163,255,0.12)', color: 'var(--accent)',
                            border: '1px solid rgba(107,163,255,0.25)',
                          }}>
                            {item}
                            <button type="button" onClick={() => setForm(p => ({ ...p, [section.key]: (p as any)[section.key].filter((s: string) => s !== item) }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1, fontSize: '1rem' }}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Social */}
                <TabsContent value="social">
                  <div className="ui-grid-2">
                    {[
                      { label: 'Facebook', key: 'facebook', icon: Facebook, placeholder: 'https://facebook.com/username' },
                      { label: 'LinkedIn', key: 'linkedin', icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
                      { label: 'GitHub',   key: 'github',   icon: Github,   placeholder: 'https://github.com/username' },
                      { label: 'Twitter',  key: 'twitter',  icon: Twitter,  placeholder: 'https://twitter.com/username' },
                    ].map(f => {
                      const Icon = f.icon;
                      return (
                        <div key={f.key} className="ui-input-wrap">
                          <label className="ui-input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon size={14} /> {f.label}
                          </label>
                          <input className="ui-input" value={(form as any)[f.key]}
                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder} />
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Save button */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" leftIcon={Save} isLoading={updateMut.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
