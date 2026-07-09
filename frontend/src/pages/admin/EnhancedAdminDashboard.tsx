import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, Award, Shield, Search, Filter } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

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

export function EnhancedAdminDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    batch: '',
    year: '',
    status: '',
    designation: '',
    employmentStatus: ''
  });

  // Fetch statistics
  const { data: studentStats } = useQuery({
    queryKey: ['admin-student-stats', token],
    queryFn: () => apiRequest<Stats>('/admin/students/stats', { token }),
    enabled: Boolean(token)
  });

  const { data: teacherStats } = useQuery({
    queryKey: ['admin-teacher-stats', token],
    queryFn: () => apiRequest<Stats>('/admin/teachers/stats', { token }),
    enabled: Boolean(token)
  });

  // Fetch students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-students', searchQuery, filters.batch, filters.year, filters.status, token],
    queryFn: () => apiRequest<Student[]>('/admin/students', { 
      token,
      query: { 
        search: searchQuery,
        batch: filters.batch,
        year: filters.year,
        status: filters.status
      }
    }),
    enabled: activeTab === 'students' && Boolean(token)
  });

  // Fetch teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['admin-teachers', searchQuery, filters.designation, token],
    queryFn: () => apiRequest<Teacher[]>('/admin/teachers', { 
      token,
      query: { 
        search: searchQuery,
        designation: filters.designation
      }
    }),
    enabled: activeTab === 'teachers' && Boolean(token)
  });

  // Fetch alumni
  const { data: alumni, isLoading: alumniLoading } = useQuery({
    queryKey: ['admin-alumni', searchQuery, filters.batch, filters.employmentStatus, token],
    queryFn: () => apiRequest<Alumni[]>('/admin/alumni', { 
      token,
      query: { 
        search: searchQuery,
        batch: filters.batch,
        employmentStatus: filters.employmentStatus
      }
    }),
    enabled: activeTab === 'alumni' && Boolean(token)
  });

  const totalStudents = studentStats?.totalStudents?.[0]?.count || 0;
  const totalTeachers = teacherStats?.totalTeachers?.[0]?.count || 0;
  const activeStudents = studentStats?.activeMembers?.[0]?.count || 0;
  const activeTeachersCount = teacherStats?.activeTeachers?.[0]?.count || 0;

  return (
    <div className="ui-page">
      <PageHeader
        title="Admin Dashboard"
        description="Manage students, teachers, alumni, and system roles"
        backButton
      />

      {/* Tabs */}
      <div className="ui-tabs" style={{ marginBottom: 24 }}>
        <button
          className={`ui-tab ${activeTab === 'overview' ? 'ui-tab--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`ui-tab ${activeTab === 'students' ? 'ui-tab--active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <Users size={16} />
          Students ({totalStudents})
        </button>
        <button
          className={`ui-tab ${activeTab === 'teachers' ? 'ui-tab--active' : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          <GraduationCap size={16} />
          Teachers ({totalTeachers})
        </button>
        <button
          className={`ui-tab ${activeTab === 'alumni' ? 'ui-tab--active' : ''}`}
          onClick={() => setActiveTab('alumni')}
        >
          <Award size={16} />
          Alumni
        </button>
        <button
          className={`ui-tab ${activeTab === 'roles' ? 'ui-tab--active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <Shield size={16} />
          Roles
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid-3" style={{ marginBottom: 24, gap: 16 }}>
            <div className="ui-card">
              <div className="ui-card__body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Users size={24} style={{ color: '#3b82f6' }} />
                  <span className="ui-text-muted">Total Students</span>
                </div>
                <div className="ui-text-2xl ui-font-bold">{totalStudents}</div>
                <div className="ui-text-sm ui-text-muted">Active: {activeStudents}</div>
              </div>
            </div>

            <div className="ui-card">
              <div className="ui-card__body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <GraduationCap size={24} style={{ color: '#10b981' }} />
                  <span className="ui-text-muted">Total Teachers</span>
                </div>
                <div className="ui-text-2xl ui-font-bold">{totalTeachers}</div>
                <div className="ui-text-sm ui-text-muted">Active: {activeTeachersCount}</div>
              </div>
            </div>

            <div className="ui-card">
              <div className="ui-card__body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Award size={24} style={{ color: '#f59e0b' }} />
                  <span className="ui-text-muted">Alumni</span>
                </div>
                <div className="ui-text-2xl ui-font-bold">--</div>
                <div className="ui-text-sm ui-text-muted">Graduated</div>
              </div>
            </div>
          </div>

          {/* Students by Year */}
          <div className="ui-card" style={{ marginBottom: 24 }}>
            <div className="ui-card__header">
              <h3>Students by Year Level</h3>
            </div>
            <div className="ui-card__body">
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {studentStats?.byYear?.map((item) => (
                  <div key={item._id} style={{ flex: '1 1 150px', textAlign: 'center', padding: '12px', background: '#f3f4f6', borderRadius: 8 }}>
                    <div className="ui-text-sm ui-text-muted">{item._id.replace('_', ' ')}</div>
                    <div className="ui-text-xl ui-font-bold">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Teachers by Designation */}
          <div className="ui-card">
            <div className="ui-card__header">
              <h3>Teachers by Designation</h3>
            </div>
            <div className="ui-card__body">
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {teacherStats?.byDesignation?.map((item) => (
                  <div key={item._id} style={{ flex: '1 1 150px', textAlign: 'center', padding: '12px', background: '#f3f4f6', borderRadius: 8 }}>
                    <div className="ui-text-sm ui-text-muted">{item._id.replace('_', ' ')}</div>
                    <div className="ui-text-xl ui-font-bold">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div>
          {/* Search and Filters */}
          <div className="ui-card" style={{ marginBottom: 24 }}>
            <div className="ui-card__body">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search by name, email, or student ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', paddingLeft: 40 }}
                  />
                </div>
                <select value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })}>
                  <option value="">All Batches</option>
                  {[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].map(batch => (
                    <option key={batch} value={batch}>Batch {batch}</option>
                  ))}
                </select>
                <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
                  <option value="">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">Masters</option>
                </select>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Students Table */}
          {studentsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="ui-card">
              <div className="ui-card__body" style={{ padding: 0 }}>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students?.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {student.avatarUrl ? (
                              <img src={student.avatarUrl} alt={student.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                {student.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="ui-font-medium">{student.name}</div>
                              <div className="ui-text-sm ui-text-muted">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{student.studentId}</td>
                        <td>{student.batch}</td>
                        <td>{student.academicYearLevel.replace('_', ' ')}</td>
                        <td>{typeof student.cgpa === 'number' ? student.cgpa.toFixed(2) : student.cgpa}</td>
                        <td>{typeof student.attendance === 'number' ? `${student.attendance}%` : student.attendance}</td>
                        <td><Badge variant={student.membershipStatus === 'Active' ? 'success' : 'warning'}>{student.membershipStatus}</Badge></td>
                        <td>
                          <Button variant="outline" size="sm" href={`/dashboard/admin/students/${student.id}`}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === 'teachers' && (
        <div>
          {/* Search and Filters */}
          <div className="ui-card" style={{ marginBottom: 24 }}>
            <div className="ui-card__body">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search by name, email, or employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', paddingLeft: 40 }}
                  />
                </div>
                <select value={filters.designation} onChange={(e) => setFilters({ ...filters, designation: e.target.value })}>
                  <option value="">All Designations</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate_Professor">Associate Professor</option>
                  <option value="Assistant_Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
                <Button variant="primary" leftIcon={Users} href="/dashboard/admin/teachers/new">Add Teacher</Button>
              </div>
            </div>
          </div>

          {/* Teachers Table */}
          {teachersLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="ui-card">
              <div className="ui-card__body" style={{ padding: 0 }}>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers?.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {teacher.avatarUrl ? (
                              <img src={teacher.avatarUrl} alt={teacher.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                {teacher.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="ui-font-medium">{teacher.name}</div>
                              <div className="ui-text-sm ui-text-muted">{teacher.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{teacher.employeeId}</td>
                        <td>{teacher.designation.replace('_', ' ')}</td>
                        <td className="ui-text-sm">{teacher.department}</td>
                        <td>{teacher.totalPublications}</td>
                        <td>{teacher.totalCourses}</td>
                        <td>
                          {teacher.clubRoles.length > 0 ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {teacher.clubRoles.map((role, i) => (
                                <Badge key={i} variant="primary">{role.replace('_', ' ')}</Badge>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          <Button variant="outline" size="sm" href={`/dashboard/admin/teachers/${teacher.id}`}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alumni Tab */}
      {activeTab === 'alumni' && (
        <div>
          {/* Search and Filters */}
          <div className="ui-card" style={{ marginBottom: 24 }}>
            <div className="ui-card__body">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search alumni..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', paddingLeft: 40 }}
                  />
                </div>
                <select value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })}>
                  <option value="">All Batches</option>
                  {[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020].map(batch => (
                    <option key={batch} value={batch}>Batch {batch}</option>
                  ))}
                </select>
                <select value={filters.employmentStatus} onChange={(e) => setFilters({ ...filters, employmentStatus: e.target.value })}>
                  <option value="">All Employment Status</option>
                  <option value="Employed">Employed</option>
                  <option value="Self_Employed">Self Employed</option>
                  <option value="Higher_Studies">Higher Studies</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alumni Table */}
          {alumniLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="ui-card">
              <div className="ui-card__body" style={{ padding: 0 }}>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumni?.map((alum) => (
                      <tr key={alum.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {alum.avatarUrl ? (
                              <img src={alum.avatarUrl} alt={alum.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                {alum.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="ui-font-medium">{alum.name}</div>
                              <div className="ui-text-sm ui-text-muted">{alum.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{alum.studentId}</td>
                        <td>{alum.batch}</td>
                        <td>{alum.graduatedYear || '-'}</td>
                        <td>{alum.currentPosition || '-'}</td>
                        <td>{alum.currentEmployer || '-'}</td>
                        <td>
                          <Badge variant={alum.employmentStatus === 'Employed' ? 'success' : 'neutral'}>
                            {alum.employmentStatus?.replace('_', ' ') || 'Not Disclosed'}
                          </Badge>
                        </td>
                        <td>
                          <Button variant="outline" size="sm" href={`/dashboard/admin/alumni/${alum.id}`}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab - Keep existing AdminRoleManagementPage component */}
      {activeTab === 'roles' && (
        <div className="ui-card">
          <div className="ui-card__body">
            <p className="ui-text-muted">Role management moved to separate page.</p>
            <Button variant="primary" href="/dashboard/admin/roles">Manage Roles</Button>
          </div>
        </div>
      )}
    </div>
  );
}
