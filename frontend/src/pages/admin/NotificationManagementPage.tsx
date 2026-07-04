import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../auth/AuthContext';
import YearFilterSelector from '../../components/common/YearFilterSelector';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

interface Member {
  memberId: string;
  studentId: string;
  fullName: string;
  email: string;
}

interface NotificationPreview {
  targetType: string;
  totalRecipients: number;
  details: any;
}

const NotificationManagementPage: React.FC = () => {
  const { token } = useAuth();
  const [notificationType, setNotificationType] = useState<string>('general');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Announcement');
  const [priority, setPriority] = useState('Normal');
  const [actionUrl, setActionUrl] = useState('');
  const [targetYears, setTargetYears] = useState<string[]>(['All_Years']);
  const [targetMembers, setTargetMembers] = useState<string[]>([]);
  const [recipientUserId, setRecipientUserId] = useState('');
  const [preview, setPreview] = useState<NotificationPreview | null>(null);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);

  const notificationTypes = [
    { value: 'general', label: 'General (All Active Members)' },
    { value: 'year-wise', label: 'Year-Wise (Specific Years)' },
    { value: 'members', label: 'Member-Specific (Selected Members)' },
    { value: 'individual', label: 'Individual (Single User)' }
  ];

  const categories = ['System', 'Meeting', 'Membership', 'Governance', 'Certificate', 'Event', 'General', 'Announcement'];
  const priorities = ['Low', 'Normal', 'High', 'Urgent'];

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchMembers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchMembers = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/members/search/${searchTerm}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  const addMember = (member: Member) => {
    if (!selectedMembers.find(m => m.memberId === member.memberId)) {
      setSelectedMembers([...selectedMembers, member]);
      setTargetMembers([...targetMembers, member.memberId]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.memberId !== memberId));
    setTargetMembers(targetMembers.filter(id => id !== memberId));
  };

  const getPreview = async () => {
    try {
      const targetData: any = {};

      if (notificationType === 'year-wise') {
        targetData.targetYears = targetYears;
      } else if (notificationType === 'members') {
        targetData.targetMembers = targetMembers;
      }

      const response = await axios.post(
        `${API_BASE_URL}/notifications/preview`,
        { targetType: getTargetType(), targetData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPreview(response.data.data);
    } catch (error: any) {
      console.error('Error getting preview:', error);
      alert(error.response?.data?.message || 'Failed to get preview');
    }
  };

  const getTargetType = () => {
    switch (notificationType) {
      case 'general': return 'General';
      case 'year-wise': return 'Year_Wise';
      case 'members': return 'Custom_Group';
      case 'individual': return 'Individual';
      default: return 'General';
    }
  };

  const sendNotification = async () => {
    if (!title || !message) {
      alert('Title and message are required');
      return;
    }

    if (notificationType === 'year-wise' && targetYears.length === 0) {
      alert('Please select at least one year level');
      return;
    }

    if (notificationType === 'members' && targetMembers.length === 0) {
      alert('Please select at least one member');
      return;
    }

    if (notificationType === 'individual' && !recipientUserId) {
      alert('Please enter recipient user ID');
      return;
    }

    setSending(true);

    try {
      let endpoint = '';
      let payload: any = {
        title,
        message,
        category,
        priority,
        actionUrl
      };

      switch (notificationType) {
        case 'general':
          endpoint = '/notifications/send/general';
          break;
        case 'year-wise':
          endpoint = '/notifications/send/year-wise';
          payload.targetYears = targetYears;
          break;
        case 'members':
          endpoint = '/notifications/send/members';
          payload.targetMembers = targetMembers;
          break;
        case 'individual':
          endpoint = '/notifications/send/individual';
          payload.recipientUserId = recipientUserId;
          break;
      }

      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(response.data.message || 'Notification sent successfully');
      
      // Reset form
      setTitle('');
      setMessage('');
      setActionUrl('');
      setTargetYears(['All_Years']);
      setTargetMembers([]);
      setSelectedMembers([]);
      setRecipientUserId('');
      setPreview(null);
    } catch (error: any) {
      console.error('Error sending notification:', error);
      alert(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Send Notifications</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Notification Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {notificationTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setNotificationType(type.value);
                  setPreview(null);
                }}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  notificationType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notification title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notification message"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {priorities.map((pri) => (
                  <option key={pri} value={pri}>{pri}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action URL (Optional)</label>
              <input
                type="text"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/events/123"
              />
            </div>
          </div>
        </div>

        {/* Year-Wise Selection */}
        {notificationType === 'year-wise' && (
          <div className="mb-6">
            <YearFilterSelector
              selectedYears={targetYears}
              onChange={setTargetYears}
              label="Target Year Levels"
              showAllYearsOption={false}
            />
          </div>
        )}

        {/* Member-Specific Selection */}
        {notificationType === 'members' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Members</label>
            
            {/* Search Box */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name, email, or student ID..."
              />
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((member) => (
                    <button
                      key={member.memberId}
                      onClick={() => addMember(member)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{member.fullName}</p>
                        <p className="text-sm text-gray-600">{member.studentId} • {member.email}</p>
                      </div>
                      <span className="text-blue-600 text-sm">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Selected Members ({selectedMembers.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <div
                      key={member.memberId}
                      className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
                    >
                      <span className="text-sm">{member.fullName}</span>
                      <button
                        onClick={() => removeMember(member.memberId)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Individual User ID */}
        {notificationType === 'individual' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipient User ID</label>
            <input
              type="text"
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter user ID"
            />
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold mb-2">Notification Preview</h3>
            <p className="text-sm text-gray-700">
              This notification will be sent to <span className="font-bold">{preview.totalRecipients}</span> recipient(s)
            </p>
            {preview.details.breakdown && (
              <div className="mt-2 text-sm">
                <p className="font-medium">Breakdown by year:</p>
                <ul className="ml-4 list-disc">
                  {preview.details.breakdown.map((item: any) => (
                    <li key={item.year}>{item.year.replace('_', ' ')}: {item.count} students</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={getPreview}
            disabled={!title || !message}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Preview Recipients
          </button>
          <button
            onClick={sendNotification}
            disabled={sending || !title || !message}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationManagementPage;
