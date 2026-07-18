import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getUserProfile, type ApiUserProfile } from '../../lib/api';
import { 
  Mail, 
  MessageCircle, 
  Calendar, 
  MapPin, 
  Award, 
  Briefcase, 
  Users, 
  GraduationCap,
  Star,
  TrendingUp,
  Activity,
  Shield,
  X
} from 'lucide-react';
import './UserProfilePage.css';

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'experience' | 'activity'>('about');

  useEffect(() => {
    if (userId) {
      fetchUserProfile(userId);
    }
  }, [userId]);

  const fetchUserProfile = async (id: string) => {
    try {
      setLoading(true);
      const data = await getUserProfile(id);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = () => {
    if (profile && profile.privacySettings?.allowDirectMessages) {
      navigate(`/dashboard/chat/${profile._id}`);
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="user-profile-page">
        <div className="profile-error">
          <p>{error || 'Profile not found'}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?._id === profile._id;
  const canMessage = !isOwnProfile && profile.privacySettings.allowDirectMessages;
  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="user-profile-page">
      <div className="profile-container">
        <button className="profile-close-btn" onClick={handleClose}>
          <X size={24} />
        </button>

        {/* Header Section */}
        <div className="profile-header">
          <div className="profile-header-bg"></div>
          <div className="profile-header-content">
            <div className="profile-avatar-large">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={fullName} />
              ) : (
                <div className="avatar-placeholder">
                  {profile.firstName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-header-info">
              <h1>{fullName}</h1>
              <div className="profile-meta">
                {profile.member?.studentId && (
                  <span className="meta-item">
                    <GraduationCap size={16} />
                    {profile.member.studentId}
                  </span>
                )}
                {profile.designation && (
                  <span className="meta-item">
                    <Briefcase size={16} />
                    {profile.designation}
                  </span>
                )}
                {profile.member?.batch && (
                  <span className="meta-item">
                    <Users size={16} />
                    Batch {profile.member.batch}
                    {profile.member.academicYearLevel && ` • ${profile.member.academicYearLevel.replace('_', ' ')}`}
                  </span>
                )}
              </div>
              {profile.roles && profile.roles.length > 0 && (
                <div className="profile-roles">
                  {profile.roles.map((role, idx) => (
                    <span key={idx} className="role-badge">{role}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="profile-actions">
              {canMessage && (
                <button className="btn-primary" onClick={handleMessageClick}>
                  <MessageCircle size={18} />
                  Message
                </button>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="btn-secondary">
                  <Mail size={18} />
                  Email
                </a>
              )}
              {isOwnProfile && (
                <button 
                  className="btn-secondary" 
                  onClick={() => navigate('/dashboard/profile')}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section - Placeholder for future implementation */}
        <div className="profile-stats">
          <div className="stat-card">
            <Activity size={24} />
            <div className="stat-info">
              <span className="stat-value">0</span>
              <span className="stat-label">Posts</span>
            </div>
          </div>
          <div className="stat-card">
            <Calendar size={24} />
            <div className="stat-info">
              <span className="stat-value">0</span>
              <span className="stat-label">Events</span>
            </div>
          </div>
          <div className="stat-card">
            <Award size={24} />
            <div className="stat-info">
              <span className="stat-value">0</span>
              <span className="stat-label">Workshops</span>
            </div>
          </div>
          <div className="stat-card">
            <Users size={24} />
            <div className="stat-info">
              <span className="stat-value">0</span>
              <span className="stat-label">Meetings</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
          <button
            className={`tab-btn ${activeTab === 'experience' ? 'active' : ''}`}
            onClick={() => setActiveTab('experience')}
          >
            Experience
          </button>
          <button
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {activeTab === 'about' && (
            <div className="tab-content">
              {profile.bio && (
                <div className="content-section">
                  <h3>Bio</h3>
                  <p className="bio-text">{profile.bio}</p>
                </div>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <div className="content-section">
                  <h3>Interests</h3>
                  <div className="tags-list">
                    {profile.interests.map((interest, idx) => (
                      <span key={idx} className="tag">{interest}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.technicalSkills && profile.technicalSkills.length > 0 && (
                <div className="content-section">
                  <h3>Technical Skills</h3>
                  <div className="tags-list">
                    {profile.technicalSkills.map((skill, idx) => (
                      <span key={idx} className="tag skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="content-section">
                <h3>Member Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <Calendar size={20} />
                    <div>
                      <span className="info-label">Joined</span>
                      <span className="info-value">
                        {new Date(profile.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {profile.member?.currentYear && (
                    <div className="info-item">
                      <Shield size={20} />
                      <div>
                        <span className="info-label">Current Year</span>
                        <span className="info-value">{profile.member.currentYear}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="tab-content">
              {profile.member?.ecExperience && profile.member.ecExperience.length > 0 ? (
                <div className="content-section">
                  <h3>EC Experience</h3>
                  <div className="timeline">
                    {profile.member.ecExperience.map((exp, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-marker">
                          <Star size={16} />
                        </div>
                        <div className="timeline-content">
                          <h4>{exp.postName}</h4>
                          <p className="timeline-date">
                            {new Date(exp.startDate).toLocaleDateString()} - 
                            {exp.isCurrent || !exp.endDate ? ' Present' : ` ${new Date(exp.endDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <Award size={48} />
                  <p>No EC experience yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="tab-content">
              <div className="empty-state">
                <Activity size={48} />
                <p>Activity feed coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
