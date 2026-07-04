import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../auth/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

interface EcMember {
  appointmentId: string;
  post: {
    code: string;
    title: string;
    displayOrder: number;
  };
  member: {
    memberId: string;
    studentId: string;
    batch: number;
    currentYear: number;
    academicYearLevel: string;
    fullName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
  };
  startsOn: Date;
  endsOn?: Date;
  source: string;
  isCurrent?: boolean;
}

interface EcTerm {
  _id: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  status: string;
  memberCount?: number;
}

interface Statistics {
  overview: {
    totalTerms: number;
    activeTermCount: number;
    currentEcMemberCount: number;
    totalHistoricalAppointments: number;
    uniqueEcMembersAllTime: number;
  };
  postWiseDistribution: Array<{
    postTitle: string;
    count: number;
  }>;
}

const EcMembersPage: React.FC = () => {
  const { token } = useAuth();
  const [view, setView] = useState<'current' | 'past' | 'history'>('current');
  const [currentMembers, setCurrentMembers] = useState<EcMember[]>([]);
  const [currentTerm, setCurrentTerm] = useState<EcTerm | null>(null);
  const [allTerms, setAllTerms] = useState<EcTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [termMembers, setTermMembers] = useState<EcMember[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrentMembers();
    fetchAllTerms();
    fetchStatistics();
  }, []);

  useEffect(() => {
    if (selectedTerm) {
      fetchTermMembers(selectedTerm);
    }
  }, [selectedTerm]);

  const fetchCurrentMembers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/ec-members/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentMembers(response.data.data.members || []);
      setCurrentTerm(response.data.data.term);
    } catch (error) {
      console.error('Error fetching current EC members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTerms = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ec-members/terms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllTerms(response.data.data || []);
    } catch (error) {
      console.error('Error fetching EC terms:', error);
    }
  };

  const fetchTermMembers = async (termId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/ec-members/term/${termId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTermMembers(response.data.data.members || []);
    } catch (error) {
      console.error('Error fetching term members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ec-members/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const renderMemberCard = (ecMember: EcMember) => (
    <div key={ecMember.appointmentId} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {ecMember.member.avatarUrl ? (
            <img
              src={ecMember.member.avatarUrl}
              alt={ecMember.member.fullName}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {ecMember.member.fullName?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{ecMember.member.fullName}</h3>
          <p className="text-lg font-semibold text-blue-600 mb-2">{ecMember.post.title}</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Student ID: {ecMember.member.studentId}</p>
            <p>Batch: {ecMember.member.batch}</p>
            <p>Email: {ecMember.member.email}</p>
            {ecMember.member.phone && <p>Phone: {ecMember.member.phone}</p>}
            <p className="text-xs text-gray-500 mt-2">
              Appointed: {new Date(ecMember.startsOn).toLocaleDateString()}
              {ecMember.source && ` • Source: ${ecMember.source}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Executive Committee</h1>
        <p className="text-gray-600">View current and past EC members</p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-4">
            <p className="text-sm opacity-90">Current EC Members</p>
            <p className="text-3xl font-bold">{statistics.overview.currentEcMemberCount}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-4">
            <p className="text-sm opacity-90">Total Terms</p>
            <p className="text-3xl font-bold">{statistics.overview.totalTerms}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-4">
            <p className="text-sm opacity-90">All-Time EC Members</p>
            <p className="text-3xl font-bold">{statistics.overview.uniqueEcMembersAllTime}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-md p-4">
            <p className="text-sm opacity-90">Total Appointments</p>
            <p className="text-3xl font-bold">{statistics.overview.totalHistoricalAppointments}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-md p-4">
            <p className="text-sm opacity-90">Active Terms</p>
            <p className="text-3xl font-bold">{statistics.overview.activeTermCount}</p>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setView('current')}
              className={`px-6 py-3 text-sm font-medium ${
                view === 'current'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Current EC Members
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-6 py-3 text-sm font-medium ${
                view === 'history'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              EC History (By Term)
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Current EC Members View */}
              {view === 'current' && (
                <div>
                  {currentTerm && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">{currentTerm.name}</h2>
                      <p className="text-sm text-gray-600">
                        {new Date(currentTerm.startsOn).toLocaleDateString()} - {new Date(currentTerm.endsOn).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {currentMembers.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No active EC members found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentMembers.map(renderMemberCard)}
                    </div>
                  )}
                </div>
              )}

              {/* EC History View */}
              {view === 'history' && (
                <div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select EC Term</label>
                    <select
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                      className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select a term --</option>
                      {allTerms.map((term) => (
                        <option key={term._id} value={term._id}>
                          {term.name} ({term.status}) - {term.memberCount || 0} members
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTerm && termMembers.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {termMembers.map(renderMemberCard)}
                    </div>
                  )}

                  {selectedTerm && termMembers.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No members found for this term</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EcMembersPage;
