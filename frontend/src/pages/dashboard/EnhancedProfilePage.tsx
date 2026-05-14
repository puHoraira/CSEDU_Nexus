import { FormEvent, useEffect, useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError, type ApiUser } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";
import { Link } from "react-router-dom";

type ProfilePayload = {
  user: ApiUser & {
    fullNameBangla?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    socialMedia?: {
      facebook?: string;
      linkedin?: string;
      github?: string;
      twitter?: string;
    };
    technicalSkills?: string[];
    programmingLanguages?: string[];
    profileCompleteness?: number;
  };
  membership: {
    studentId: string;
    batch: number;
    currentYear: number;
    status: string;
    academicRecord?: {
      currentCgpa?: number;
    };
    attendanceRecord?: {
      overallAttendancePercentage?: number;
    };
    electionEligibility?: {
      isEligibleForVoting?: boolean;
      isEligibleForCandidacy?: boolean;
    };
  } | null;
  account: { isActive: boolean; joinedAt: string; updatedAt: string; profileCompleteness?: number };
};

export function EnhancedProfilePage() {
  const { token, user, setUserProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"basic" | "academic" | "skills" | "social">("basic");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    // Basic Info
    firstName: "",
    lastName: "",
    fullNameBangla: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    bio: "",
    
    // Academic (for member data)
    currentCgpa: "",
    attendancePercentage: "",
    
    // Skills
    technicalSkills: [] as string[],
    programmingLanguages: [] as string[],
    
    // Social Media
    facebook: "",
    linkedin: "",
    github: "",
    twitter: "",
  });

  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");

  const profileQuery = useQuery({
    queryKey: ["my-profile", token],
    queryFn: () => apiRequest<ProfilePayload>("/auth/me", { token }),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    const user = profileQuery.data.user;
    const member = profileQuery.data.membership;
    
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      fullNameBangla: user.fullNameBangla || "",
      phone: user.phone || "",
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : "",
      gender: user.gender || "",
      bloodGroup: user.bloodGroup || "",
      bio: user.bio || "",
      currentCgpa: member?.academicRecord?.currentCgpa?.toString() || "",
      attendancePercentage: member?.attendanceRecord?.overallAttendancePercentage?.toString() || "",
      technicalSkills: user.technicalSkills || [],
      programmingLanguages: user.programmingLanguages || [],
      facebook: user.socialMedia?.facebook || "",
      linkedin: user.socialMedia?.linkedin || "",
      github: user.socialMedia?.github || "",
      twitter: user.socialMedia?.twitter || "",
    });
    
    // Set image preview from database
    if (user.avatarUrl) {
      setImagePreview(user.avatarUrl);
    }
    
    // Clear any selected file when data loads
    setImageFile(null);
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      let avatarUrl = profileQuery.data?.user.avatarUrl || "";
      
      // Upload image if file selected
      if (imageFile) {
        const formData = new FormData();
        formData.append("avatar", imageFile);
        
        try {
          const uploadResponse = await apiRequest<{ url: string }>("/upload/avatar", {
            method: "POST",
            token,
            body: formData,
            isFormData: true,
          });
          
          avatarUrl = uploadResponse.url;
        } catch (error) {
          console.error("Image upload failed:", error);
          throw new Error("Failed to upload image. Please try again.");
        }
      }
      
      // Update profile with new avatar URL
      return apiRequest<ApiUser>("/auth/profile", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          fullNameBangla: form.fullNameBangla,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          bloodGroup: form.bloodGroup || undefined,
          bio: form.bio,
          avatarUrl, // Include the uploaded image URL
          technicalSkills: form.technicalSkills,
          programmingLanguages: form.programmingLanguages,
          socialMedia: {
            facebook: form.facebook,
            linkedin: form.linkedin,
            github: form.github,
            twitter: form.twitter,
          },
          memberData: {
            academicRecord: {
              currentCgpa: form.currentCgpa ? parseFloat(form.currentCgpa) : undefined,
            },
            attendanceRecord: {
              overallAttendancePercentage: form.attendancePercentage ? parseFloat(form.attendancePercentage) : undefined,
            },
          },
        }),
      });
    },
    onSuccess: (updatedUser) => {
      setUserProfile(updatedUser);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      profileQuery.refetch();
      setImageFile(null);
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image size must be less than 5MB" });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    updateMutation.mutate();
  }

  function addSkill() {
    if (skillInput.trim() && !form.technicalSkills.includes(skillInput.trim())) {
      setForm(prev => ({ ...prev, technicalSkills: [...prev.technicalSkills, skillInput.trim()] }));
      setSkillInput("");
    }
  }

  function removeSkill(skill: string) {
    setForm(prev => ({ ...prev, technicalSkills: prev.technicalSkills.filter(s => s !== skill) }));
  }

  function addLanguage() {
    if (langInput.trim() && !form.programmingLanguages.includes(langInput.trim())) {
      setForm(prev => ({ ...prev, programmingLanguages: [...prev.programmingLanguages, langInput.trim()] }));
      setLangInput("");
    }
  }

  function removeLanguage(lang: string) {
    setForm(prev => ({ ...prev, programmingLanguages: prev.programmingLanguages.filter(l => l !== lang) }));
  }

  const profileCompleteness = profileQuery.data?.user.profileCompleteness || 0;
  const isEligibleForEC = profileQuery.data?.membership?.electionEligibility?.isEligibleForCandidacy;
  const isEligibleForVoting = profileQuery.data?.membership?.electionEligibility?.isEligibleForVoting;
  
  // Check if user is a student (has membership)
  const isStudent = Boolean(profileQuery.data?.membership);

  return (
    <PageScreen title="My Profile" subtitle="Manage your personal information, academic records, and election eligibility.">
      {message && (
        <div className={message.type === "success" ? "success-message" : "alert"}>
          {message.text}
        </div>
      )}

      {profileQuery.isLoading && <div className="notice">Loading profile...</div>}

      <div className="profile-layout">
        {/* Left Sidebar - Profile Card */}
        <aside className="profile-sidebar">
          <div className="profile-card">
            <div className="profile-card__avatar-section">
              <div className="profile-avatar-large">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {form.firstName[0]}{form.lastName[0]}
                  </div>
                )}
              </div>
              <button 
                type="button" 
                className="secondary-button" 
                onClick={() => fileInputRef.current?.click()}
              >
                Change Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
              <small>Max 5MB • JPG, PNG, GIF</small>
            </div>

            <div className="profile-card__info">
              <h2>{profileQuery.data?.user.firstName} {profileQuery.data?.user.lastName}</h2>
              {form.fullNameBangla && <p className="text-muted">{form.fullNameBangla}</p>}
              <p className="text-muted">{profileQuery.data?.user.email}</p>
              
              <div className="profile-card__badges">
                <span className="chip">{profileQuery.data?.membership?.status || "Guest"}</span>
                {profileQuery.data?.user.roles?.map(role => (
                  <span key={role} className="chip chip-primary">{role}</span>
                ))}
              </div>

              <div className="profile-completeness">
                <div className="profile-completeness__header">
                  <span>Profile Completeness</span>
                  <strong>{profileCompleteness}%</strong>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-bar__fill" 
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
              </div>

              {profileQuery.data?.membership && (
                <div className="profile-card__stats">
                  <div className="stat-item">
                    <span className="stat-label">Student ID</span>
                    <span className="stat-value">{profileQuery.data.membership.studentId}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Batch</span>
                    <span className="stat-value">{profileQuery.data.membership.batch}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Year</span>
                    <span className="stat-value">{profileQuery.data.membership.currentYear}</span>
                  </div>
                </div>
              )}

              {/* Election Eligibility - Only show for students */}
              {isStudent && (
                <div className="profile-card__eligibility">
                  <h3>Election Eligibility</h3>
                  <div className="eligibility-status">
                    <div className={`eligibility-item ${isEligibleForVoting ? 'eligible' : 'not-eligible'}`}>
                      <span className="eligibility-icon">{isEligibleForVoting ? '✓' : '✗'}</span>
                      <span>Voting</span>
                    </div>
                    <div className={`eligibility-item ${isEligibleForEC ? 'eligible' : 'not-eligible'}`}>
                      <span className="eligibility-icon">{isEligibleForEC ? '✓' : '✗'}</span>
                      <span>EC Candidacy</span>
                    </div>
                  </div>
                  
                  {isEligibleForEC && (
                    <Link to="/dashboard/elections/apply" className="primary-button" style={{ marginTop: '1rem', width: '100%' }}>
                      Apply as Candidate
                    </Link>
                  )}
                  
                  {!isEligibleForEC && (
                    <div className="info" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                      Complete your CGPA and attendance to become eligible for EC candidacy.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content - Edit Form */}
        <main className="profile-main">
          <div className="profile-tabs">
            <button
              className={`profile-tab ${activeTab === "basic" ? "active" : ""}`}
              onClick={() => setActiveTab("basic")}
            >
              Basic Info
            </button>
            {isStudent && (
              <button
                className={`profile-tab ${activeTab === "academic" ? "active" : ""}`}
                onClick={() => setActiveTab("academic")}
              >
                Academic
              </button>
            )}
            <button
              className={`profile-tab ${activeTab === "skills" ? "active" : ""}`}
              onClick={() => setActiveTab("skills")}
            >
              Skills
            </button>
            <button
              className={`profile-tab ${activeTab === "social" ? "active" : ""}`}
              onClick={() => setActiveTab("social")}
            >
              Social Media
            </button>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            {activeTab === "basic" && (
              <div className="profile-form__section">
                <h3>Personal Information</h3>
                <div className="form-grid">
                  <label className="field">
                    <span>First Name *</span>
                    <input
                      value={form.firstName}
                      onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Last Name *</span>
                    <input
                      value={form.lastName}
                      onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Full Name (Bangla)</span>
                    <input
                      value={form.fullNameBangla}
                      onChange={(e) => setForm(prev => ({ ...prev, fullNameBangla: e.target.value }))}
                      placeholder="আপনার পুরো নাম"
                    />
                  </label>
                  <label className="field">
                    <span>Phone *</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+8801XXXXXXXXX"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Date of Birth</span>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Gender</span>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm(prev => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Blood Group</span>
                    <select
                      value={form.bloodGroup}
                      onChange={(e) => setForm(prev => ({ ...prev, bloodGroup: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </label>
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span>Bio</span>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell others about yourself..."
                      rows={4}
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "academic" && isStudent && (
              <div className="profile-form__section">
                <h3>Academic Performance</h3>
                <div className="info" style={{ marginBottom: '1rem' }}>
                  Complete your academic information to check your EC election eligibility.
                  <br />
                  <strong>EC Requirements:</strong> CGPA ≥ 3.0, Attendance ≥ 75%
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Current CGPA</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={form.currentCgpa}
                      onChange={(e) => setForm(prev => ({ ...prev, currentCgpa: e.target.value }))}
                      placeholder="3.50"
                    />
                    <small>Enter your current CGPA (0.00 - 4.00)</small>
                  </label>
                  <label className="field">
                    <span>Attendance Percentage</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.attendancePercentage}
                      onChange={(e) => setForm(prev => ({ ...prev, attendancePercentage: e.target.value }))}
                      placeholder="85.5"
                    />
                    <small>Enter your overall attendance (0 - 100%)</small>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "skills" && (
              <div className="profile-form__section">
                <h3>Technical Skills</h3>
                <div className="skills-input">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add a skill (e.g., React, Node.js)"
                  />
                  <button type="button" onClick={addSkill} className="secondary-button">
                    Add
                  </button>
                </div>
                <div className="skills-list">
                  {form.technicalSkills.map(skill => (
                    <span key={skill} className="skill-tag">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)}>×</button>
                    </span>
                  ))}
                </div>

                <h3 style={{ marginTop: '2rem' }}>Programming Languages</h3>
                <div className="skills-input">
                  <input
                    value={langInput}
                    onChange={(e) => setLangInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                    placeholder="Add a language (e.g., Python, JavaScript)"
                  />
                  <button type="button" onClick={addLanguage} className="secondary-button">
                    Add
                  </button>
                </div>
                <div className="skills-list">
                  {form.programmingLanguages.map(lang => (
                    <span key={lang} className="skill-tag">
                      {lang}
                      <button type="button" onClick={() => removeLanguage(lang)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "social" && (
              <div className="profile-form__section">
                <h3>Social Media Links</h3>
                <div className="form-grid">
                  <label className="field">
                    <span>Facebook</span>
                    <input
                      value={form.facebook}
                      onChange={(e) => setForm(prev => ({ ...prev, facebook: e.target.value }))}
                      placeholder="https://facebook.com/username"
                    />
                  </label>
                  <label className="field">
                    <span>LinkedIn</span>
                    <input
                      value={form.linkedin}
                      onChange={(e) => setForm(prev => ({ ...prev, linkedin: e.target.value }))}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </label>
                  <label className="field">
                    <span>GitHub</span>
                    <input
                      value={form.github}
                      onChange={(e) => setForm(prev => ({ ...prev, github: e.target.value }))}
                      placeholder="https://github.com/username"
                    />
                  </label>
                  <label className="field">
                    <span>Twitter</span>
                    <input
                      value={form.twitter}
                      onChange={(e) => setForm(prev => ({ ...prev, twitter: e.target.value }))}
                      placeholder="https://twitter.com/username"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </PageScreen>
  );
}
