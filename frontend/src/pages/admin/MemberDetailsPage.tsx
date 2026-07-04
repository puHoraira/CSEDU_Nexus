import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../auth/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import YearBadge from '../../components/common/YearBadge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

interface MemberDetails {
  _id: string;
  studentId: string;
  user: {
    fullName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    profileCompleteness: number;
  };
  batch: number;
  currentYear: number;
  academicYearLevel: string;
  session: string;
  membershipStatus: {
    status: string;
    joinDate: Date;
  };
  academicRecord: {
    currentCgpa: number;
    totalCreditsCompleted: number;
    totalCreditsRequired: number;
  };
  attendanceRecord: {
    overallAttendancePercentage: number;
  };
  electionEligibility: {
    isEligibleForVoting: boolean;
    isEligibleForCandidacy: boolean;
  };
  ecExperience: Array<any>;
  clubParticipation: {
    eventsParticipated: number;
    eventsOrganized: number;
    volunteerHours: number;
  };
  alumniInfo?: {
    graduatedYear: number;
    currentEmployer: string;
    currentPosition: string;
    industry: string;
    linkedinUrl: string;
  };
  leadershipScore: number;
  alumniProfileCompleteness: number;
}

const MemberDetailsPage: React.FC = () => {
  const { token } = useAuth();
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMemberDetails();
  }, [memberId]);

  const fetchMemberDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMember(response.data.data);
    } catch (error) {
      console.error('Error fetching member details:', error);
      alert('Failed to load member details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-xl text-gray-600">Member not found</p>
          <button
            onClick={() => navigate('/admin/members')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Members
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/members')}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
        >
          ← Back to Members
        </button>
        <h1 className="text-3xl font-bold">Member Details</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            {member.user.avatarUrl ? (
              <img
                src={member.user.avatarUrl}
                alt={member.user.fullName}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-3xl text-gray-500">
                  {member.user.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{member.user.fullName}</h2>
            <p className="text-gray-600 mb-2">Student ID: {member.studentId}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <YearBadge yearLevel={member.academicYearLevel} />
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  member.membershipStatus.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : member.membershipStatus.status === 'Graduated'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {member.membershipStatus.status}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{member.user.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone</p>
                <p className="font-medium">{member.user.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Batch</p>
                <p className="font-medium">{member.batch}</p>
              </div>
              <div>
                <p className="text-gray-600">Session</p>
                <p className="font-medium">{member.session || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['overview', 'academic', 'participation', 'alumni'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Academic Performance</h3>
                <p className="text-3xl font-bold">{member.academicRecord?.currentCgpa?.toFixed(2) || 'N/A'}</p>
                <p className="text-sm text-gray-600">CGPA</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Attendance</h3>
                <p className="text-3xl font-bold">
                  {member.attendanceRecord?.overallAttendancePercentage?.toFixed(1) || '0'}%
                </p>
                <p className="text-sm text-gray-600">Overall Attendance</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Leadership Score</h3>
                <p className="text-3xl font-bold">{member.leadershipScore || 0}</p>
                <p className="text-sm text-gray-600">Out of 100</p>
              </div>
            </div>
          )}

          {/* Academic Tab */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Credits Progress</h4>
                  <p className="text-sm text-gray-600">
                    Completed: {member.academicRecord?.totalCreditsCompleted || 0} /{' '}
                    {member.academicRecord?.totalCreditsRequired || 160}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${
                          ((member.academicRecord?.totalCreditsCompleted || 0) /
                            (member.academicRecord?.totalCreditsRequired || 160)) *
                          100
                        }%`
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Election Eligibility</h4>
                  <p className="text-sm">
                    <span
                      className={`font-semibold ${
                        member.electionEligibility?.isEligibleForVoting ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {member.electionEligibility?.isEligibleForVoting ? '✓' : '✗'}
                    </span>{' '}
                    Eligible for Voting
                  </p>
                  <p className="text-sm">
                    <span
                      className={`font-semibold ${
                        member.electionEligibility?.isEligibleForCandidacy ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {member.electionEligibility?.isEligibleForCandidacy ? '✓' : '✗'}
                    </span>{' '}
                    Eligible for Candidacy
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Participation Tab */}
          {activeTab === 'participation' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Events Participated</p>
                <p className="text-3xl font-bold">{member.clubParticipation?.eventsParticipated || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Events Organized</p>
                <p className="text-3xl font-bold">{member.clubParticipation?.eventsOrganized || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Volunteer Hours</p>
                <p className="text-3xl font-bold">{member.clubParticipation?.volunteerHours || 0}</p>
              </div>
              {member.ecExperience && member.ecExperience.length > 0 && (
                <div className="md:col-span-3 mt-4">
                  <h4 className="font-medium text-gray-700 mb-3">EC Experience</h4>
                  <div className="space-y-2">
                    {member.ecExperience.map((exp: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <p className="font-medium">{exp.postName}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(exp.startDate).getFullYear()} -{' '}
                          {exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alumni Tab */}
          {activeTab === 'alumni' && (
            <div>
              {member.membershipStatus.status === 'Graduated' && member.alumniInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Graduated Year</p>
                      <p className="font-medium">{member.alumniInfo.graduatedYear}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Employer</p>
                      <p className="font-medium">{member.alumniInfo.currentEmployer || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Position</p>
                      <p className="font-medium">{member.alumniInfo.currentPosition || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Industry</p>
                      <p className="font-medium">{member.alumniInfo.industry || 'Not specified'}</p>
                    </div>
                  </div>
                  {member.alumniInfo.linkedinUrl && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">LinkedIn Profile</p>
                      <a
                        href={member.alumniInfo.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {member.alumniInfo.linkedinUrl}
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Alumni Profile Completeness</p>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-purple-600 h-3 rounded-full flex items-center justify-center text-xs text-white"
                        style={{ width: `${member.alumniProfileCompleteness}%` }}
                      >
                        {member.alumniProfileCompleteness}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Not an alumni member</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetailsPage;
