import { FormEvent, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, normalizeApiError, type ApiUser } from "../../../lib/api";

type StaffProfileProps = {
  user: any;
  token: string | null;
  onUpdate: () => void;
};

export function StaffProfile({ user, token, onUpdate }: StaffProfileProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "skills" | "social">("basic");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(user.avatarUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    phone: user.phone || "",
    bio: user.bio || "",
    designation: user.designation || "",
    experience: user.experience || "",
    technicalSkills: user.technicalSkills || [],
    programmingLanguages: user.programmingLanguages || [],
    facebook: user.socialMedia?.facebook || "",
    linkedin: user.socialMedia?.linkedin || "",
    github: user.socialMedia?.github || "",
    twitter: user.socialMedia?.twitter || "",
  });

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
          socialMedia: {
            facebook: form.facebook,
            linkedin: form.linkedin,
            github: form.github,
            twitter: form.twitter,
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

  return (
    <div className="profile-layout">
      {message && (
        <div className={message.type === "success" ? "success-message" : "alert"}>
          {message.text}
        </div>
      )}

      {/* Sidebar - No academic info */}
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
            
            {form.designation && (
              <div className="profile-card__badges">
                <span className="chip">{form.designation}</span>
              </div>
            )}

            <div className="profile-card__badges">
              {user.roles?.map((role: string) => (
                <span key={role} className="chip chip-primary">{role}</span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main form - NO Academic tab */}
      <main className="profile-main">
        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === "basic" ? "active" : ""}`} onClick={() => setActiveTab("basic")}>
            Basic Info
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
                  <span>Phone *</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Designation</span>
                  <input
                    value={form.designation}
                    onChange={(e) => setForm(prev => ({ ...prev, designation: e.target.value }))}
                  />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                  />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Experience</span>
                  <textarea
                    value={form.experience}
                    onChange={(e) => setForm(prev => ({ ...prev, experience: e.target.value }))}
                    rows={4}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Skills and Social tabs - same as student */}

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
