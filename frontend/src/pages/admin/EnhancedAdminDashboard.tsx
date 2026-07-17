import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, GraduationCap, Award, Shield, Search, UserCheck,
  LayoutDashboard, BarChart3, UserPlus,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';

type Tab = 'overview' | 'students' | 'teachers' | 'alumni' | 'roles';

type Stats = {
  totalStudents: Array<{ count: number }>;
  totalTeachers: Array<{ count: number }>;
  byYear: Array<{ _id: string; count: number }>;
  byDesignation: Array<{ _id: string; count: number }>;
  activeMembers: Array<{ count: number }>;
  activeTeachers: Array<{ count: number }>;
};

type Student = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  batch: number;
  currentYear: number;
  academicYearLevel: string;
  membershipStatus: string;
  cgpa: number | string;
  attendance: number | string;
  avatarUrl?: string;
};

type Teacher = {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  department: string;
  totalPublications: number;
  totalCourses: number;
  clubRoles: string[];
  avatarUrl?: string;
};

type Alumni = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  batch: number;
  graduatedYear?: number;
  currentEmployer?: string;
  currentPosition?: string;
  employmentStatus?: string;
  avatarUrl?: string;
};

const clean = (v?: string | number | null) => {
  if (!v) return '';
  const str = typeof v === 'string' ? v : String(v);
  return str.replace(/_/g, ' ');
};

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) return <img src={src} alt={name} className="ui-avatar" />;
  return <div className="ui-avatar ui-avatar--fallback">{name?.charAt(0) || '?'}</div>;
}

function PersonCell({ name, email, src }: { name: string; email: string; src?: string }) {
  return (
    <div className="ui-flex ui-flex-gap-3" style={{ alignItems: 'center' }}>
      <Avatar name={name} src={src} />
      <div style={{ minWidth: 0 }}>
        <div className="ui-font-medium ui-truncate">{name}</div>
        <div className="ui-text-xs ui-text-muted ui-truncate">{email}</div>
      </div>
    </div>
  );
}

