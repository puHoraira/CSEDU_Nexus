import { FormEvent, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiRequest, normalizeApiError, type ApiUser } from "../../../lib/api";

type StudentProfileProps = {
  user: any;
  membership: any;
  token: string | null;
  onUpdate: () => void;
};

export function StudentProfile({ user, membership, token, onUpdate }: StudentProfileProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "academic" | "skills" | "social">("basic");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(user.avatarUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    fullNameBangla: user.fullNameBangla || "",
    phone: user.phone || "",
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : "",
    gender: user.gender || "",
    bloodGroup: user.bloodGroup || "",
    bio: user.bio || "",
    currentCgpa: membership?.academicRecord?.currentCgpa?.toString() || "",
    attendancePercentage: membership?.attendanceRecord?.overallAttendancePercentage?.toString() || "",
    technicalSkills: user.technicalSkills || [],
    programmingLanguages: user.programmingLanguages || [],
    facebook: user.socialMedia?.facebook || "",
    linkedin: user.socialMedia?.linkedin || "",
    github: user.socialMedia?.github || "",
    twitter: user.socialMedia?.twitter || "",
  });

  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      let avatarUrl = user.avatarUrl || "";
      
      if (imageFile) {
        const formData = new FormData();
        formData.append("avatar", imageFile);
        
        const uploadResponse = await apiRequest<{ url: string }>("/upload/avatar", {
          method: "POST",
          token,
          body: formData,
          isFormData: true,
        });
        
        avatarUrl = uploadResponse.url;
      }
      
      return apiRequest<ApiUser>("/auth/profile", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          ...form,
          avatarUrl,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          bloodGroup: form.bloodGroup || undefined,
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
    onSuccess: () => {
      setMessage({ type: "success", text: "Profile updated successfully!" });
      onUpdate();
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

  const isEligibleForEC = membership?.electionEligibility?.isEligibleForCandidacy;
  const isEligibleForVoting = membership?.electionEligibility?.isEligibleForVoting;

  return (
    <div className="profile-layout">
      {message && (
        <div className={message.type === "success" ? "success-message" : "alert"}>
          {message.text}
        </div>
      )}

      {/* Sidebar with student-specific info */}
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
          </div>

          <div className="profile-card__info">
            <h2>{user.firstName} {user.lastName}</h2>
            <p className="text-muted">{user.email}</p>
            
            <div className="profile-card__stats">
              <div className="stat-item">
                <span className="stat-label">Student ID</span>
                <span className="stat-value">{membership.studentId}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Batch</span>
                <span className="stat-value">{membership.batch}</span>
              </div>
            </div>

            {/* Election Eligibility */}
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
            </div>
          </div>
        </div>
      </aside>

      {/* Main form with all tabs including Academic */}
      <main className="profile-main">
        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === "basic" ? "active" : ""}`} onClick={() => setActiveTab("basic")}>
            Basic Info
          </button>
          <button className={`profile-tab ${activeTab === "academic" ? "active" : ""}`} onClick={() => setActiveTab("academic")}>
            Academic
          </button>
          <button className={`profile-tab ${activeTab === "skills" ? "active" : ""}`} onClick={() => setActiveTab("skills")}>
            Skills
          </button>
          <button className={`profile-tab ${activeTab === "social" ? "active" : ""}`} onClick={() => setActiveTab("social")}>
            Social Media
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {activeTab === "basic" && (
            <div className="profile-form__section">
              <h3>Personal Information</h3>
              {/* Basic form fields */}
            </div>
          )}

          {activeTab === "academic" && (
            <div className="profile-form__section">
              <h3>Academic Performance</h3>
              <div className="form-grid">
                <label className="field">
                  <span>Current CGPA</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.currentCgpa}
                    onChange={(e) => setForm(prev => ({ ...prev, currentCgpa: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Attendance %</span>
                  <input
                    type="number"
                    value={form.attendancePercentage}
                    onChange={(e) => setForm(prev => ({ ...prev, attendancePercentage: e.target.value }))}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Skills and Social tabs */}

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
