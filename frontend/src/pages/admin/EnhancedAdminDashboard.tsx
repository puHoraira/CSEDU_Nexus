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
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.year) params.append('year', filters.year);
      if (filters.status) params.append('status', filters.status);
      
      const queryString = params.toString();
      const url = queryString ? `/admin/students?${queryString}` : '/admin/students';
      
      return apiRequest<Student[]>(url, { token });
    },
    enabled: activeTab === 'students' && Boolean(token)
  });

  // Fetch teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['admin-teachers', searchQuery, filters.designation, token],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.designation) params.append('designation', filters.designation);
      
      const queryString = params.toString();
      const url = queryString ? `/admin/teachers?${queryString}` : '/admin/teachers';
      
      return apiRequest<Teacher[]>(url, { token });
    },
    enabled: activeTab === 'teachers' && Boolean(token)
  });

  // Fetch alumni
  const { data: alumni, isLoading: alumniLoading } = useQuery({
    queryKey: ['admin-alumni', searchQuery, filters.batch, filters.employmentStatus, token],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.employmentStatus) params.append('employmentStatus', filters.employmentStatus);
      
      const queryString = params.toString();
      const url = queryString ? `/admin/alumni?${queryString}` : '/admin/alumni';
      
      return apiRequest<Alumni[]>(url, { token });
    },
    enabled: activeTab === 'alumni' && Boolean(token)
  });

  const totalStudents = studentStats?.totalStudents?.[0]?.count || 0;
  const totalTeachers = teacherStats?.totalTeachers?.[0]?.count || 0;
  const activeStudents = studentStats?.activeMembers?.[0]?.count || 0;
  const activeTeachersCount = teacherStats?.activeTeachers?.[0]?.count || 0;
  
  const studentsByYear = studentStats?.byYear || [];
  const teachersByDesignation = teacherStats?.byDesignation || [];

  return (
    <div className="ui-page" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)' }}>
            Manage students, teachers, alumni, and system roles
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          padding: '0.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'overview' ? 'white' : 'transparent',
              color: activeTab === 'overview' ? '#667eea' : 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'overview' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'students' ? 'white' : 'transparent',
              color: activeTab === 'students' ? '#667eea' : 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'students' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}
            onClick={() => setActiveTab('students')}
          >
            <Users size={18} />
            Students ({totalStudents})
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'teachers' ? 'white' : 'transparent',
              color: activeTab === 'teachers' ? '#667eea' : 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'teachers' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}
            onClick={() => setActiveTab('teachers')}
          >
            <GraduationCap size={18} />
            Teachers ({totalTeachers})
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'alumni' ? 'white' : 'transparent',
              color: activeTab === 'alumni' ? '#667eea' : 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'alumni' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}
            onClick={() => setActiveTab('alumni')}
          >
            <Award size={18} />
            Alumni
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'roles' ? 'white' : 'transparent',
              color: activeTab === 'roles' ? '#667eea' : 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'roles' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}
            onClick={() => setActiveTab('roles')}
          >
            <Shield size={18} />
            Roles
          </button>
        </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '2rem',
              color: 'white',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.2 }}>
                <Users size={120} />
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '500' }}>Total Students</div>
                <div style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '0.5rem' }}>{totalStudents}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  <span style={{ color: '#90EE90' }}>● </span>Active: {activeStudents}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '16px',
              padding: '2rem',
              color: 'white',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.2 }}>
                <GraduationCap size={120} />
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '500' }}>Total Teachers</div>
                <div style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '0.5rem' }}>{totalTeachers}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  <span style={{ color: '#90EE90' }}>● </span>Active: {activeTeachersCount}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '16px',
              padding: '2rem',
              color: 'white',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.2 }}>
                <Award size={120} />
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '500' }}>Alumni Network</div>
                <div style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '0.5rem' }}>--</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Graduated Students</div>
              </div>
            </div>
          </div>

          {/* Students by Year */}
          <div style={{ 
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', color: '#2d3748' }}>
              📊 Students by Year Level
            </h3>
            {studentsByYear.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {studentsByYear.map((item) => (
                  <div key={item._id} style={{ 
                    textAlign: 'center', 
                    padding: '1.5rem', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                      {item._id ? item._id.replace('_', ' ') : 'Unknown'}
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#a0aec0', textAlign: 'center', padding: '2rem' }}>No data available</p>
            )}
          </div>

          {/* Teachers by Designation */}
          <div style={{ 
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', color: '#2d3748' }}>
              👨‍🏫 Teachers by Designation
            </h3>
            {teachersByDesignation.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {teachersByDesignation.map((item) => (
                  <div key={item._id} style={{ 
                    textAlign: 'center', 
                    padding: '1.5rem', 
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '12px',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                      {item._id ? item._id.replace('_', ' ') : 'Unknown'}
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#a0aec0', textAlign: 'center', padding: '2rem' }}>No data available</p>
            )}
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
                {students && students.length > 0 ? (
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
                      {students.map((student) => (
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
                          <td>{student.academicYearLevel ? student.academicYearLevel.replace('_', ' ') : '-'}</td>
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
                ) : (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <p className="ui-text-muted">No students found</p>
                  </div>
                )}
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
                {teachers && teachers.length > 0 ? (
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
                      {teachers.map((teacher) => (
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
                          <td>{teacher.designation ? teacher.designation.replace('_', ' ') : '-'}</td>
                          <td className="ui-text-sm">{teacher.department}</td>
                          <td>{teacher.totalPublications}</td>
                          <td>{teacher.totalCourses}</td>
                          <td>
                            {teacher.clubRoles && teacher.clubRoles.length > 0 ? (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {teacher.clubRoles.map((role, i) => (
                                  <Badge key={i} variant="primary">{role ? role.replace('_', ' ') : 'Unknown'}</Badge>
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
                ) : (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <p className="ui-text-muted">No teachers found</p>
                  </div>
                )}
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
                {alumni && alumni.length > 0 ? (
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
                      {alumni.map((alum) => (
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
                ) : (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <p className="ui-text-muted">No alumni found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab - Keep existing AdminRoleManagementPage component */}
      {activeTab === 'roles' && (
        <div style={{ 
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#a0aec0', marginBottom: '1.5rem' }}>Role management moved to separate page.</p>
          <Button variant="primary" href="/dashboard/admin/roles">Manage Roles</Button>
        </div>
      )}
      </div>
    </div>
  );
}