export function EnhancedAdminDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    batch: '',
    year: '',
    status: '',
    designation: '',
    employmentStatus: '',
  });

  const { data: studentStats } = useQuery({
    queryKey: ['admin-student-stats', token],
    queryFn: () => apiRequest<Stats>('/admin/students/stats', { token }),
    enabled: Boolean(token),
  });

  const { data: teacherStats } = useQuery({
    queryKey: ['admin-teacher-stats', token],
    queryFn: () => apiRequest<Stats>('/admin/teachers/stats', { token }),
    enabled: Boolean(token),
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-students', searchQuery, filters.batch, filters.year, filters.status, token],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.year) params.append('year', filters.year);
      if (filters.status) params.append('status', filters.status);
      const qs = params.toString();
      return apiRequest<Student[]>(qs ? `/admin/students?${qs}` : '/admin/students', { token });
    },
    enabled: activeTab === 'students' && Boolean(token),
  });

  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['admin-teachers', searchQuery, filters.designation, token],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.designation) params.append('designation', filters.designation);
      const qs = params.toString();
      return apiRequest<Teacher[]>(qs ? `/admin/teachers?${qs}` : '/admin/teachers', { token });
    },
    enabled: activeTab === 'teachers' && Boolean(token),
  });

  const { data: alumni, isLoading: alumniLoading } = useQuery({
    queryKey: ['admin-alumni', searchQuery, filters.batch, filters.employmentStatus, token],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.employmentStatus) params.append('employmentStatus', filters.employmentStatus);
      const qs = params.toString();
      return apiRequest<Alumni[]>(qs ? `/admin/alumni?${qs}` : '/admin/alumni', { token });
    },
    enabled: activeTab === 'alumni' && Boolean(token),
  });

  const totalStudents = studentStats?.totalStudents?.[0]?.count || 0;
  const totalTeachers = teacherStats?.totalTeachers?.[0]?.count || 0;
  const activeStudents = studentStats?.activeMembers?.[0]?.count || 0;
  const activeTeachersCount = teacherStats?.activeTeachers?.[0]?.count || 0;

  const studentsByYear = studentStats?.byYear || [];
  const teachersByDesignation = teacherStats?.byDesignation || [];

  const tabs = useMemo(
    () => [
      { id: 'overview' as Tab, label: 'Overview', icon: LayoutDashboard, count: undefined as number | undefined },
      { id: 'students' as Tab, label: 'Students', icon: Users, count: totalStudents },
      { id: 'teachers' as Tab, label: 'Teachers', icon: GraduationCap, count: totalTeachers },
      { id: 'alumni' as Tab, label: 'Alumni', icon: Award, count: undefined },
      { id: 'roles' as Tab, label: 'Roles', icon: Shield, count: undefined },
    ],
    [totalStudents, totalTeachers]
  );

  return (
    <div className="ui-page">
      <PageHeader
        title="Admin Dashboard"
        description="Manage students, teachers, alumni, and system roles"
        actions={
          <Button variant="secondary" leftIcon={Shield} href="/dashboard/admin/roles">
            Manage Roles
          </Button>
        }
      />

      {/* Tabs */}
      <div className="ui-tabs" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              className={`ui-tab ${active ? 'ui-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={16} />
              {t.label}
              {typeof t.count === 'number' && <span className="ui-tab__count">{t.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="ui-flex-col" style={{ gap: 24 }}>
          <div className="ui-grid-3">
            <StatsCard
              title="Total Students"
              value={totalStudents}
              icon={Users}
              color="primary"
              trend={{ value: 0, label: `${activeStudents} active members` }}
            />
            <StatsCard
              title="Total Teachers"
              value={totalTeachers}
              icon={GraduationCap}
              color="info"
              trend={{ value: 0, label: `${activeTeachersCount} active` }}
            />
            <StatsCard
              title="Alumni Network"
              value={alumni?.length ?? '—'}
              icon={Award}
              color="success"
              trend={{ value: 0, label: 'Graduated students' }}
            />
          </div>

          {/* Students by Year */}
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                <BarChart3 size={17} /> Students by Year Level
              </h3>
            </div>
            <div className="ui-card__body">
              {studentsByYear.length > 0 ? (
                <div className="ui-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                  {studentsByYear.map((item) => (
                    <div key={item._id || 'unknown'} className="ui-metric">
                      <div className="ui-metric__label">{clean(item._id) || 'Unknown'}</div>
                      <div className="ui-metric__value">{item.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={BarChart3} title="No data available" size="sm" />
              )}
            </div>
          </div>

          {/* Teachers by Designation */}
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                <GraduationCap size={17} /> Teachers by Designation
              </h3>
            </div>
            <div className="ui-card__body">
              {teachersByDesignation.length > 0 ? (
                <div className="ui-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                  {teachersByDesignation.map((item) => (
                    <div key={item._id || 'unknown'} className="ui-metric">
                      <div className="ui-metric__label">{clean(item._id) || 'Unknown'}</div>
                      <div className="ui-metric__value">{item.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={GraduationCap} title="No data available" size="sm" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="ui-flex-col" style={{ gap: 20 }}>
          <div className="ui-card">
            <div className="ui-card__body">
              <div className="ui-flex ui-flex-gap-3 ui-flex-wrap" style={{ alignItems: 'center' }}>
                <div className="ui-input-row ui-flex-1" style={{ minWidth: 240 }}>
                  <span className="ui-input-icon"><Search size={16} /></span>
                  <input
                    className="ui-input ui-input--icon"
                    type="text"
                    placeholder="Search by name, email, or student ID…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select className="ui-select" style={{ width: 'auto' }} value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })}>
                  <option value="">All Batches</option>
                  {[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].map((b) => (
                    <option key={b} value={b}>Batch {b}</option>
                  ))}
                </select>
                <select className="ui-select" style={{ width: 'auto' }} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
                  <option value="">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">Masters</option>
                </select>
                <select className="ui-select" style={{ width: 'auto' }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {studentsLoading ? (
            <div className="ui-flex-center" style={{ padding: 48 }}><Spinner size="lg" label="Loading students…" /></div>
          ) : (
            <div className="ui-card">
              <div className="ui-card__body ui-card__body--flush">
                {students && students.length > 0 ? (
                  <div className="ui-table--scroll">
                    <table className="ui-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Student ID</th>
                          <th>Batch</th>
                          <th>Year</th>
                          <th>CGPA</th>
                          <th>Attendance</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.id}>
                            <td><PersonCell name={s.name} email={s.email} src={s.avatarUrl} /></td>
                            <td>{s.studentId}</td>
                            <td>{s.batch}</td>
                            <td>{clean(s.academicYearLevel) || '—'}</td>
                            <td>{typeof s.cgpa === 'number' ? s.cgpa.toFixed(2) : s.cgpa || '—'}</td>
                            <td>{typeof s.attendance === 'number' ? `${s.attendance}%` : s.attendance || '—'}</td>
                            <td><Badge variant={s.membershipStatus === 'Active' ? 'success' : 'warning'}>{s.membershipStatus}</Badge></td>
                            <td style={{ textAlign: 'right' }}>
                              <Button variant="outline" size="sm" href={`/dashboard/admin/students/${s.id}`}>View</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={Users} title="No students found" description="Try adjusting your search or filters." />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === 'teachers' && (
        <div className="ui-flex-col" style={{ gap: 20 }}>
          <div className="ui-card">
            <div className="ui-card__body">
              <div className="ui-flex ui-flex-gap-3 ui-flex-wrap" style={{ alignItems: 'center' }}>
                <div className="ui-input-row ui-flex-1" style={{ minWidth: 240 }}>
                  <span className="ui-input-icon"><Search size={16} /></span>
                  <input
                    className="ui-input ui-input--icon"
                    type="text"
                    placeholder="Search by name, email, or employee ID…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select className="ui-select" style={{ width: 'auto' }} value={filters.designation} onChange={(e) => setFilters({ ...filters, designation: e.target.value })}>
                  <option value="">All Designations</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate_Professor">Associate Professor</option>
                  <option value="Assistant_Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
                <Button variant="primary" leftIcon={UserPlus} href="/dashboard/admin/teachers/new">Add Teacher</Button>
              </div>
            </div>
          </div>

          {teachersLoading ? (
            <div className="ui-flex-center" style={{ padding: 48 }}><Spinner size="lg" label="Loading teachers…" /></div>
          ) : (
            <div className="ui-card">
              <div className="ui-card__body ui-card__body--flush">
                {teachers && teachers.length > 0 ? (
                  <div className="ui-table--scroll">
                    <table className="ui-table">
                      <thead>
                        <tr>
                          <th>Teacher</th>
                          <th>Employee ID</th>
                          <th>Designation</th>
                          <th>Department</th>
                          <th>Publications</th>
                          <th>Courses</th>
                          <th>Club Roles</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.map((t) => (
                          <tr key={t.id}>
                            <td><PersonCell name={t.name} email={t.email} src={t.avatarUrl} /></td>
                            <td>{t.employeeId}</td>
                            <td>{clean(t.designation) || '—'}</td>
                            <td className="ui-text-sm">{t.department}</td>
                            <td>{t.totalPublications}</td>
                            <td>{t.totalCourses}</td>
                            <td>
                              {t.clubRoles && t.clubRoles.length > 0 ? (
                                <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
                                  {t.clubRoles.map((role, i) => (
                                    <Badge key={i} variant="primary">{clean(role) || 'Unknown'}</Badge>
                                  ))}
                                </div>
                              ) : '—'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Button variant="outline" size="sm" href={`/dashboard/admin/teachers/${t.id}`}>View</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={GraduationCap} title="No teachers found" description="Try adjusting your search or filters." />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alumni Tab */}
      {activeTab === 'alumni' && (
        <div className="ui-flex-col" style={{ gap: 20 }}>
          <div className="ui-card">
            <div className="ui-card__body">
              <div className="ui-flex ui-flex-gap-3 ui-flex-wrap" style={{ alignItems: 'center' }}>
                <div className="ui-input-row ui-flex-1" style={{ minWidth: 240 }}>
                  <span className="ui-input-icon"><Search size={16} /></span>
                  <input
                    className="ui-input ui-input--icon"
                    type="text"
                    placeholder="Search alumni…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select className="ui-select" style={{ width: 'auto' }} value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })}>
                  <option value="">All Batches</option>
                  {[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020].map((b) => (
                    <option key={b} value={b}>Batch {b}</option>
                  ))}
                </select>
                <select className="ui-select" style={{ width: 'auto' }} value={filters.employmentStatus} onChange={(e) => setFilters({ ...filters, employmentStatus: e.target.value })}>
                  <option value="">All Employment Status</option>
                  <option value="Employed">Employed</option>
                  <option value="Self_Employed">Self Employed</option>
                  <option value="Higher_Studies">Higher Studies</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>
            </div>
          </div>

          {alumniLoading ? (
            <div className="ui-flex-center" style={{ padding: 48 }}><Spinner size="lg" label="Loading alumni…" /></div>
          ) : (
            <div className="ui-card">
              <div className="ui-card__body ui-card__body--flush">
                {alumni && alumni.length > 0 ? (
                  <div className="ui-table--scroll">
                    <table className="ui-table">
                      <thead>
                        <tr>
                          <th>Alumni</th>
                          <th>Student ID</th>
                          <th>Batch</th>
                          <th>Graduated</th>
                          <th>Current Position</th>
                          <th>Company</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumni.map((a) => (
                          <tr key={a.id}>
                            <td><PersonCell name={a.name} email={a.email} src={a.avatarUrl} /></td>
                            <td>{a.studentId}</td>
                            <td>{a.batch}</td>
                            <td>{a.graduatedYear || '—'}</td>
                            <td>{a.currentPosition || '—'}</td>
                            <td>{a.currentEmployer || '—'}</td>
                            <td>
                              <Badge variant={a.employmentStatus === 'Employed' ? 'success' : 'neutral'}>
                                {clean(a.employmentStatus) || 'Not Disclosed'}
                              </Badge>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Button variant="outline" size="sm" href={`/dashboard/admin/alumni/${a.id}`}>View</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={Award} title="No alumni found" description="Try adjusting your search or filters." />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="ui-card">
          <div className="ui-card__body">
            <EmptyState
              icon={UserCheck}
              title="Role Management"
              description="Assign and revoke system roles for any user from the dedicated management console."
              action={<Button variant="primary" leftIcon={Shield} href="/dashboard/admin/roles">Open Role Manager</Button>}
            />
          </div>
        </div>
      )}
    </div>
  );
}
