import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageScreen } from '../../components/ui/PageScreen';
import { apiRequest } from '../../lib/api';

interface ComprehensiveProfileData {
  // Personal Information
  fullNameBangla: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  religion: string;
  nationality: string;
  
  // Contact Information
  alternativePhone: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  
  // Address Information
  presentAddress: {
    division: string;
    district: string;
    upazila: string;
    union: string;
    village: string;
    postCode: string;
    fullAddress: string;
  };
  permanentAddress: {
    division: string;
    district: string;
    upazila: string;
    union: string;
    village: string;
    postCode: string;
    fullAddress: string;
    sameAsPresent: boolean;
  };
  
  // Academic Performance (Required for EC candidacy)
  academicRecord: {
    currentCgpa: number;
    totalCreditsCompleted: number;
    session: string;
  };
  attendanceRecord: {
    overallAttendancePercentage: number;
  };
  
  // Skills & Experience
  bio: string;
  personalStatement: string;
  technicalSkills: string[];
  softSkills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  tools: string[];
  
  // Social Media
  socialMedia: {
    facebook: string;
    linkedin: string;
    github: string;
    twitter: string;
    instagram: string;
    website: string;
  };
  
  // Leadership & Volunteer Experience
  leadershipExperience: Array<{
    organization: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
    isCurrent: boolean;
  }>;
  volunteerExperience: Array<{
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    hoursContributed: number;
  }>;
  
  // Achievements & Certifications
  achievements: Array<{
    title: string;
    description: string;
    date: string;
    category: string;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: string;
    expiryDate: string;
    credentialId: string;
    credentialUrl: string;
  }>;
  
  // Political Affiliation (Constitutional requirement)
  politicalAffiliation: {
    hasAffiliation: boolean;
    details: string;
  };
  
