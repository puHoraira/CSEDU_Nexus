import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../auth/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

interface Student {
  memberId: string;
  studentId: string;
  fullName: string;
  email: string;
  currentYearLevel: string;
  batch: number;
  cgpa: number;
  isRetained: boolean;
  retentionReason?: string;
  willBePromoted: boolean;
}

interface PromotionPreview {
  fromYearLevel: string;
  toYearLevel: string;
  totalStudents: number;
  eligibleForPromotion: number;
  retainedStudents: number;
  students: Student[];
  academicYear: string;
}

interface YearStats {
  yearLevel: string;
  totalStudents: number;
  retainedStudents: number;
  eligibleForPromotion: number;
  averageCgpa: string;
  averageAttendance: string;
}

const YearPromotionPage: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<YearStats[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [notes, setNotes] = useState('');
  const [excludeRetained, setExcludeRetained] = useState(true);

  const yearLevels = [
    { value: 'First_Year', label: '1st Year' },
    { value: 'Second_Year', label: '2nd Year' },
    { value: 'Third_Year', label: '3rd Year' },
    { value: 'Fourth_Year', label: '4th Year' },
    { value: 'Masters', label: 'Masters' }
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/year-promotion/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPreview = async (yearLevel: string) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/year-promotion/preview/${yearLevel}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreview(response.data.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      alert('Failed to load promotion preview');
    } finally {
      setLoading(false);
    }
  };

  const handleYearSelect = (yearLevel: string) => {
    setSelectedYear(yearLevel);
    setPreview(null);
    if (yearLevel) {
      fetchPreview(yearLevel);
    }
  };

  const handleBulkPromotion = async () => {
    if (!selectedYear || !preview) return;

    const confirmed = window.confirm(
      `Are you sure you want to promote ${preview.eligibleForPromotion} students from ${preview.fromYearLevel} to ${preview.toYearLevel}?`
    );

    if (!confirmed) return;

    setPromoting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/year-promotion/bulk-promote`,
        {
          yearLevel: selectedYear,
          excludeRetained,
          notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = response.data.data;
      alert(
        `Promotion completed!\n\nSuccessfully promoted: ${result.successCount}\nFailed: ${result.failedCount}`
      );

      // Refresh data
      setNotes('');
      fetchStats();
      if (selectedYear) {
        fetchPreview(selectedYear);
      }
    } catch (error: any) {
      console.error('Error promoting students:', error);
      alert(error.response?.data?.message || 'Failed to promote students');
    } finally {
      setPromoting(false);
    }
  };

  const handleIndividualPromotion = async (memberId: string, studentName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to promote ${studentName} individually?`
    );

    if (!confirmed) return;

    try {
      await axios.post(
        `${API_BASE_URL}/year-promotion/promote/${memberId}`,
        { notes: 'Individual promotion' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`${studentName} promoted successfully`);
      fetchStats();
      if (selectedYear) {
        fetchPreview(selectedYear);
      }
    } catch (error: any) {
      console.error('Error promoting student:', error);
      alert(error.response?.data?.message || 'Failed to promote student');
    }
  };

  const handleRetainStudent = async (memberId: string, studentName: string) => {
    const reason = window.prompt(
      `Enter reason for retaining ${studentName}:`,
      'Failed to meet academic requirements'
    );

    if (!reason) return;

    try {
      await axios.post(
        `${API_BASE_URL}/year-promotion/retain/${memberId}`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`${studentName} marked as retained`);
      fetchStats();
      if (selectedYear) {
        fetchPreview(selectedYear);
      }
    } catch (error: any) {
      console.error('Error retaining student:', error);
      alert(error.response?.data?.message || 'Failed to retain student');
    }
  };

  const handleClearRetention = async (memberId: string, studentName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to clear retention status for ${studentName}?`
    );

    if (!confirmed) return;

    try {
      await axios.post(
        `${API_BASE_URL}/year-promotion/clear-retention/${memberId}`,
        { reason: 'Cleared by admin' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Retention status cleared for ${studentName}`);
      fetchStats();
      if (selectedYear) {
        fetchPreview(selectedYear);
      }
    } catch (error: any) {
      console.error('Error clearing retention:', error);
      alert(error.response?.data?.message || 'Failed to clear retention');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Year Promotion Management</h1>

      {/* Year-wise Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Year-wise Statistics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retained</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eligible for Promotion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg CGPA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Attendance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.map((stat) => (
                <tr key={stat.yearLevel}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {stat.yearLevel.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{stat.totalStudents}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-red-600 font-semibold">{stat.retainedStudents}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-green-600 font-semibold">{stat.eligibleForPromotion}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{stat.averageCgpa}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{stat.averageAttendance}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year Selection and Promotion */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Bulk Year Promotion</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Year to Promote
          </label>
          <select
            value={selectedYear}
            onChange={(e) => handleYearSelect(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Year --</option>
            {yearLevels.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading preview...</p>
          </div>
        )}

        {preview && (
          <div className="mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-lg mb-2">Promotion Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-semibold">{preview.fromYearLevel.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To</p>
                  <p className="font-semibold">{preview.toYearLevel.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="font-semibold">{preview.totalStudents}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Will Be Promoted</p>
                  <p className="font-semibold text-green-600">{preview.eligibleForPromotion}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promotion Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any notes for this promotion..."
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excludeRetained}
                  onChange={(e) => setExcludeRetained(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Exclude retained students (recommended)
                </span>
              </label>
            </div>

            <button
              onClick={handleBulkPromotion}
              disabled={promoting || preview.eligibleForPromotion === 0}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {promoting ? 'Promoting...' : `Promote ${preview.eligibleForPromotion} Students`}
            </button>

            {/* Student List */}
            <div className="mt-6">
              <h3 className="font-semibold text-lg mb-3">Student List</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CGPA</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.students.map((student) => (
                      <tr key={student.memberId} className={student.isRetained ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{student.studentId}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{student.fullName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{student.batch}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{student.cgpa?.toFixed(2) || 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {student.isRetained ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Retained
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Eligible
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                          {student.isRetained ? (
                            <button
                              onClick={() => handleClearRetention(student.memberId, student.fullName)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Clear
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleIndividualPromotion(student.memberId, student.fullName)}
                                className="text-green-600 hover:text-green-800 text-xs"
                              >
                                Promote
                              </button>
                              <button
                                onClick={() => handleRetainStudent(student.memberId, student.fullName)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Retain
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YearPromotionPage;