  // Privacy Settings
  privacySettings: {
    showEmail: boolean;
    showPhone: boolean;
    showAddress: boolean;
    showSocialMedia: boolean;
    allowDirectMessages: boolean;
    showInDirectory: boolean;
  };
}

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const [formData, setFormData] = useState<ComprehensiveProfileData>({
    // Personal Information
    fullNameBangla: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    gender: 'Prefer not to say',
    bloodGroup: 'Unknown',
    religion: '',
    nationality: 'Bangladeshi',
    
    // Contact Information
    alternativePhone: '',
    emergencyContact: {
      name: '',
      relation: '',
      phone: ''
    },
    
    // Address Information
    presentAddress: {
      division: '',
      district: '',
      upazila: '',
      union: '',
      village: '',
      postCode: '',
      fullAddress: ''
    },
    permanentAddress: {
      division: '',
      district: '',
      upazila: '',
      union: '',
      village: '',
      postCode: '',
      fullAddress: '',
      sameAsPresent: false
    },
    
    // Academic Performance
    academicRecord: {
      currentCgpa: 0,
      totalCreditsCompleted: 0,
      session: ''
    },
    attendanceRecord: {
      overallAttendancePercentage: 0
    },
    
    // Skills & Experience
    bio: '',
    personalStatement: '',
    technicalSkills: [],
    softSkills: [],
    programmingLanguages: [],
    frameworks: [],
    tools: [],
    
    // Social Media
    socialMedia: {
      facebook: '',
      linkedin: '',
      github: '',
      twitter: '',
      instagram: '',
      website: ''
    },
    
    // Experience
    leadershipExperience: [],
    volunteerExperience: [],
    
    // Achievements
    achievements: [],
    certifications: [],
    
    // Political Affiliation
    politicalAffiliation: {
      hasAffiliation: false,
      details: ''
    },
    
    // Privacy Settings
    privacySettings: {
      showEmail: false,
      showPhone: false,
      showAddress: false,
      showSocialMedia: true,
      allowDirectMessages: true,
      showInDirectory: true
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        const [parentKey, childKey] = keys;
        return {
          ...prev,
          [parentKey]: {
            ...(prev[parentKey as keyof ComprehensiveProfileData] as any),
            [childKey]: value
          }
        };
      }
      return prev;
    });
  };

  const handleArrayInputChange = (field: string, values: string[]) => {
    setFormData(prev => ({ ...prev, [field]: values }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Personal Information
        return formData.dateOfBirth !== '';
      case 2: // Address Information
        return formData.presentAddress.fullAddress !== '';
      case 3: // Academic Performance (Critical for EC eligibility)
        return formData.academicRecord.currentCgpa > 0 && 
               formData.attendanceRecord.overallAttendancePercentage > 0 &&
               formData.academicRecord.session !== '';
      case 4: // Skills & Experience
        return formData.bio !== '';
      case 5: // Political Affiliation Check
        if (formData.politicalAffiliation.hasAffiliation) {
          setError("Students with political party affiliation cannot participate in elections (Article VI)");
          return false;
        }
        return true;
      case 6: // Privacy Settings
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError(null);
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/profile');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="stack">
            <h3>Personal Information</h3>
            <p>Complete your personal details for election eligibility.</p>
            
            <div className="register-form__grid">
              <label className="field">
                <span>Full Name (Bengali)</span>
                <input
                  value={formData.fullNameBangla}
                  onChange={(e) => handleInputChange('fullNameBangla', e.target.value)}
                  placeholder="আপনার পূর্ণ নাম"
                />
              </label>
              
              <label className="field">
                <span>Date of Birth *</span>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  required
                />
              </label>
              
              <label className="field">
                <span>Father's Name</span>
                <input
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  placeholder="Father's name"
                />
              </label>
              
              <label className="field">
                <span>Mother's Name</span>
                <input
                  value={formData.motherName}
                  onChange={(e) => handleInputChange('motherName', e.target.value)}
                  placeholder="Mother's name"
                />
              </label>
              
              <label className="field">
                <span>Gender</span>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
              
              <label className="field">
                <span>Blood Group</span>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="stack">
            <h3>Address Information</h3>
            <p>Provide your current address details.</p>
            
            <label className="field">
              <span>Present Address *</span>
              <textarea
                value={formData.presentAddress.fullAddress}
                onChange={(e) => handleInputChange('presentAddress.fullAddress', e.target.value)}
                placeholder="House/Flat number, Road, Area, City, Postal Code"
                rows={3}
                required
              />
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.permanentAddress.sameAsPresent}
                onChange={(e) => {
                  handleInputChange('permanentAddress.sameAsPresent', e.target.checked);
                  if (e.target.checked) {
                    handleInputChange('permanentAddress.fullAddress', formData.presentAddress.fullAddress);
                  }
                }}
              />
              <span>Permanent address is same as present address</span>
            </label>
            
            {!formData.permanentAddress.sameAsPresent && (
              <label className="field">
                <span>Permanent Address</span>
                <textarea
                  value={formData.permanentAddress.fullAddress}
                  onChange={(e) => handleInputChange('permanentAddress.fullAddress', e.target.value)}
                  placeholder="House/Flat number, Road, Area, City, Postal Code"
                  rows={3}
                />
              </label>
            )}
          </div>
        );

      case 3:
        return (
          <div className="stack">
            <h3>Academic Performance</h3>
            <p><strong>Required for EC candidacy eligibility</strong></p>
            
            <div className="register-form__grid">
              <label className="field">
                <span>Session *</span>
                <input
                  value={formData.academicRecord.session}
                  onChange={(e) => handleInputChange('academicRecord.session', e.target.value)}
                  placeholder="2020-21"
                  required
                />
              </label>
              
              <label className="field">
                <span>Current CGPA *</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={formData.academicRecord.currentCgpa}
                  onChange={(e) => handleInputChange('academicRecord.currentCgpa', parseFloat(e.target.value))}
                  placeholder="3.50"
                  required
                />
              </label>
              
              <label className="field">
                <span>Overall Attendance (%) *</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.attendanceRecord.overallAttendancePercentage}
                  onChange={(e) => handleInputChange('attendanceRecord.overallAttendancePercentage', parseFloat(e.target.value))}
                  placeholder="85"
                  required
                />
              </label>
              
              <label className="field">
                <span>Credits Completed</span>
                <input
                  type="number"
                  min="0"
                  value={formData.academicRecord.totalCreditsCompleted}
                  onChange={(e) => handleInputChange('academicRecord.totalCreditsCompleted', parseInt(e.target.value))}
                  placeholder="120"
                />
              </label>
            </div>
            
            <div className="info">
              <strong>EC Eligibility Requirements:</strong>
              <ul>
                <li>CGPA ≥ 3.0</li>
                <li>Attendance ≥ 75%</li>
                <li>No active disciplinary actions</li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="stack">
            <h3>Skills & Experience</h3>
            <p>Showcase your abilities and background.</p>
            
            <label className="field">
              <span>Bio *</span>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                required
              />
            </label>
            
            <label className="field">
              <span>Personal Statement</span>
              <textarea
                value={formData.personalStatement}
                onChange={(e) => handleInputChange('personalStatement', e.target.value)}
                placeholder="Why do you want to participate in student leadership?"
                rows={4}
              />
            </label>
            
            <div className="register-form__grid">
              <label className="field">
                <span>Technical Skills</span>
                <input
                  value={formData.technicalSkills.join(', ')}
                  onChange={(e) => handleArrayInputChange('technicalSkills', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  placeholder="JavaScript, Python, React (comma separated)"
                />
              </label>
              
              <label className="field">
                <span>Programming Languages</span>
                <input
                  value={formData.programmingLanguages.join(', ')}
                  onChange={(e) => handleArrayInputChange('programmingLanguages', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  placeholder="JavaScript, Python, Java (comma separated)"
                />
              </label>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="stack">
            <h3>Constitutional Compliance</h3>
            <div className="info">
              <strong>Article VI Compliance:</strong> Students with political party affiliation cannot participate in elections.
            </div>
            
            <div className="stack" style={{ gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="politicalAffiliation"
                  checked={!formData.politicalAffiliation.hasAffiliation}
                  onChange={() => handleInputChange('politicalAffiliation.hasAffiliation', false)}
                />
                <span>I do not have any political party affiliation</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="politicalAffiliation"
                  checked={formData.politicalAffiliation.hasAffiliation}
                  onChange={() => handleInputChange('politicalAffiliation.hasAffiliation', true)}
                />
                <span>I have political party affiliation</span>
              </label>
            </div>
            
            {formData.politicalAffiliation.hasAffiliation && (
              <div className="alert">
                Unfortunately, students with political party affiliation cannot participate in elections as per Article VI of the Constitution.
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="stack">
            <h3>Privacy Settings</h3>
            <p>Control your profile visibility.</p>
            
            <div className="stack" style={{ gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Show email in member directory</span>
                <input
                  type="checkbox"
                  checked={formData.privacySettings.showEmail}
                  onChange={(e) => handleInputChange('privacySettings.showEmail', e.target.checked)}
                />
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Show phone number to other members</span>
                <input
                  type="checkbox"
                  checked={formData.privacySettings.showPhone}
                  onChange={(e) => handleInputChange('privacySettings.showPhone', e.target.checked)}
                />
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Show social media profiles</span>
                <input
                  type="checkbox"
                  checked={formData.privacySettings.showSocialMedia}
                  onChange={(e) => handleInputChange('privacySettings.showSocialMedia', e.target.checked)}
                />
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Allow direct messages from other members</span>
                <input
                  type="checkbox"
                  checked={formData.privacySettings.allowDirectMessages}
                  onChange={(e) => handleInputChange('privacySettings.allowDirectMessages', e.target.checked)}
                />
              </label>
            </div>
            
            <div className="info">
              <strong>Ready for Election Candidacy!</strong>
              <p>Once you complete this profile, you'll be eligible to apply for EC positions in upcoming elections.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (success) {
    return (
      <PageScreen title="Profile Completed!" subtitle="Your profile has been successfully updated for election eligibility.">
        <div className="card">
          <div className="stack">
            <h3>🎉 Profile Complete!</h3>
            <p>You are now eligible to participate in EC elections. You can apply for positions when elections are announced.</p>
            <button className="primary-button" onClick={() => navigate('/dashboard/profile')}>
              View Profile
            </button>
          </div>
        </div>
      </PageScreen>
    );
  }

  return (
    <PageScreen title="Complete Profile for Election Candidacy" subtitle="Fill out comprehensive information to become eligible for EC positions.">
      <div className="card">
        {/* Progress Bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Step {currentStep} of {totalSteps}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div style={{ width: '100%', height: 8, backgroundColor: 'var(--border)', borderRadius: 4 }}>
            <div 
              style={{ 
                width: `${(currentStep / totalSteps) * 100}%`, 
                height: '100%', 
                backgroundColor: 'var(--primary)', 
                borderRadius: 4,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div style={{ marginBottom: 24 }}>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="secondary-button"
          >
            Previous
          </button>

          {currentStep < totalSteps ? (
            <button onClick={handleNext} className="primary-button">
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="primary-button"
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          )}
        </div>

        {error && (
          <div className="alert" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}
      </div>
    </PageScreen>
  );
}